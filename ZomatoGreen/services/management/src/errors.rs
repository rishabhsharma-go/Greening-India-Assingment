use std::collections::HashMap;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found")]
    NotFound,

    #[error("forbidden")]
    Forbidden,

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("validation failed")]
    Validation(HashMap<&'static str, &'static str>),

    #[error("unauthorized")]
    #[allow(dead_code)]
    Unauthorized,

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::Validation(fields) => (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "validation failed", "fields": fields })),
            )
                .into_response(),
            other => {
                let (status, message) = match &other {
                    AppError::NotFound => (StatusCode::NOT_FOUND, other.to_string()),
                    AppError::Forbidden => (StatusCode::FORBIDDEN, other.to_string()),
                    AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
                    AppError::Unauthorized => (StatusCode::UNAUTHORIZED, other.to_string()),
                    AppError::Database(e) => {
                        tracing::error!("database error: {:?}", e);
                        (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".to_string())
                    }
                    AppError::Internal(e) => {
                        tracing::error!("internal error: {:?}", e);
                        (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".to_string())
                    }
                    AppError::Validation(_) => unreachable!(),
                };
                (status, Json(json!({ "error": message }))).into_response()
            }
        }
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
