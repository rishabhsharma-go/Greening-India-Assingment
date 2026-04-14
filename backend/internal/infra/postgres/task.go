package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/dhruva/taskflow/backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TaskRepository struct {
	pool *pgxpool.Pool
}

func NewTaskRepository(pool *pgxpool.Pool) *TaskRepository {
	return &TaskRepository{pool: pool}
}

func (r *TaskRepository) ListByProject(ctx context.Context, projectID string, filter domain.TaskFilter) ([]domain.Task, int, error) {
	where := "WHERE t.project_id = $1"
	args := []any{projectID}
	argIdx := 2

	if filter.Status != "" {
		where += fmt.Sprintf(" AND t.status = $%d", argIdx)
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Priority != "" {
		where += fmt.Sprintf(" AND t.priority = $%d", argIdx)
		args = append(args, filter.Priority)
		argIdx++
	}
	if filter.Assignee != "" {
		where += fmt.Sprintf(" AND t.assignee_id = $%d", argIdx)
		args = append(args, filter.Assignee)
		argIdx++
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM tasks t %s", where)
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.Limit
	query := fmt.Sprintf(`
		SELECT t.id, t.title, t.description, t.status, t.priority,
			   t.project_id, t.assignee_id, t.creator_id, t.due_date,
			   t.created_at, t.updated_at
		FROM tasks t %s
		ORDER BY t.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []domain.Task
	for rows.Next() {
		var t domain.Task
		if err := rows.Scan(
			&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
			&t.ProjectID, &t.AssigneeID, &t.CreatorID, &t.DueDate,
			&t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		tasks = append(tasks, t)
	}
	return tasks, total, rows.Err()
}

func (r *TaskRepository) GetByID(ctx context.Context, id string) (*domain.Task, error) {
	var t domain.Task
	err := r.pool.QueryRow(ctx, `
		SELECT id, title, description, status, priority,
			   project_id, assignee_id, creator_id, due_date,
			   created_at, updated_at
		FROM tasks WHERE id = $1
	`, id).Scan(
		&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.ProjectID, &t.AssigneeID, &t.CreatorID, &t.DueDate,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &t, err
}

func (r *TaskRepository) Create(ctx context.Context, params domain.CreateTaskParams) (*domain.Task, error) {
	var t domain.Task
	err := r.pool.QueryRow(ctx, `
		INSERT INTO tasks (title, description, priority, project_id, assignee_id, creator_id, due_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, title, description, status, priority,
				  project_id, assignee_id, creator_id, due_date,
				  created_at, updated_at
	`, params.Title, params.Description, params.Priority, params.ProjectID,
		params.AssigneeID, params.CreatorID, params.DueDate,
	).Scan(
		&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.ProjectID, &t.AssigneeID, &t.CreatorID, &t.DueDate,
		&t.CreatedAt, &t.UpdatedAt,
	)
	return &t, err
}

func (r *TaskRepository) Update(ctx context.Context, id string, params domain.UpdateTaskParams) (*domain.Task, error) {
	setClauses := []string{}
	args := []any{}
	argIdx := 1

	if params.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *params.Title)
		argIdx++
	}
	if params.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *params.Description)
		argIdx++
	}
	if params.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *params.Status)
		argIdx++
	}
	if params.Priority != nil {
		setClauses = append(setClauses, fmt.Sprintf("priority = $%d", argIdx))
		args = append(args, *params.Priority)
		argIdx++
	}
	if params.AssigneeID != nil {
		setClauses = append(setClauses, fmt.Sprintf("assignee_id = $%d", argIdx))
		args = append(args, *params.AssigneeID)
		argIdx++
	}
	if params.DueDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("due_date = $%d", argIdx))
		args = append(args, *params.DueDate)
		argIdx++
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id)
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	query := fmt.Sprintf(`
		UPDATE tasks SET %s WHERE id = $%d
		RETURNING id, title, description, status, priority,
				  project_id, assignee_id, creator_id, due_date,
				  created_at, updated_at
	`, joinClauses(setClauses), argIdx)
	args = append(args, id)

	var t domain.Task
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.ProjectID, &t.AssigneeID, &t.CreatorID, &t.DueDate,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &t, err
}

func (r *TaskRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *TaskRepository) GetStatsByProject(ctx context.Context, projectID string) (*domain.ProjectStats, error) {
	var stats domain.ProjectStats
	err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0)
		FROM tasks WHERE project_id = $1
	`, projectID).Scan(&stats.ByStatus.Todo, &stats.ByStatus.InProgress, &stats.ByStatus.Done)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT t.assignee_id, u.name, COUNT(*)
		FROM tasks t
		JOIN users u ON u.id = t.assignee_id
		WHERE t.project_id = $1 AND t.assignee_id IS NOT NULL
		GROUP BY t.assignee_id, u.name
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var ac domain.AssigneeCount
		if err := rows.Scan(&ac.UserID, &ac.UserName, &ac.Count); err != nil {
			return nil, err
		}
		stats.ByAssignee = append(stats.ByAssignee, ac)
	}

	if stats.ByAssignee == nil {
		stats.ByAssignee = []domain.AssigneeCount{}
	}
	return &stats, rows.Err()
}
