package task

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/you/taskflow/backend/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListForProject(ctx context.Context, projectID uuid.UUID, status string, assigneeID uuid.UUID) ([]models.Task, error) {
	query := `SELECT id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, created_at, updated_at
	          FROM tasks WHERE project_id = $1`
	args := []any{projectID}
	argIdx := 2

	if status != "" {
		query += " AND status = $" + itoa(argIdx)
		args = append(args, status)
		argIdx++
	}
	if assigneeID != uuid.Nil {
		query += " AND assignee_id = $" + itoa(argIdx)
		args = append(args, assigneeID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
			&t.ProjectID, &t.AssigneeID, &t.CreatorID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

func (r *Repository) Create(ctx context.Context, t models.Task) (models.Task, error) {
	var out models.Task
	err := r.db.QueryRow(ctx, `
		INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, created_at, updated_at
	`, t.Title, t.Description, t.Status, t.Priority, t.ProjectID, t.AssigneeID, t.CreatorID, t.DueDate,
	).Scan(&out.ID, &out.Title, &out.Description, &out.Status, &out.Priority,
		&out.ProjectID, &out.AssigneeID, &out.CreatorID, &out.DueDate, &out.CreatedAt, &out.UpdatedAt)
	return out, err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (models.Task, error) {
	var t models.Task
	err := r.db.QueryRow(ctx, `
		SELECT id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, created_at, updated_at
		FROM tasks WHERE id = $1
	`, id).Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.ProjectID, &t.AssigneeID, &t.CreatorID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return t, ErrNotFound
	}
	return t, err
}

func (r *Repository) Update(ctx context.Context, t models.Task) (models.Task, error) {
	var out models.Task
	err := r.db.QueryRow(ctx, `
		UPDATE tasks
		SET title=$1, description=$2, status=$3, priority=$4, assignee_id=$5, due_date=$6, updated_at=NOW()
		WHERE id=$7
		RETURNING id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, created_at, updated_at
	`, t.Title, t.Description, t.Status, t.Priority, t.AssigneeID, t.DueDate, t.ID,
	).Scan(&out.ID, &out.Title, &out.Description, &out.Status, &out.Priority,
		&out.ProjectID, &out.AssigneeID, &out.CreatorID, &out.DueDate, &out.CreatedAt, &out.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrNotFound
	}
	return out, err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, "DELETE FROM tasks WHERE id=$1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func itoa(n int) string {
	return strings.TrimSpace(strings.Replace("         ", " ", "", n-1))
}
