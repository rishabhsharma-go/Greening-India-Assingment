use std::net::SocketAddr;

use axum::{
    middleware::from_fn,
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod db;
mod domain;
mod errors;
mod handlers;
mod middleware;

// ---------------------------------------------------------------------------
// Shared application state
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::PgPool,
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Load .env (ignore errors – the file may not exist in production).
    let _ = dotenvy::dotenv();

    // 2. Initialise structured tracing.
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 3. Read configuration from environment.
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let port: u16 = std::env::var("GEOSPATIAL_PORT")
        .unwrap_or_else(|_| "8002".to_string())
        .parse()
        .expect("GEOSPATIAL_PORT must be a valid port number");

    // 4. Connect to PostgreSQL / PostGIS.
    tracing::info!("connecting to database …");
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;
    tracing::info!("database connection pool ready");

    // 5. Build application state.
    let state = AppState { pool };

    // 6. Build the router.
    let app = build_router(state);

    // 7. Bind and serve.
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("geospatial service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Router construction (extracted for testability)
// ---------------------------------------------------------------------------

fn build_router(state: AppState) -> Router {
    // CORS – allow all origins (gateway enforces stricter rules).
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // All routes are authenticated via the auth middleware.
    let authenticated = Router::new()
        // ── Parcel routes ─────────────────────────────────────────────────
        .route(
            "/parcels",
            get(handlers::list_parcels).post(handlers::create_parcel),
        )
        .route(
            "/parcels/:id",
            get(handlers::get_parcel)
                .patch(handlers::update_parcel)
                .delete(handlers::delete_parcel),
        )
        .route("/parcels/:id/validate", post(handlers::validate_parcel))
        .route(
            "/parcels/:id/trees",
            get(handlers::list_trees).post(handlers::create_tree),
        )
        // ── Individual tree lookup (gateway routes /trees/* → geospatial) ─
        .route("/trees/:id", get(handlers::get_tree))
        // ── Species reference data ─────────────────────────────────────────
        .route("/species", get(handlers::list_species))
        // Apply authentication middleware to every route above.
        .layer(from_fn(middleware::auth_middleware))
        .with_state(state);

    Router::new().merge(authenticated).layer(cors)
}

// ---------------------------------------------------------------------------
// Graceful shutdown on SIGTERM / Ctrl-C
// ---------------------------------------------------------------------------

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl-C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c    => tracing::info!("received Ctrl-C, shutting down"),
        _ = terminate => tracing::info!("received SIGTERM, shutting down"),
    }
}
