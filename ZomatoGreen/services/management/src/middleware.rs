use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use uuid::Uuid;

use crate::domain::{UserContext, UserRole};

/// Parse a role string coming from the X-User-Role gateway header.
fn parse_role(s: &str) -> Option<UserRole> {
    match s {
        "admin" => Some(UserRole::Admin),
        "manager" => Some(UserRole::Manager),
        "field_worker" => Some(UserRole::FieldWorker),
        _ => None,
    }
}

/// Middleware that reads X-User-ID and X-User-Role headers injected by the
/// reverse-proxy gateway and inserts a [`UserContext`] into the request
/// extensions.  Returns 401 if either header is missing or malformed.
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
        .and_then(parse_role);

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
