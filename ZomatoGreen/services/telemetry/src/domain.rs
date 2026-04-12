use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Health classification reported by the IoT sensor alongside measurements.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "measurement_health", rename_all = "snake_case")]
pub enum MeasurementHealth {
    Healthy,
    Stressed,
    Diseased,
    Dead,
}

/// A persisted telemetry measurement row.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TelemetryEvent {
    pub id: Uuid,
    pub tree_id: Uuid,
    pub event_timestamp: DateTime<Utc>,
    pub height_cm: f64,
    pub diameter_cm: f64,
    pub health_status: MeasurementHealth,
    pub idempotency_key: String,
    pub created_at: DateTime<Utc>,
}

/// JSON body expected on `POST /telemetry`.
#[derive(Debug, Clone, Deserialize)]
pub struct IngestInput {
    pub tree_id: Uuid,
    pub event_timestamp: DateTime<Utc>,
    pub height_cm: f64,
    pub diameter_cm: f64,
    pub health_status: MeasurementHealth,
    pub idempotency_key: String,
}

/// User identity forwarded by the gateway via `X-User-ID` / `X-User-Role`
/// headers and inserted into request extensions by the auth middleware.
#[derive(Debug, Clone)]
pub struct UserContext {
    pub user_id: Uuid,
    pub role: String,
}
