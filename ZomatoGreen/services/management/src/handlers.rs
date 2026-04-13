use std::sync::Arc;

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::{
    db,
    domain::{
        CreateProjectInput, CreateTaskInput, UpdateProjectInput, UpdateTaskInput, UserContext,
        UserRole,
    },
    errors::{AppError, Result},
    AppState,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn error_response(status: StatusCode, msg: &str) -> Response {
    (status, Json(json!({ "error": msg }))).into_response()
}

/// Returns true if the caller is the project owner or an admin.
fn is_owner_or_admin(caller_id: Uuid, owner_id: Uuid, role: &UserRole) -> bool {
    *role == UserRole::Admin || caller_id == owner_id
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

pub async fn list_projects(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<UserContext>,
) -> Result<impl IntoResponse> {
    let projects = db::list_projects(&state.pool, ctx.user_id, &ctx.role).await?;
    Ok(Json(json!({ "projects": projects })))
}

pub async fn create_project(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<UserContext>,
    Json(input): Json<CreateProjectInput>,
) -> Result<impl IntoResponse> {
    if input.name.trim().is_empty() {
        return Err(AppError::Validation(std::collections::HashMap::from([("name", "is required")])));
    }
    let owner_id = input.owner_id.unwrap_or(ctx.user_id);
    let project = db::create_project(&state.pool, owner_id, input).await?;
    Ok((StatusCode::CREATED, Json(project)))
}

pub async fn get_project(
    State(state): State<Arc<AppState>>,
    Extension(_ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    let pw = db::get_project_with_tasks(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(json!({ "project": pw.project, "tasks": pw.tasks })))
}

pub async fn update_project(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateProjectInput>,
) -> Result<impl IntoResponse> {
    // Ownership check
    let owner_id = db::get_project_owner(&state.pool, id).await?;
    if !is_owner_or_admin(ctx.user_id, owner_id, &ctx.role) {
        return Err(AppError::Forbidden);
    }

    let project = db::update_project(&state.pool, id, input)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(project))
}

pub async fn delete_project(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Ownership check
    let owner_id = db::get_project_owner(&state.pool, id).await?;
    if !is_owner_or_admin(ctx.user_id, owner_id, &ctx.role) {
        return Err(AppError::Forbidden);
    }

    let deleted = db::delete_project(&state.pool, id).await?;
    if deleted {
        Ok(StatusCode::NO_CONTENT.into_response())
    } else {
        Err(AppError::NotFound)
    }
}

pub async fn project_stats(
    State(state): State<Arc<AppState>>,
    Extension(_ctx): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Make sure the project exists first.
    db::get_project(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;

    let stats = db::project_stats(&state.pool, id).await?;
    Ok(Json(stats))
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct ListTasksParams {
    pub status: Option<crate::domain::TaskStatus>,
    pub assignee: Option<Uuid>,
}

pub async fn list_tasks(
    State(state): State<Arc<AppState>>,
    Extension(_ctx): Extension<UserContext>,
    Path(project_id): Path<Uuid>,
    Query(params): Query<ListTasksParams>,
) -> Result<impl IntoResponse> {
    // Make sure the project exists.
    db::get_project(&state.pool, project_id)
        .await?
        .ok_or(AppError::NotFound)?;

    let tasks =
        db::list_tasks(&state.pool, project_id, params.status, params.assignee).await?;
    Ok(Json(json!({ "tasks": tasks })))
}

pub async fn create_task(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<UserContext>,
    Path(project_id): Path<Uuid>,
    Json(input): Json<CreateTaskInput>,
) -> Result<impl IntoResponse> {
    if input.title.trim().is_empty() {
        return Err(AppError::Validation(std::collections::HashMap::from([("title", "is required")])));
    }

    // Make sure the project exists and caller is owner/admin.
    let owner_id = db::get_project_owner(&state.pool, project_id).await?;
    if !is_owner_or_admin(ctx.user_id, owner_id, &ctx.role) {
        return Err(AppError::Forbidden);
    }

    let mut input = input;
    input.creator_id = Some(ctx.user_id);
    let task = db::create_task(&state.pool, project_id, input).await?;
    Ok((StatusCode::CREATED, Json(task)))
}

pub async fn update_task(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<UserContext>,
    Path(task_id): Path<Uuid>,
    Json(input): Json<UpdateTaskInput>,
) -> Result<impl IntoResponse> {
    // Verify task exists and retrieve project owner + assignee.
    let (_, owner_id, _, assignee_id) = db::get_task_project_owner(&state.pool, task_id).await?;
    let is_assignee = assignee_id.map_or(false, |a| a == ctx.user_id);
    if !is_owner_or_admin(ctx.user_id, owner_id, &ctx.role) && !is_assignee {
        return Err(AppError::Forbidden);
    }

    let task = db::update_task(&state.pool, task_id, input)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(task))
}

pub async fn delete_task(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<UserContext>,
    Path(task_id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    // Allow project owner, task creator, or admin.
    let (_, owner_id, creator_id, _) = db::get_task_project_owner(&state.pool, task_id).await?;
    let is_creator = creator_id.map_or(false, |c| c == ctx.user_id);
    if !is_owner_or_admin(ctx.user_id, owner_id, &ctx.role) && !is_creator {
        return Err(AppError::Forbidden);
    }

    let deleted = db::delete_task(&state.pool, task_id).await?;
    if deleted {
        Ok(StatusCode::NO_CONTENT.into_response())
    } else {
        Err(AppError::NotFound)
    }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

pub async fn list_users(
    State(state): State<Arc<AppState>>,
    Extension(_ctx): Extension<UserContext>,
) -> Result<impl IntoResponse> {
    let users = db::list_users(&state.pool).await?;
    Ok(Json(json!({ "users": users })))
}

// ---------------------------------------------------------------------------
// Fallback / health
// ---------------------------------------------------------------------------

pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "ok" })))
}

/// Catch-all for unmatched routes.
pub async fn not_found() -> Response {
    error_response(StatusCode::NOT_FOUND, "not found")
}
