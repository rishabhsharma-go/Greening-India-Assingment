use std::sync::Arc;

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    auth,
    domain::{Claims, LoginInput, RegisterInput, UserPublic},
    errors::AppError,
    state::AppState,
};

/// POST /auth/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(input): Json<RegisterInput>,
) -> Result<impl IntoResponse, AppError> {
    let mut fields = std::collections::HashMap::new();
    if input.name.trim().is_empty() {
        fields.insert("name", "is required");
    }
    if input.email.trim().is_empty() {
        fields.insert("email", "is required");
    }
    if input.password.len() < 6 {
        fields.insert("password", "must be at least 6 characters");
    }
    if !fields.is_empty() {
        return Err(AppError::Validation(fields));
    }

    let response = auth::register(&state.pool, &state.jwt_secret, input).await?;
    Ok((StatusCode::CREATED, Json(response)))
}

/// POST /auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(input): Json<LoginInput>,
) -> Result<impl IntoResponse, AppError> {
    let response = auth::login(&state.pool, &state.jwt_secret, input).await?;
    Ok((StatusCode::OK, Json(response)))
}

/// GET /auth/me  — requires JWT middleware
pub async fn me(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> Result<impl IntoResponse, AppError> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("malformed user id in token".to_string()))?;

    let user = auth::get_user(&state.pool, user_id).await?;
    let public: UserPublic = user.into();
    Ok((StatusCode::OK, Json(public)))
}
