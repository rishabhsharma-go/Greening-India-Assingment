/// Shared application state passed to every axum handler via `State<Arc<AppState>>`.
#[derive(Clone)]
pub struct AppState {
    /// PostgreSQL connection pool.
    pub pool: sqlx::PgPool,
    /// Secret key used to sign and verify JWTs.
    pub jwt_secret: String,
    /// Shared HTTP client for proxying requests to upstream services.
    pub client: reqwest::Client,
    /// Base URL of the Management microservice.
    pub management_url: String,
}
