mod db;
mod domain;
mod errors;
mod handlers;
mod middleware;

use std::sync::Arc;

use axum::{
    middleware as axum_middleware,
    routing::{get, patch},
    Router,
};
use sqlx::PgPool;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// Shared application state injected into every handler via [`axum::extract::State`].
pub struct AppState {
    pub pool: PgPool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env (ignore error if the file is absent in production).
    let _ = dotenvy::dotenv();

    // Initialise structured tracing.
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env().add_directive("management=info".parse()?))
        .init();

    // Configuration from environment.
    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let port: u16 = std::env::var("MANAGEMENT_PORT")
        .unwrap_or_else(|_| "8001".to_string())
        .parse()
        .expect("MANAGEMENT_PORT must be a valid port number");

    // Connect to PostgreSQL.
    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    info!("Connected to database");

    let state = Arc::new(AppState { pool });

    // CORS: allow all origins (gateway is the public entry point).
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router.
    let app = Router::new()
        // Health check (no auth required).
        .route("/health", get(handlers::health))
        // Project routes.
        .route("/projects", get(handlers::list_projects).post(handlers::create_project))
        .route(
            "/projects/:id",
            get(handlers::get_project)
                .patch(handlers::update_project)
                .delete(handlers::delete_project),
        )
        .route("/projects/:id/stats", get(handlers::project_stats))
        // Task routes nested under projects.
        .route(
            "/projects/:id/tasks",
            get(handlers::list_tasks).post(handlers::create_task),
        )
        // Task routes at the top level (update / delete by task ID).
        .route(
            "/tasks/:id",
            patch(handlers::update_task).delete(handlers::delete_task),
        )
        // Users.
        .route("/users", get(handlers::list_users))
        // Apply auth middleware to all routes.
        .layer(axum_middleware::from_fn(middleware::auth_middleware))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        // Fallback for unmatched routes.
        .fallback(handlers::not_found)
        .with_state(state);

    let addr = format!("0.0.0.0:{port}");
    let listener = TcpListener::bind(&addr).await?;
    info!("Management service listening on {addr}");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

/// Wait for SIGINT (Ctrl-C) or SIGTERM.
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
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("Shutdown signal received, shutting down gracefully");
}
