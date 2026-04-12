use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Allometric biomass equations
// ---------------------------------------------------------------------------
//
//  AGB (kg) = a * D^b * ρ         (D = diameter_cm, a/b from species table)
//  BGB (kg) = AGB * 0.26          (root-to-shoot ratio, IPCC default)
//  CO2e (kg) = (AGB + BGB) * 0.47 * 3.67
//               ↑ carbon fraction   ↑ C-to-CO2 molecular weight ratio

/// Above-ground biomass in kg.
pub fn compute_agb(diameter_cm: f64, a: f64, b: f64, rho: f64) -> f64 {
    a * diameter_cm.powf(b) * rho
}

/// Below-ground biomass in kg (IPCC default root-to-shoot = 0.26).
pub fn compute_bgb(agb: f64) -> f64 {
    agb * 0.26
}

/// CO2-equivalent in kg from AGB + BGB.
pub fn compute_co2e(agb: f64, bgb: f64) -> f64 {
    (agb + bgb) * 0.47 * 3.67
}

// ---------------------------------------------------------------------------
// Enums matching PostgreSQL custom types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "tree_health", rename_all = "snake_case")]
pub enum TreeHealth {
    Alive,
    Dead,
    Damaged,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "measurement_health", rename_all = "snake_case")]
pub enum MeasurementHealth {
    Healthy,
    Stressed,
    Diseased,
    Dead,
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

/// Tree row joined with its species allometric coefficients, used for
/// computing per-parcel carbon totals.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TreeWithSpecies {
    pub id: Uuid,
    pub parcel_id: Uuid,
    /// Latest measured diameter, or 10.0 cm default when no telemetry exists.
    pub diameter_cm: f64,
    pub wood_density_rho: f64,
    pub agb_coefficient_a: f64,
    pub agb_coefficient_b: f64,
}

/// Persisted carbon audit row.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CarbonAudit {
    pub id: Uuid,
    pub parcel_id: Uuid,
    pub co2e_kg: f64,
    pub agb_kg: f64,
    pub bgb_kg: f64,
    pub tree_count: i32,
    pub computed_at: DateTime<Utc>,
    /// SHA-256 hex digest of this record (CHAR 64).
    pub hash: String,
    /// SHA-256 hex digest of the previous record in the chain (empty string
    /// for the first record in a parcel's chain).
    pub prev_hash: String,
}

// ---------------------------------------------------------------------------
// Kafka message type
// ---------------------------------------------------------------------------

/// JSON body published by the telemetry service onto `telemetry.events`.
#[derive(Debug, Clone, Deserialize)]
pub struct TelemetryEventMsg {
    pub id: Uuid,
    pub tree_id: Uuid,
    pub event_timestamp: DateTime<Utc>,
    pub height_cm: f64,
    pub diameter_cm: f64,
    pub health_status: MeasurementHealth,
    pub idempotency_key: String,
}

// ---------------------------------------------------------------------------
// Request-scoped user identity (populated by auth middleware)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct UserContext {
    pub user_id: Uuid,
    pub role: String,
}
