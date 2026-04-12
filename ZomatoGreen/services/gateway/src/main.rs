mod auth;
mod domain;
mod errors;
mod handlers;
mod middleware;
mod proxy;
mod state;

use std::{net::SocketAddr, sync::Arc};

use axum::{
    middleware as axum_middleware,
    routing::{delete, get, patch, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // -------------------------------------------------------------------------
    // 1. Load .env (best-effort; ignore missing file in production)
    // -------------------------------------------------------------------------
    let _ = dotenvy::dotenv();

    // -------------------------------------------------------------------------
    // 2. Initialise tracing
    // -------------------------------------------------------------------------
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // -------------------------------------------------------------------------
    // 3. Read environment variables
    // -------------------------------------------------------------------------
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set");

    let port: u16 = std::env::var("GATEWAY_PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse()
        .expect("GATEWAY_PORT must be a valid port number");

    let management_url = std::env::var("MANAGEMENT_SERVICE_URL")
        .unwrap_or_else(|_| "http://management:8001".to_string());

    let geospatial_url = std::env::var("GEOSPATIAL_SERVICE_URL")
        .unwrap_or_else(|_| "http://geospatial:8002".to_string());

    let telemetry_url = std::env::var("TELEMETRY_SERVICE_URL")
        .unwrap_or_else(|_| "http://telemetry:8003".to_string());

    let carbon_url = std::env::var("CARBON_SERVICE_URL")
        .unwrap_or_else(|_| "http://carbon:8004".to_string());

    // -------------------------------------------------------------------------
    // 4. Connect to PostgreSQL
    // -------------------------------------------------------------------------
    tracing::info!("connecting to database…");
    let pool = sqlx::PgPool::connect(&database_url).await?;

    // -------------------------------------------------------------------------
    // 5. Run migrations
    // -------------------------------------------------------------------------
    tracing::info!("running migrations…");
    sqlx::migrate!("../../migrations").run(&pool).await?;

    // -------------------------------------------------------------------------
    // 6. Build AppState
    // -------------------------------------------------------------------------
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let state = Arc::new(AppState {
        pool,
        jwt_secret,
        client,
        management_url,
        geospatial_url,
        telemetry_url,
        carbon_url,
    });

    // -------------------------------------------------------------------------
    // 10. Seed test user (done early so the DB is ready before we accept traffic)
    // -------------------------------------------------------------------------
    auth::seed_test_user(&state.pool, &state.jwt_secret).await?;

    // -------------------------------------------------------------------------
    // 7. Build axum Router
    // -------------------------------------------------------------------------

    // CORS layer — allow all origins and the methods/headers we need.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::ACCEPT,
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ]);

    // JWT auth middleware layer.
    let auth_layer = axum_middleware::from_fn_with_state(
        Arc::clone(&state),
        middleware::auth_middleware,
    );

    // Public routes (no auth required).
    let public_routes = Router::new()
        .route("/auth/register", post(handlers::register))
        .route("/auth/login", post(handlers::login));

    // Protected routes — each request must carry a valid JWT.
    let protected_routes = Router::new()
        .route("/auth/me", get(handlers::me))
        // Management proxy
        .route("/projects", post(proxy::management_handler))
        .route("/projects", get(proxy::management_handler))
        .route("/projects/*path", get(proxy::management_handler))
        .route("/projects/*path", post(proxy::management_handler))
        .route("/projects/*path", patch(proxy::management_handler))
        .route("/projects/*path", delete(proxy::management_handler))
        .route("/tasks", post(proxy::management_handler))
        .route("/tasks", get(proxy::management_handler))
        .route("/tasks/*path", get(proxy::management_handler))
        .route("/tasks/*path", post(proxy::management_handler))
        .route("/tasks/*path", patch(proxy::management_handler))
        .route("/tasks/*path", delete(proxy::management_handler))
        .route("/users", get(proxy::management_handler))
        .route("/users/*path", get(proxy::management_handler))
        .route("/users/*path", patch(proxy::management_handler))
        .route("/users/*path", delete(proxy::management_handler))
        // Geospatial proxy
        .route("/parcels", post(proxy::geospatial_handler))
        .route("/parcels", get(proxy::geospatial_handler))
        .route("/parcels/*path", get(proxy::geospatial_handler))
        .route("/parcels/*path", post(proxy::geospatial_handler))
        .route("/parcels/*path", patch(proxy::geospatial_handler))
        .route("/parcels/*path", delete(proxy::geospatial_handler))
        .route("/trees", post(proxy::geospatial_handler))
        .route("/trees", get(proxy::geospatial_handler))
        .route("/trees/*path", get(proxy::geospatial_handler))
        .route("/trees/*path", post(proxy::geospatial_handler))
        .route("/trees/*path", patch(proxy::geospatial_handler))
        .route("/trees/*path", delete(proxy::geospatial_handler))
        // Telemetry proxy
        .route("/telemetry", post(proxy::telemetry_handler))
        .route("/telemetry", get(proxy::telemetry_handler))
        .route("/telemetry/*path", get(proxy::telemetry_handler))
        .route("/telemetry/*path", post(proxy::telemetry_handler))
        .route("/telemetry/*path", patch(proxy::telemetry_handler))
        .route("/telemetry/*path", delete(proxy::telemetry_handler))
        // Carbon / audit proxy
        .route("/audits", post(proxy::carbon_handler))
        .route("/audits", get(proxy::carbon_handler))
        .route("/audits/*path", get(proxy::carbon_handler))
        .route("/audits/*path", post(proxy::carbon_handler))
        .route("/audits/*path", patch(proxy::carbon_handler))
        .route("/audits/*path", delete(proxy::carbon_handler))
        .layer(auth_layer);

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(Arc::clone(&state));

    // -------------------------------------------------------------------------
    // 8 & 9. Bind, listen and shut down gracefully on SIGINT/SIGTERM
    // -------------------------------------------------------------------------
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("gateway listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

/// Returns a Future that resolves when the process receives SIGINT or SIGTERM.
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
        _ = ctrl_c    => { tracing::info!("received SIGINT, shutting down") }
        _ = terminate => { tracing::info!("received SIGTERM, shutting down") }
    }
}
