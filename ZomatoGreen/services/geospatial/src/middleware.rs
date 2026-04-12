use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use uuid::Uuid;

use crate::domain::{UserContext, UserRole};

/// Axum middleware that reads the `X-User-ID` and `X-User-Role` headers
/// injected by the API gateway and inserts a [`UserContext`] extension into
/// every request.  If either header is missing or unparseable the request is
/// rejected with 401 Unauthorized.
pub async fn auth_middleware(mut req: Request, next: Next) -> Response {
    // -- X-User-ID ----------------------------------------------------------
    let user_id = match req
        .headers()
        .get("X-User-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(id) => id,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({ "error": "missing or invalid X-User-ID header" })),
            )
                .into_response();
        }
    };

    // -- X-User-Role --------------------------------------------------------
    let role = match req
        .headers()
        .get("X-User-Role")
        .and_then(|v| v.to_str().ok())
    {
        Some("admin")        => UserRole::Admin,
        Some("manager")      => UserRole::Manager,
        Some("field_worker") => UserRole::FieldWorker,
        _ => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({ "error": "missing or invalid X-User-Role header" })),
            )
                .into_response();
        }
    };

    req.extensions_mut().insert(UserContext { user_id, role });
    next.run(req).await
}
