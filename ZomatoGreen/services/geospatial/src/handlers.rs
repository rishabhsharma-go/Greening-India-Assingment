use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    db,
    domain::{
        compute_asi_score, CreateParcelInput, CreateTreeInput, UpdateParcelInput, UserContext,
        UserRole, VerificationStatus,
    },
    errors::{AppError, Result},
    AppState,
};

// ---------------------------------------------------------------------------
// Parcels
// ---------------------------------------------------------------------------

/// GET /parcels
/// Admin sees all parcels; other roles see only their own.
pub async fn list_parcels(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
) -> Result<Json<serde_json::Value>> {
    let is_admin = ctx.role == UserRole::Admin;
    let parcels = db::list_parcels(&state.pool, ctx.user_id, is_admin).await?;
    Ok(Json(serde_json::json!(parcels)))
}

/// POST /parcels
pub async fn create_parcel(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
    Json(input): Json<CreateParcelInput>,
) -> Result<(StatusCode, Json<serde_json::Value>)> {
    let parcel = db::create_parcel(&state.pool, ctx.user_id, input).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!(parcel))))
}

/// GET /parcels/:id
pub async fn get_parcel(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let parcel = db::get_parcel(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;

    // Non-admins may only view their own parcels.
    if ctx.role != UserRole::Admin && parcel.owner_id != ctx.user_id {
        return Err(AppError::Forbidden);
    }

    Ok(Json(serde_json::json!(parcel)))
}

/// PATCH /parcels/:id
pub async fn update_parcel(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateParcelInput>,
) -> Result<Json<serde_json::Value>> {
    // Ownership check.
    let owner_id = db::get_parcel_owner(&state.pool, id).await?;
    if ctx.role != UserRole::Admin && owner_id != ctx.user_id {
        return Err(AppError::Forbidden);
    }

    let parcel = db::update_parcel(&state.pool, id, input)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(serde_json::json!(parcel)))
}

/// DELETE /parcels/:id
pub async fn delete_parcel(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode> {
    // Ownership check.
    let owner_id = db::get_parcel_owner(&state.pool, id).await?;
    if ctx.role != UserRole::Admin && owner_id != ctx.user_id {
        return Err(AppError::Forbidden);
    }

    let deleted = db::delete_parcel(&state.pool, id).await?;
    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}

/// POST /parcels/:id/validate
/// Computes the ASI score from area + soil type then marks the parcel approved.
pub async fn validate_parcel(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    // Only admin or manager may trigger validation.
    if ctx.role == UserRole::FieldWorker {
        return Err(AppError::Forbidden);
    }

    // Ensure parcel exists and caller has access.
    let parcel = db::get_parcel(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;

    if ctx.role != UserRole::Admin && parcel.owner_id != ctx.user_id {
        return Err(AppError::Forbidden);
    }

    // Compute area and derive ASI score.
    let area_ha = db::get_area_hectares(&state.pool, id).await?;
    let asi = compute_asi_score(&parcel.soil_type, area_ha);

    db::update_asi_and_status(&state.pool, id, asi, VerificationStatus::Approved).await?;

    // Return updated parcel.
    let updated = db::get_parcel(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(serde_json::json!(updated)))
}

// ---------------------------------------------------------------------------
// Trees
// ---------------------------------------------------------------------------

/// GET /parcels/:id/trees
pub async fn list_trees(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
    Path(parcel_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    // Ensure the parcel exists and caller may view it.
    let owner_id = db::get_parcel_owner(&state.pool, parcel_id).await?;
    if ctx.role != UserRole::Admin && owner_id != ctx.user_id {
        return Err(AppError::Forbidden);
    }

    let trees = db::list_trees_by_parcel(&state.pool, parcel_id).await?;
    Ok(Json(serde_json::json!(trees)))
}

/// POST /parcels/:id/trees
pub async fn create_tree(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
    Path(parcel_id): Path<Uuid>,
    Json(input): Json<CreateTreeInput>,
) -> Result<(StatusCode, Json<serde_json::Value>)> {
    // Ensure the parcel exists and caller may write to it.
    let owner_id = db::get_parcel_owner(&state.pool, parcel_id).await?;
    if ctx.role != UserRole::Admin && owner_id != ctx.user_id {
        return Err(AppError::Forbidden);
    }

    let tree = db::create_tree(&state.pool, parcel_id, input).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!(tree))))
}

/// GET /trees/:id
/// Retrieve a single tree by its own UUID (gateway routes /trees/* here).
pub async fn get_tree(
    State(state): State<AppState>,
    Extension(ctx): Extension<UserContext>,
    Path(tree_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let tree = db::get_tree(&state.pool, tree_id)
        .await?
        .ok_or(AppError::NotFound)?;

    // Check the caller owns the parent parcel (or is admin).
    if ctx.role != UserRole::Admin {
        let owner_id = db::get_parcel_owner(&state.pool, tree.parcel_id).await?;
        if owner_id != ctx.user_id {
            return Err(AppError::Forbidden);
        }
    }

    Ok(Json(serde_json::json!(tree)))
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

/// GET /species
pub async fn list_species(
    State(state): State<AppState>,
    Extension(_ctx): Extension<UserContext>,
) -> Result<Json<serde_json::Value>> {
    let species = db::list_species(&state.pool).await?;
    Ok(Json(serde_json::json!(species)))
}
