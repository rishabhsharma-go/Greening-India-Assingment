use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::{
    CreateParcelInput, CreateTreeInput, LandParcel, SoilType, Species, TreeHealth, TreeInstance,
    UpdateParcelInput, VerificationStatus,
};
use crate::errors::{AppError, Result};

// ---------------------------------------------------------------------------
// Helper row types for PostGIS geometry columns
// ---------------------------------------------------------------------------

/// Raw DB row for land_parcels.
/// The geometry column `polygon` is returned as jsonb via ST_AsGeoJSON().
#[derive(sqlx::FromRow)]
struct ParcelRow {
    id: Uuid,
    owner_id: Uuid,
    project_id: Option<Uuid>,
    polygon_geojson: Value,
    soil_type: SoilType,
    /// NUMERIC(5,2) maps to f64 via sqlx
    asi_score: Option<f64>,
    verification_status: VerificationStatus,
    created_at: DateTime<Utc>,
}

impl From<ParcelRow> for LandParcel {
    fn from(r: ParcelRow) -> Self {
        LandParcel {
            id: r.id,
            owner_id: r.owner_id,
            project_id: r.project_id,
            polygon_geojson: r.polygon_geojson,
            soil_type: r.soil_type,
            asi_score: r.asi_score,
            verification_status: r.verification_status,
            created_at: r.created_at,
        }
    }
}

/// Raw DB row for tree_instances.
#[derive(sqlx::FromRow)]
struct TreeRow {
    id: Uuid,
    parcel_id: Uuid,
    species_id: Uuid,
    gps_point_json: Value,
    planting_date: chrono::NaiveDate,
    status: TreeHealth,
    created_at: DateTime<Utc>,
}

impl From<TreeRow> for TreeInstance {
    fn from(r: TreeRow) -> Self {
        TreeInstance {
            id: r.id,
            parcel_id: r.parcel_id,
            species_id: r.species_id,
            gps_point_json: r.gps_point_json,
            planting_date: r.planting_date,
            status: r.status,
            created_at: r.created_at,
        }
    }
}

// ---------------------------------------------------------------------------
// Shared SELECT columns (geometry already cast to jsonb)
// ---------------------------------------------------------------------------

const PARCEL_SELECT: &str = r#"
    SELECT
        id,
        owner_id,
        project_id,
        ST_AsGeoJSON(polygon)::jsonb AS polygon_geojson,
        soil_type                    AS "soil_type: SoilType",
        asi_score,
        verification_status          AS "verification_status: VerificationStatus",
        created_at
    FROM land_parcels
"#;

const TREE_SELECT: &str = r#"
    SELECT
        id,
        parcel_id,
        species_id,
        ST_AsGeoJSON(gps_point)::jsonb AS gps_point_json,
        planting_date,
        status                         AS "status: TreeHealth",
        created_at
    FROM tree_instances
"#;

// ---------------------------------------------------------------------------
// Parcel CRUD
// ---------------------------------------------------------------------------

/// Insert a new land parcel for `owner_id`.
pub async fn create_parcel(
    pool: &PgPool,
    owner_id: Uuid,
    input: CreateParcelInput,
) -> Result<LandParcel> {
    let row = sqlx::query_as::<_, ParcelRow>(
        r#"
        INSERT INTO land_parcels (id, owner_id, project_id, polygon, soil_type)
        VALUES (
            uuid_generate_v4(),
            $1,
            $2,
            ST_Multi(ST_GeomFromGeoJSON($3::text)),
            $4
        )
        RETURNING
            id,
            owner_id,
            project_id,
            ST_AsGeoJSON(polygon)::jsonb   AS polygon_geojson,
            soil_type                      AS "soil_type: SoilType",
            asi_score,
            verification_status            AS "verification_status: VerificationStatus",
            created_at
        "#,
    )
    .bind(owner_id)
    .bind(input.project_id)
    .bind(input.polygon.to_string())
    .bind(input.soil_type as SoilType)
    .fetch_one(pool)
    .await?;

    Ok(row.into())
}

/// List parcels – admin sees all, everyone else only their own.
pub async fn list_parcels(
    pool: &PgPool,
    user_id: Uuid,
    is_admin: bool,
) -> Result<Vec<LandParcel>> {
    let rows = if is_admin {
        sqlx::query_as::<_, ParcelRow>(&format!(
            "{} ORDER BY created_at DESC",
            PARCEL_SELECT
        ))
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, ParcelRow>(&format!(
            "{} WHERE owner_id = $1 ORDER BY created_at DESC",
            PARCEL_SELECT
        ))
        .bind(user_id)
        .fetch_all(pool)
        .await?
    };

    Ok(rows.into_iter().map(Into::into).collect())
}

/// Fetch a single parcel by primary key.
pub async fn get_parcel(pool: &PgPool, id: Uuid) -> Result<Option<LandParcel>> {
    let row = sqlx::query_as::<_, ParcelRow>(&format!(
        "{} WHERE id = $1",
        PARCEL_SELECT
    ))
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(Into::into))
}

/// Patch soil_type and/or project_id on a parcel.
pub async fn update_parcel(
    pool: &PgPool,
    id: Uuid,
    input: UpdateParcelInput,
) -> Result<Option<LandParcel>> {
    // Both fields use COALESCE so we can send NULL to leave them unchanged.
    let row = sqlx::query_as::<_, ParcelRow>(
        r#"
        UPDATE land_parcels
        SET
            soil_type  = COALESCE($2, soil_type),
            project_id = COALESCE($3, project_id)
        WHERE id = $1
        RETURNING
            id,
            owner_id,
            project_id,
            ST_AsGeoJSON(polygon)::jsonb   AS polygon_geojson,
            soil_type                      AS "soil_type: SoilType",
            asi_score,
            verification_status            AS "verification_status: VerificationStatus",
            created_at
        "#,
    )
    .bind(id)
    .bind(input.soil_type)
    .bind(input.project_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(Into::into))
}

/// Hard-delete a parcel. Returns `true` if a row was deleted.
pub async fn delete_parcel(pool: &PgPool, id: Uuid) -> Result<bool> {
    let result = sqlx::query("DELETE FROM land_parcels WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}

/// Compute parcel area in hectares using PostGIS geography cast.
pub async fn get_area_hectares(pool: &PgPool, id: Uuid) -> Result<f64> {
    let row: Option<(f64,)> = sqlx::query_as(
        "SELECT ST_Area(polygon::geography) / 10000.0 AS area_ha \
         FROM land_parcels \
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    match row {
        Some((ha,)) => Ok(ha),
        None => Err(AppError::NotFound),
    }
}

/// Persist a computed ASI score and set verification_status = 'approved'.
pub async fn update_asi_and_status(
    pool: &PgPool,
    id: Uuid,
    asi: f64,
    status: VerificationStatus,
) -> Result<()> {
    sqlx::query(
        "UPDATE land_parcels \
         SET asi_score = $2, verification_status = $3 \
         WHERE id = $1",
    )
    .bind(id)
    .bind(asi)
    .bind(status)
    .execute(pool)
    .await?;

    Ok(())
}

/// Fetch the owner_id of a parcel (used for ownership checks).
pub async fn get_parcel_owner(pool: &PgPool, parcel_id: Uuid) -> Result<Uuid> {
    let row: (Uuid,) = sqlx::query_as("SELECT owner_id FROM land_parcels WHERE id = $1")
        .bind(parcel_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(row.0)
}

// ---------------------------------------------------------------------------
// Tree CRUD
// ---------------------------------------------------------------------------

/// Insert a tree instance within a parcel.
pub async fn create_tree(
    pool: &PgPool,
    parcel_id: Uuid,
    input: CreateTreeInput,
) -> Result<TreeInstance> {
    let status = input.status.unwrap_or(TreeHealth::Alive);

    let row = sqlx::query_as::<_, TreeRow>(
        r#"
        INSERT INTO tree_instances (id, parcel_id, species_id, gps_point, planting_date, status)
        VALUES (
            uuid_generate_v4(),
            $1,
            $2,
            ST_GeomFromGeoJSON($3::text),
            $4,
            $5
        )
        RETURNING
            id,
            parcel_id,
            species_id,
            ST_AsGeoJSON(gps_point)::jsonb AS gps_point_json,
            planting_date,
            status                         AS "status: TreeHealth",
            created_at
        "#,
    )
    .bind(parcel_id)
    .bind(input.species_id)
    .bind(input.gps_point.to_string())
    .bind(input.planting_date)
    .bind(status)
    .fetch_one(pool)
    .await?;

    Ok(row.into())
}

/// List all trees that belong to the given parcel.
pub async fn list_trees_by_parcel(
    pool: &PgPool,
    parcel_id: Uuid,
) -> Result<Vec<TreeInstance>> {
    let rows = sqlx::query_as::<_, TreeRow>(&format!(
        "{} WHERE parcel_id = $1 ORDER BY created_at DESC",
        TREE_SELECT
    ))
    .bind(parcel_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(Into::into).collect())
}

/// Fetch a single tree by its primary key.
pub async fn get_tree(pool: &PgPool, id: Uuid) -> Result<Option<TreeInstance>> {
    let row = sqlx::query_as::<_, TreeRow>(&format!(
        "{} WHERE id = $1",
        TREE_SELECT
    ))
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(Into::into))
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

/// Return all species rows (small table, no pagination needed).
pub async fn list_species(pool: &PgPool) -> Result<Vec<Species>> {
    let rows = sqlx::query_as::<_, Species>(
        "SELECT id, name, \
                wood_density_rho::float8  AS wood_density_rho, \
                agb_coefficient_a::float8 AS agb_coefficient_a, \
                agb_coefficient_b::float8 AS agb_coefficient_b \
         FROM species \
         ORDER BY name",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}
