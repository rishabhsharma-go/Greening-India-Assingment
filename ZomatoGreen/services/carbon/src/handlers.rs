use std::sync::Arc;

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

use crate::{
    db,
    domain::{compute_agb, compute_bgb, compute_co2e, CarbonAudit, TreeWithSpecies, UserContext},
    errors::{AppError, Result},
    hashing::compute_audit_hash,
    AppState,
};

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "ok", "service": "carbon" })))
}

/// Catch-all for unmatched routes.
pub async fn not_found() -> Response {
    (
        StatusCode::NOT_FOUND,
        Json(json!({ "error": "not found" })),
    )
        .into_response()
}

// ---------------------------------------------------------------------------
// GET /audits
// ---------------------------------------------------------------------------

/// Return all carbon audit records across all parcels, newest-first.
pub async fn list_audits(
    State(state): State<Arc<AppState>>,
    Extension(_ctx): Extension<UserContext>,
) -> Result<impl IntoResponse> {
    let audits = db::list_audits(&state.pool)
        .await
        .map_err(AppError::Internal)?;
    Ok(Json(audits))
}

// ---------------------------------------------------------------------------
// GET /audits/:id
// ---------------------------------------------------------------------------

/// Return a single carbon audit by its UUID.
pub async fn get_audit(
    State(state): State<Arc<AppState>>,
    Extension(_ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    let audit = db::get_audit(&state.pool, id)
        .await
        .map_err(AppError::Internal)?
        .ok_or(AppError::NotFound)?;
    Ok(Json(audit))
}

// ---------------------------------------------------------------------------
// GET /parcels/:id/carbon-report
// ---------------------------------------------------------------------------

/// On-demand carbon computation for a land parcel.
///
/// 1. Fetch all alive trees for the parcel with their allometric data.
/// 2. Compute AGB, BGB, and CO2e totals.
/// 3. Retrieve the previous audit hash for hash-chaining.
/// 4. Persist and return the new [`CarbonAudit`] record.
pub async fn carbon_report(
    State(state): State<Arc<AppState>>,
    Extension(_ctx): Extension<UserContext>,
    Path(parcel_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // 1. Alive trees with allometric coefficients.
    let trees: Vec<TreeWithSpecies> = db::list_alive_trees_for_parcel(&state.pool, parcel_id)
        .await
        .map_err(AppError::Internal)?;

    // 2. Aggregate biomass / CO2e totals.
    let (total_agb, total_bgb, total_co2e) = aggregate_totals(&trees);
    let tree_count = trees.len() as i32;

    // 3. Hash chaining.
    let prev_hash = db::get_latest_hash(&state.pool, parcel_id)
        .await
        .unwrap_or_default();

    let now = Utc::now();
    let hash = compute_audit_hash(
        &parcel_id,
        total_co2e,
        total_agb,
        total_bgb,
        tree_count,
        &now,
        &prev_hash,
    );

    // 4. Persist the audit record.
    let audit = CarbonAudit {
        id: Uuid::new_v4(),
        parcel_id,
        co2e_kg: total_co2e,
        agb_kg: total_agb,
        bgb_kg: total_bgb,
        tree_count,
        computed_at: now,
        hash,
        prev_hash,
    };

    let saved = db::create_audit(&state.pool, &audit)
        .await
        .map_err(AppError::Internal)?;

    tracing::info!(
        parcel_id  = %parcel_id,
        tree_count = tree_count,
        co2e_kg    = %format!("{:.2}", total_co2e),
        "On-demand carbon report created"
    );

    Ok((StatusCode::CREATED, Json(saved)))
}

// ---------------------------------------------------------------------------
// GET /parcels/:id/audits
// ---------------------------------------------------------------------------

/// Return the full audit history for a single parcel, newest-first.
pub async fn list_parcel_audits(
    State(state): State<Arc<AppState>>,
    Extension(_ctx): Extension<UserContext>,
    Path(parcel_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    let audits = db::list_audits_by_parcel(&state.pool, parcel_id)
        .await
        .map_err(AppError::Internal)?;
    Ok(Json(audits))
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

fn aggregate_totals(trees: &[TreeWithSpecies]) -> (f64, f64, f64) {
    let total_agb: f64 = trees
        .iter()
        .map(|t| {
            compute_agb(
                t.diameter_cm,
                t.agb_coefficient_a,
                t.agb_coefficient_b,
                t.wood_density_rho,
            )
        })
        .sum();

    let total_bgb = compute_bgb(total_agb);
    let total_co2e = compute_co2e(total_agb, total_bgb);

    (total_agb, total_bgb, total_co2e)
}
