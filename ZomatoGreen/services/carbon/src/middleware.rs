use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use uuid::Uuid;

use crate::domain::UserContext;

/// Axum middleware that reads the `X-User-ID` and `X-User-Role` headers
/// forwarded by the gateway and inserts a [`UserContext`] into the request
/// extensions.
///
/// Returns `401 Unauthorized` when either header is missing or the UUID is
/// malformed.  The role string is accepted as-is (validation is the
/// gateway's responsibility).
pub async fn auth_middleware(mut req: Request, next: Next) -> Response {
    let user_id = req
        .headers()
        .get("X-User-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok());

    let role = req
        .headers()
        .get("X-User-Role")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    match (user_id, role) {
        (Some(user_id), Some(role)) => {
            req.extensions_mut().insert(UserContext { user_id, role });
            next.run(req).await
        }
        _ => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "unauthorized" })),
        )
            .into_response(),
    }
}
