use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    db,
    domain::IngestInput,
    state::AppState,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a plain JSON error response with the given status code and message.
fn error_json(status: StatusCode, message: &str) -> Response {
    (status, Json(json!({ "error": message }))).into_response()
}

// ---------------------------------------------------------------------------
// POST /telemetry
// ---------------------------------------------------------------------------

/// Accept a telemetry measurement from an IoT sensor.
///
/// # Flow
/// 1. Validate that `height_cm` and `diameter_cm` are positive.
/// 2. Check the Redis idempotency store — return 200 immediately for duplicates.
/// 3. Enqueue the validated input to the background worker pool.
/// 4. Return 202 Accepted so the sensor can move on without blocking.
pub async fn ingest(
    State(state): State<Arc<AppState>>,
    Json(input): Json<IngestInput>,
) -> Response {
    // --- 1. Validate ---
    if input.height_cm <= 0.0 {
        return error_json(StatusCode::BAD_REQUEST, "height_cm must be positive");
    }
    if input.diameter_cm <= 0.0 {
        return error_json(StatusCode::BAD_REQUEST, "diameter_cm must be positive");
    }
    if input.idempotency_key.trim().is_empty() {
        return error_json(StatusCode::BAD_REQUEST, "idempotency_key must not be empty");
    }

    // --- 2. Idempotency check ---
    let is_new = {
        let mut store = state.idempotency.lock().await;
        store.check_and_set(&input.idempotency_key).await
    };

    match is_new {
        Ok(true) => {
            // First time seeing this key — fall through to enqueue.
        }
        Ok(false) => {
            // Duplicate event — return 200 so the sensor doesn't retry.
            return (
                StatusCode::OK,
                Json(json!({ "message": "duplicate event, already accepted" })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "redis idempotency check failed");
            return error_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                "idempotency check failed",
            );
        }
    }

    // --- 3. Enqueue to worker pool ---
    if let Err(e) = state.tx.send(input).await {
        // Channel is full or closed — very unlikely with buffer=100 but handle
        // it gracefully so the sensor can retry.
        tracing::error!(error = %e, "worker channel send failed");
        return error_json(StatusCode::SERVICE_UNAVAILABLE, "worker pool is full, try again");
    }

    // --- 4. Return 202 ---
    (
        StatusCode::ACCEPTED,
        Json(json!({ "message": "accepted" })),
    )
        .into_response()
}

// ---------------------------------------------------------------------------
// GET /trees/:id/measurements
// ---------------------------------------------------------------------------

/// Return all telemetry measurements for a given tree, ordered newest first.
pub async fn list_measurements(
    State(state): State<Arc<AppState>>,
    Path(tree_id): Path<Uuid>,
) -> Response {
    match db::list_by_tree(&state.pool, tree_id).await {
        Ok(events) => (StatusCode::OK, Json(events)).into_response(),
        Err(e) => {
            tracing::error!(error = %e, %tree_id, "failed to list measurements");
            error_json(StatusCode::INTERNAL_SERVER_ERROR, "failed to list measurements")
        }
    }
}
