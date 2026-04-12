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

/// Middleware that reads the `X-User-ID` and `X-User-Role` headers injected
/// by the reverse-proxy gateway and inserts a [`UserContext`] extension into
/// the request.
///
/// Returns `401 Unauthorized` if either header is absent or malformed so that
/// downstream handlers can assume the extension is always present.
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
        (Some(user_id), Some(role)) if !role.is_empty() => {
            req.extensions_mut().insert(UserContext { user_id, role });
            next.run(req).await
        }
        _ => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "unauthorized: missing or malformed X-User-ID / X-User-Role headers" })),
        )
            .into_response(),
    }
}
