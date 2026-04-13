use sqlx::{PgPool, QueryBuilder};
use uuid::Uuid;

use crate::domain::{
    CreateProjectInput, CreateTaskInput, Project, ProjectWithTasks, Task, TaskPriority, TaskStats,
    TaskStatus, UpdateProjectInput, UpdateTaskInput, User, UserRole,
};
use crate::errors::{AppError, Result};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

pub async fn list_projects(pool: &PgPool, owner_id: Uuid, role: &UserRole) -> Result<Vec<Project>> {
    let rows = if *role == UserRole::Admin {
        sqlx::query_as::<_, Project>(
            "SELECT id, name, description, owner_id, project_type, created_at \
             FROM projects \
             ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, Project>(
            "SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.project_type, p.created_at \
             FROM projects p \
             LEFT JOIN tasks t ON t.project_id = p.id \
             WHERE p.owner_id = $1 OR t.assignee_id = $1 \
             ORDER BY p.created_at DESC",
        )
        .bind(owner_id)
        .fetch_all(pool)
        .await?
    };
    Ok(rows)
}

pub async fn create_project(
    pool: &PgPool,
    owner_id: Uuid,
    input: CreateProjectInput,
) -> Result<Project> {
    let row = sqlx::query_as::<_, Project>(
        "INSERT INTO projects (id, name, description, owner_id, project_type) \
         VALUES (uuid_generate_v4(), $1, $2, $3, $4) \
         RETURNING id, name, description, owner_id, project_type, created_at",
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(owner_id)
    .bind(&input.project_type)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

pub async fn get_project(pool: &PgPool, id: Uuid) -> Result<Option<Project>> {
    let row = sqlx::query_as::<_, Project>(
        "SELECT id, name, description, owner_id, project_type, created_at \
         FROM projects \
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn get_project_with_tasks(pool: &PgPool, id: Uuid) -> Result<Option<ProjectWithTasks>> {
    let project = match get_project(pool, id).await? {
        Some(p) => p,
        None => return Ok(None),
    };

    let tasks = sqlx::query_as::<_, Task>(
        "SELECT id, title, description, status, priority, project_id, \
                assignee_id, creator_id, due_date, created_at, updated_at \
         FROM tasks \
         WHERE project_id = $1 \
         ORDER BY created_at DESC",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;

    Ok(Some(ProjectWithTasks { project, tasks }))
}

pub async fn update_project(
    pool: &PgPool,
    id: Uuid,
    input: UpdateProjectInput,
) -> Result<Option<Project>> {
    let row = sqlx::query_as::<_, Project>(
        "UPDATE projects \
         SET name         = COALESCE($2, name), \
             description  = COALESCE($3, description), \
             project_type = COALESCE($4, project_type) \
         WHERE id = $1 \
         RETURNING id, name, description, owner_id, project_type, created_at",
    )
    .bind(id)
    .bind(&input.name)
    .bind(&input.description)
    .bind(&input.project_type)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn delete_project(pool: &PgPool, id: Uuid) -> Result<bool> {
    let result = sqlx::query("DELETE FROM projects WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn project_stats(pool: &PgPool, id: Uuid) -> Result<TaskStats> {
    // Fetch counts grouped by status, then aggregate in Rust.
    let rows: Vec<(TaskStatus, i64)> = sqlx::query_as(
        "SELECT status, COUNT(*)::bigint \
         FROM tasks \
         WHERE project_id = $1 \
         GROUP BY status",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;

    let mut stats = TaskStats {
        todo: 0,
        in_progress: 0,
        done: 0,
    };

    for (status, count) in rows {
        match status {
            TaskStatus::Todo => stats.todo = count,
            TaskStatus::InProgress => stats.in_progress = count,
            TaskStatus::Done => stats.done = count,
        }
    }

    Ok(stats)
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

pub async fn list_tasks(
    pool: &PgPool,
    project_id: Uuid,
    status: Option<TaskStatus>,
    assignee: Option<Uuid>,
) -> Result<Vec<Task>> {
    let mut qb = QueryBuilder::new(
        "SELECT id, title, description, status, priority, project_id, \
                assignee_id, creator_id, due_date, created_at, updated_at \
         FROM tasks \
         WHERE project_id = ",
    );
    qb.push_bind(project_id);

    if let Some(s) = status {
        qb.push(" AND status = ").push_bind(s);
    }
    if let Some(a) = assignee {
        qb.push(" AND assignee_id = ").push_bind(a);
    }

    qb.push(" ORDER BY created_at DESC");

    let rows = qb.build_query_as::<Task>().fetch_all(pool).await?;
    Ok(rows)
}

pub async fn create_task(
    pool: &PgPool,
    project_id: Uuid,
    input: CreateTaskInput,
) -> Result<Task> {
    let status = input.status.unwrap_or(TaskStatus::Todo);
    let priority = input.priority.unwrap_or(TaskPriority::Medium);

    let row = sqlx::query_as::<_, Task>(
        "INSERT INTO tasks \
             (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date) \
         VALUES \
             (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8) \
         RETURNING id, title, description, status, priority, project_id, \
                   assignee_id, creator_id, due_date, created_at, updated_at",
    )
    .bind(&input.title)
    .bind(&input.description)
    .bind(status)
    .bind(priority)
    .bind(project_id)
    .bind(&input.assignee_id)
    .bind(&input.creator_id)
    .bind(&input.due_date)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

pub async fn update_task(pool: &PgPool, id: Uuid, input: UpdateTaskInput) -> Result<Option<Task>> {
    // At least one field must be set; if nothing is provided return the
    // existing row unchanged (or None if it doesn't exist).
    let has_changes = input.title.is_some()
        || input.description.is_some()
        || input.status.is_some()
        || input.priority.is_some()
        || input.assignee_id.is_some()
        || input.due_date.is_some();

    if !has_changes {
        // Return current row without touching updated_at.
        return Ok(sqlx::query_as::<_, Task>(
            "SELECT id, title, description, status, priority, project_id, \
                    assignee_id, creator_id, due_date, created_at, updated_at \
             FROM tasks WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(pool)
        .await?);
    }

    let mut qb: QueryBuilder<sqlx::Postgres> =
        QueryBuilder::new("UPDATE tasks SET updated_at = NOW()");

    if let Some(ref title) = input.title {
        qb.push(", title = ").push_bind(title);
    }
    if let Some(ref description) = input.description {
        qb.push(", description = ").push_bind(description);
    }
    if let Some(ref status) = input.status {
        qb.push(", status = ").push_bind(status);
    }
    if let Some(ref priority) = input.priority {
        qb.push(", priority = ").push_bind(priority);
    }
    if let Some(ref assignee_id) = input.assignee_id {
        qb.push(", assignee_id = ").push_bind(assignee_id);
    }
    if let Some(ref due_date) = input.due_date {
        qb.push(", due_date = ").push_bind(due_date);
    }

    qb.push(" WHERE id = ").push_bind(id);
    qb.push(
        " RETURNING id, title, description, status, priority, project_id, \
                   assignee_id, creator_id, due_date, created_at, updated_at",
    );

    let row = qb
        .build_query_as::<Task>()
        .fetch_optional(pool)
        .await?;
    Ok(row)
}

pub async fn delete_task(pool: &PgPool, id: Uuid) -> Result<bool> {
    let result = sqlx::query("DELETE FROM tasks WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

pub async fn list_users(pool: &PgPool) -> Result<Vec<User>> {
    let rows = sqlx::query_as::<_, User>(
        "SELECT id, name, email, role, created_at \
         FROM users \
         ORDER BY name",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

// ---------------------------------------------------------------------------
// Helper: ownership check
// ---------------------------------------------------------------------------

/// Returns the owner_id of a project, or AppError::NotFound.
pub async fn get_project_owner(pool: &PgPool, project_id: Uuid) -> Result<Uuid> {
    let row: (Uuid,) = sqlx::query_as("SELECT owner_id FROM projects WHERE id = $1")
        .bind(project_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(row.0)
}

/// Returns (project_id, project_owner_id, task_creator_id, task_assignee_id) or AppError::NotFound.
pub async fn get_task_project_owner(pool: &PgPool, task_id: Uuid) -> Result<(Uuid, Uuid, Option<Uuid>, Option<Uuid>)> {
    let row: (Uuid, Uuid, Option<Uuid>, Option<Uuid>) = sqlx::query_as(
        "SELECT t.project_id, p.owner_id, t.creator_id, t.assignee_id \
         FROM tasks t \
         JOIN projects p ON p.id = t.project_id \
         WHERE t.id = $1",
    )
    .bind(task_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(row)
}
