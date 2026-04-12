use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Enum types (mapped to PostgreSQL ENUMs)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "user_role", rename_all = "snake_case")]
pub enum UserRole {
    Admin,
    Manager,
    #[sqlx(rename = "field_worker")]
    FieldWorker,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "soil_type", rename_all = "snake_case")]
pub enum SoilType {
    Alluvial,
    Black,
    Red,
    Laterite,
    Arid,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "verification_status", rename_all = "snake_case")]
pub enum VerificationStatus {
    Pending,
    Approved,
    Flagged,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "tree_health", rename_all = "snake_case")]
pub enum TreeHealth {
    Alive,
    Dead,
    Damaged,
}

// ---------------------------------------------------------------------------
// Domain structs
// ---------------------------------------------------------------------------

/// A land parcel with PostGIS polygon serialised as GeoJSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandParcel {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub project_id: Option<Uuid>,
    /// Geometry column returned via ST_AsGeoJSON(polygon)::jsonb
    pub polygon_geojson: Value,
    pub soil_type: SoilType,
    pub asi_score: Option<f64>,
    pub verification_status: VerificationStatus,
    pub created_at: DateTime<Utc>,
}

/// A tree instance with PostGIS point serialised as GeoJSON.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TreeInstance {
    pub id: Uuid,
    pub parcel_id: Uuid,
    pub species_id: Uuid,
    /// Geometry column returned via ST_AsGeoJSON(gps_point)::jsonb
    pub gps_point_json: Value,
    pub planting_date: NaiveDate,
    pub status: TreeHealth,
    pub created_at: DateTime<Utc>,
}

/// Species / biomass parameters.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Species {
    pub id: Uuid,
    pub name: String,
    pub wood_density_rho: f64,
    pub agb_coefficient_a: f64,
    pub agb_coefficient_b: f64,
}

// ---------------------------------------------------------------------------
// Input DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct CreateParcelInput {
    /// GeoJSON Polygon or MultiPolygon geometry object.
    pub polygon: Value,
    pub soil_type: SoilType,
    pub project_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateParcelInput {
    pub soil_type: Option<SoilType>,
    pub project_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTreeInput {
    pub species_id: Uuid,
    /// GeoJSON Point geometry object.
    pub gps_point: Value,
    pub planting_date: NaiveDate,
    pub status: Option<TreeHealth>,
}

// ---------------------------------------------------------------------------
// User context extracted from gateway headers
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct UserContext {
    pub user_id: Uuid,
    pub role: UserRole,
}

// ---------------------------------------------------------------------------
// ASI (Agroforestry Suitability Index) score computation
// ---------------------------------------------------------------------------

/// Compute an ASI score (0–100) based on soil type and parcel area.
pub fn compute_asi_score(soil_type: &SoilType, area_hectares: f64) -> f64 {
    let base = match soil_type {
        SoilType::Alluvial => 80.0,
        SoilType::Black    => 70.0,
        SoilType::Red      => 60.0,
        SoilType::Laterite => 50.0,
        SoilType::Arid     => 30.0,
    };
    let area_bonus = (area_hectares * 2.0).min(20.0);
    (base + area_bonus).min(100.0)
}
