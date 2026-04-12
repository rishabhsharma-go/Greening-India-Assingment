mod db;
mod domain;
mod errors;
mod handlers;
mod hashing;
mod kafka_consumer;
mod middleware;

use std::sync::Arc;

use axum::{
    middleware as axum_middleware,
    routing::get,
    Router,
};
use sqlx::PgPool;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// Shared application state injected into every handler via
/// [`axum::extract::State`].
pub struct AppState {
    pub pool: PgPool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env – ignore error when file is absent (production containers
    // inject vars via the environment directly).
    let _ = dotenvy::dotenv();

    // Structured tracing to stdout.
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(
            EnvFilter::from_default_env()
                .add_directive("carbon=info".parse()?),
        )
        .init();

    // ---------------------------------------------------------------------------
    // Configuration from environment
    // ---------------------------------------------------------------------------
    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let port: u16 = std::env::var("CARBON_PORT")
        .unwrap_or_else(|_| "8004".to_string())
        .parse()
        .expect("CARBON_PORT must be a valid port number");

    let kafka_brokers = std::env::var("KAFKA_BROKERS")
        .unwrap_or_else(|_| "kafka:9092".to_string());

    let kafka_topic = std::env::var("KAFKA_TOPIC")
        .unwrap_or_else(|_| "telemetry.events".to_string());

    let kafka_group_id = std::env::var("KAFKA_GROUP_ID")
        .unwrap_or_else(|_| "carbon-service".to_string());

    // ---------------------------------------------------------------------------
    // Database
    // ---------------------------------------------------------------------------
    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    info!("Connected to database");

    // ---------------------------------------------------------------------------
    // Kafka consumer (background task)
    // ---------------------------------------------------------------------------
    let consumer_pool = pool.clone();
    tokio::spawn(async move {
        kafka_consumer::run_consumer(
            &kafka_brokers,
            &kafka_topic,
            &kafka_group_id,
            consumer_pool,
        )
        .await;
    });

    // ---------------------------------------------------------------------------
    // HTTP router
    // ---------------------------------------------------------------------------
    let state = Arc::new(AppState { pool });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Health check – no auth required.
        .route("/health", get(handlers::health))
        // Audit routes.
        .route("/audits",     get(handlers::list_audits))
        .route("/audits/:id", get(handlers::get_audit))
        // Parcel carbon routes.
        .route("/parcels/:id/carbon-report", get(handlers::carbon_report))
        .route("/parcels/:id/audits",        get(handlers::list_parcel_audits))
        // Apply auth middleware to all routes above.
        .layer(axum_middleware::from_fn(middleware::auth_middleware))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .fallback(handlers::not_found)
        .with_state(state);

    let addr = format!("0.0.0.0:{port}");
    let listener = TcpListener::bind(&addr).await?;
    info!("Carbon service listening on {addr}");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

/// Resolves on SIGINT (Ctrl-C) or SIGTERM, whichever arrives first.
async fn shutdown_signal() {
    use tokio::signal;

    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl-C handler");
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
        _ = ctrl_c    => {},
        _ = terminate => {},
    }

    info!("Shutdown signal received, shutting down gracefully");
}
