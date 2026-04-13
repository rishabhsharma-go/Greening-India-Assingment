use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::{auth::validate_token, state::AppState};

/// JWT authentication middleware.
///
/// Expects an `Authorization: Bearer <token>` header.
/// On success, inserts the decoded `Claims` into request extensions so that
/// downstream handlers can extract them with `Extension<Claims>`.
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Response {
    // Extract the raw Authorization header value.
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    let token = match auth_header {
        Some(h) if h.starts_with("Bearer ") => h["Bearer ".len()..].trim(),
        _ => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "missing or malformed Authorization header" })),
            )
                .into_response();
        }
    };

    match validate_token(token, &state.jwt_secret) {
        Ok(claims) => {
            req.extensions_mut().insert(claims);
            next.run(req).await
        }
        Err(e) => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": format!("invalid token: {e}") })),
        )
            .into_response(),
    }
}
