use std::collections::HashMap;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[allow(dead_code)]
#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error("unauthorized: {0}")]
    Unauthorized(String),

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("validation failed")]
    Validation(HashMap<&'static str, &'static str>),

    #[error("forbidden")]
    Forbidden,

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("internal error: {0}")]
    Internal(#[from] anyhow::Error),

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("jwt error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("bcrypt error: {0}")]
    Bcrypt(#[from] bcrypt::BcryptError),

    #[error("reqwest error: {0}")]
    Reqwest(#[from] reqwest::Error),

    #[error("proxy error: {0}")]
    Proxy(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        if let AppError::Validation(fields) = self {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "validation failed", "fields": fields })),
            )
                .into_response();
        }

        let (status, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Validation(_) => unreachable!(),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "forbidden".to_string()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            AppError::Database(sqlx::Error::RowNotFound) => {
                (StatusCode::NOT_FOUND, "record not found".to_string())
            }
            AppError::Database(e) => {
                // Detect unique-constraint violations (email already taken)
                let msg = e.to_string();
                if msg.contains("duplicate key") || msg.contains("unique constraint") {
                    (StatusCode::CONFLICT, "email already in use".to_string())
                } else {
                    tracing::error!("database error: {e}");
                    (StatusCode::INTERNAL_SERVER_ERROR, "database error".to_string())
                }
            }
            AppError::Jwt(e) => (StatusCode::UNAUTHORIZED, format!("invalid token: {e}")),
            AppError::Bcrypt(e) => {
                tracing::error!("bcrypt error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "hashing error".to_string())
            }
            AppError::Reqwest(e) => {
                tracing::error!("upstream request error: {e}");
                (StatusCode::BAD_GATEWAY, "upstream service unavailable".to_string())
            }
            AppError::Proxy(msg) => {
                tracing::error!("proxy error: {msg}");
                (StatusCode::BAD_GATEWAY, msg.clone())
            }
            AppError::Internal(e) => {
                tracing::error!("internal error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".to_string())
            }
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}
