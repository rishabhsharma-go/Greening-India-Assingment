mod db;
mod domain;
mod errors;
mod handlers;
mod kafka;
mod middleware;
mod redis_store;
mod state;

use std::{net::SocketAddr, sync::Arc};

use axum::{
    middleware as axum_middleware,
    routing::{get, post},
    Router,
};
use chrono::Utc;
use tokio::sync::{mpsc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use uuid::Uuid;

use domain::IngestInput;
use kafka::KafkaPublisher;
use redis_store::IdempotencyStore;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // -------------------------------------------------------------------------
    // 1. Load .env (best-effort; silently skip if file is absent in production)
    // -------------------------------------------------------------------------
    let _ = dotenvy::dotenv();

    // -------------------------------------------------------------------------
    // 2. Initialise structured tracing
    // -------------------------------------------------------------------------
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // -------------------------------------------------------------------------
    // 3. Read configuration from environment
    // -------------------------------------------------------------------------
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let port: u16 = std::env::var("TELEMETRY_PORT")
        .unwrap_or_else(|_| "8003".to_string())
        .parse()
        .expect("TELEMETRY_PORT must be a valid port number");

    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://redis:6379".to_string());

    let kafka_brokers =
        std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "kafka:9092".to_string());

    let kafka_topic =
        std::env::var("KAFKA_TOPIC").unwrap_or_else(|_| "telemetry.events".to_string());

    // -------------------------------------------------------------------------
    // 4. Connect to PostgreSQL
    // -------------------------------------------------------------------------
    tracing::info!("connecting to database...");
    let pool = sqlx::PgPool::connect(&database_url).await?;
    tracing::info!("database connection established");

    // -------------------------------------------------------------------------
    // 5. Create Kafka publisher
    // -------------------------------------------------------------------------
    tracing::info!(brokers = %kafka_brokers, topic = %kafka_topic, "creating kafka publisher");
    let kafka = Arc::new(KafkaPublisher::new(&kafka_brokers, &kafka_topic)?);

    // -------------------------------------------------------------------------
    // 6. Create Redis idempotency store (wrapped in Arc<Mutex>)
    // -------------------------------------------------------------------------
    tracing::info!(url = %redis_url, "connecting to redis");
    let idempotency_store = IdempotencyStore::new(&redis_url).await?;
    let idempotency = Arc::new(Mutex::new(idempotency_store));
    tracing::info!("redis connection established");

    // -------------------------------------------------------------------------
    // 7. Create the worker channel and spawn 4 background workers
    //
    //    Multiple workers share the *receiver* side via Arc<Mutex<Receiver>>.
    //    Each worker locks the mutex only long enough to pull the next item,
    //    then releases it before doing the slow DB+Kafka work.
    // -------------------------------------------------------------------------
    let (tx, rx) = mpsc::channel::<IngestInput>(100);
    let rx = Arc::new(Mutex::new(rx));

    for worker_id in 0..4_u8 {
        let pool_w = pool.clone();
        let kafka_w = Arc::clone(&kafka);
        let rx_w = Arc::clone(&rx);

        tokio::spawn(async move {
            tracing::info!(worker_id, "telemetry worker started");

            loop {
                // Lock only to dequeue; release before any I/O.
                let input: Option<IngestInput> = {
                    let mut locked = rx_w.lock().await;
                    locked.recv().await
                };

                match input {
                    None => {
                        // Channel closed — all senders have been dropped.
                        tracing::info!(worker_id, "channel closed, worker exiting");
                        break;
                    }
                    Some(input) => {
                        // Build the event struct.
                        let event = domain::TelemetryEvent {
                            id: Uuid::new_v4(),
                            tree_id: input.tree_id,
                            event_timestamp: input.event_timestamp,
                            height_cm: input.height_cm,
                            diameter_cm: input.diameter_cm,
                            health_status: input.health_status,
                            idempotency_key: input.idempotency_key.clone(),
                            created_at: Utc::now(),
                        };

                        // Persist to PostgreSQL.
                        let persisted = match db::create_event(&pool_w, &event).await {
                            Ok(e) => e,
                            Err(err) => {
                                tracing::error!(
                                    worker_id,
                                    error = %err,
                                    idempotency_key = %input.idempotency_key,
                                    "failed to persist telemetry event"
                                );
                                continue;
                            }
                        };

                        // Publish to Kafka.
                        if let Err(err) = kafka_w.publish(&persisted).await {
                            tracing::error!(
                                worker_id,
                                error = %err,
                                event_id = %persisted.id,
                                "failed to publish telemetry event to kafka"
                            );
                            // We intentionally continue — the row is already in
                            // the DB so we don't want to lose or retry it here.
                            // A separate reconciler/dead-letter queue can handle
                            // Kafka delivery failures.
                        } else {
                            tracing::debug!(
                                worker_id,
                                event_id = %persisted.id,
                                tree_id = %persisted.tree_id,
                                "event persisted and published"
                            );
                        }
                    }
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // 8. Build AppState
    // -------------------------------------------------------------------------
    let state = Arc::new(AppState {
        pool: pool.clone(),
        idempotency: Arc::clone(&idempotency),
        tx: tx.clone(),
        kafka: Arc::clone(&kafka),
    });

    // -------------------------------------------------------------------------
    // 9. Build axum Router
    // -------------------------------------------------------------------------

    // CORS — allow all origins so the frontend and other services can call us.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::ACCEPT,
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ]);

    // Auth middleware layer — validates X-User-ID / X-User-Role headers.
    let auth_layer = axum_middleware::from_fn(middleware::auth_middleware);

    let app = Router::new()
        .route("/telemetry", post(handlers::ingest))
        .route("/trees/{id}/measurements", get(handlers::list_measurements))
        .layer(auth_layer)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(Arc::clone(&state));

    // -------------------------------------------------------------------------
    // 10. Bind, serve, and shut down gracefully
    //
    //     On shutdown we drop `tx` so that workers see a closed channel and
    //     drain any remaining queued events before the process exits.
    // -------------------------------------------------------------------------
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!(%addr, "telemetry service listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    // Drop the sender so workers receive `None` and exit cleanly.
    drop(tx);

    tracing::info!("telemetry service stopped");
    Ok(())
}

/// Resolves when the process receives SIGINT (Ctrl-C) or SIGTERM.
async fn shutdown_signal() {
    use tokio::signal;

    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c    => { tracing::info!("received SIGINT, initiating graceful shutdown") }
        _ = terminate => { tracing::info!("received SIGTERM, initiating graceful shutdown") }
    }
}
