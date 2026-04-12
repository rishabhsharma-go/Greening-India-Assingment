use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::{CarbonAudit, TreeWithSpecies};

// ---------------------------------------------------------------------------
// Tree / parcel helpers
// ---------------------------------------------------------------------------

/// Return all alive trees in `parcel_id` together with their species
/// allometric coefficients.  The diameter used is the most recent telemetry
/// reading; if no reading exists yet, 10.0 cm is substituted.
pub async fn list_alive_trees_for_parcel(
    pool: &PgPool,
    parcel_id: Uuid,
) -> Result<Vec<TreeWithSpecies>> {
    let rows = sqlx::query_as::<_, TreeWithSpecies>(
        r#"
        SELECT
            ti.id,
            ti.parcel_id,
            CAST(
                COALESCE(
                    (
                        SELECT te.diameter_cm
                        FROM   telemetry_events te
                        WHERE  te.tree_id = ti.id
                        ORDER  BY te.event_timestamp DESC
                        LIMIT  1
                    ),
                    10.0
                ) AS FLOAT8
            ) AS diameter_cm,
            CAST(s.wood_density_rho  AS FLOAT8) AS wood_density_rho,
            CAST(s.agb_coefficient_a AS FLOAT8) AS agb_coefficient_a,
            CAST(s.agb_coefficient_b AS FLOAT8) AS agb_coefficient_b
        FROM  tree_instances ti
        JOIN  species         s  ON s.id = ti.species_id
        WHERE ti.parcel_id = $1
          AND ti.status = 'alive'
        "#,
    )
    .bind(parcel_id)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Return the `parcel_id` that owns a given tree, or `None` if the tree does
/// not exist.
pub async fn get_parcel_for_tree(pool: &PgPool, tree_id: Uuid) -> Result<Option<Uuid>> {
    let row: Option<(Uuid,)> =
        sqlx::query_as("SELECT parcel_id FROM tree_instances WHERE id = $1")
            .bind(tree_id)
            .fetch_optional(pool)
            .await?;

    Ok(row.map(|(id,)| id))
}

// ---------------------------------------------------------------------------
// Hash-chain helpers
// ---------------------------------------------------------------------------

/// Return the SHA-256 hex hash of the most recent audit for `parcel_id`, or
/// an empty `String` if no audit exists yet (genesis block sentinel).
pub async fn get_latest_hash(pool: &PgPool, parcel_id: Uuid) -> Result<String> {
    let row: Option<(String,)> = sqlx::query_as(
        r#"
        SELECT COALESCE(TRIM(hash), '')
        FROM   carbon_audits
        WHERE  parcel_id = $1
        ORDER  BY computed_at DESC
        LIMIT  1
        "#,
    )
    .bind(parcel_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|(h,)| h).unwrap_or_default())
}

// ---------------------------------------------------------------------------
// CRUD for carbon_audits
// ---------------------------------------------------------------------------

/// Persist a new audit record and return the full row (including the
/// database-generated `computed_at` timestamp).
pub async fn create_audit(pool: &PgPool, audit: &CarbonAudit) -> Result<CarbonAudit> {
    let row = sqlx::query_as::<_, CarbonAudit>(
        r#"
        INSERT INTO carbon_audits
            (id, parcel_id, co2e_kg, agb_kg, bgb_kg, tree_count, computed_at, hash, prev_hash)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
            id,
            parcel_id,
            CAST(co2e_kg  AS FLOAT8) AS co2e_kg,
            CAST(agb_kg   AS FLOAT8) AS agb_kg,
            CAST(bgb_kg   AS FLOAT8) AS bgb_kg,
            tree_count,
            computed_at,
            TRIM(hash)      AS hash,
            TRIM(prev_hash) AS prev_hash
        "#,
    )
    .bind(audit.id)
    .bind(audit.parcel_id)
    .bind(audit.co2e_kg)
    .bind(audit.agb_kg)
    .bind(audit.bgb_kg)
    .bind(audit.tree_count)
    .bind(audit.computed_at)
    .bind(&audit.hash)
    .bind(&audit.prev_hash)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// Return all audits ordered newest-first.
pub async fn list_audits(pool: &PgPool) -> Result<Vec<CarbonAudit>> {
    let rows = sqlx::query_as::<_, CarbonAudit>(
        r#"
        SELECT
            id,
            parcel_id,
            CAST(co2e_kg  AS FLOAT8) AS co2e_kg,
            CAST(agb_kg   AS FLOAT8) AS agb_kg,
            CAST(bgb_kg   AS FLOAT8) AS bgb_kg,
            tree_count,
            computed_at,
            TRIM(hash)      AS hash,
            TRIM(prev_hash) AS prev_hash
        FROM  carbon_audits
        ORDER BY computed_at DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Return a single audit by primary key, or `None`.
pub async fn get_audit(pool: &PgPool, id: Uuid) -> Result<Option<CarbonAudit>> {
    let row = sqlx::query_as::<_, CarbonAudit>(
        r#"
        SELECT
            id,
            parcel_id,
            CAST(co2e_kg  AS FLOAT8) AS co2e_kg,
            CAST(agb_kg   AS FLOAT8) AS agb_kg,
            CAST(bgb_kg   AS FLOAT8) AS bgb_kg,
            tree_count,
            computed_at,
            TRIM(hash)      AS hash,
            TRIM(prev_hash) AS prev_hash
        FROM  carbon_audits
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Return all audits for a parcel, newest-first.
pub async fn list_audits_by_parcel(pool: &PgPool, parcel_id: Uuid) -> Result<Vec<CarbonAudit>> {
    let rows = sqlx::query_as::<_, CarbonAudit>(
        r#"
        SELECT
            id,
            parcel_id,
            CAST(co2e_kg  AS FLOAT8) AS co2e_kg,
            CAST(agb_kg   AS FLOAT8) AS agb_kg,
            CAST(bgb_kg   AS FLOAT8) AS bgb_kg,
            tree_count,
            computed_at,
            TRIM(hash)      AS hash,
            TRIM(prev_hash) AS prev_hash
        FROM  carbon_audits
        WHERE parcel_id = $1
        ORDER BY computed_at DESC
        "#,
    )
    .bind(parcel_id)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}
