package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/dhruva/taskflow/backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProjectRepository struct {
	pool *pgxpool.Pool
}

func NewProjectRepository(pool *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{pool: pool}
}

func (r *ProjectRepository) ListByUser(ctx context.Context, userID string, page, limit int) ([]domain.Project, int, error) {
	offset := (page - 1) * limit

	// projects where user is owner OR has assigned tasks
	var total int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT p.id) FROM projects p
		LEFT JOIN tasks t ON t.project_id = p.id
		WHERE p.owner_id = $1 OR t.assignee_id = $1
	`, userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at
		FROM projects p
		LEFT JOIN tasks t ON t.project_id = p.id
		WHERE p.owner_id = $1 OR t.assignee_id = $1
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var projects []domain.Project
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt); err != nil {
			return nil, 0, err
		}
		projects = append(projects, p)
	}
	return projects, total, rows.Err()
}

func (r *ProjectRepository) GetByID(ctx context.Context, id string) (*domain.Project, error) {
	var p domain.Project
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, description, owner_id, created_at FROM projects WHERE id = $1`, id,
	).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &p, err
}

func (r *ProjectRepository) HasAccess(ctx context.Context, projectID, userID string) (bool, error) {
	var hasAccess bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM projects p
			LEFT JOIN tasks t ON t.project_id = p.id
			WHERE p.id = $1
			  AND (p.owner_id = $2 OR t.assignee_id = $2)
		)
	`, projectID, userID).Scan(&hasAccess)
	return hasAccess, err
}

func (r *ProjectRepository) Create(ctx context.Context, params domain.CreateProjectParams) (*domain.Project, error) {
	var p domain.Project
	err := r.pool.QueryRow(ctx,
		`INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3)
		 RETURNING id, name, description, owner_id, created_at`,
		params.Name, params.Description, params.OwnerID,
	).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	return &p, err
}

func (r *ProjectRepository) Update(ctx context.Context, id string, params domain.UpdateProjectParams) (*domain.Project, error) {
	setClauses := []string{}
	args := []any{}
	argIdx := 1

	if params.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *params.Name)
		argIdx++
	}
	if params.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *params.Description)
		argIdx++
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id)
	}

	query := fmt.Sprintf("UPDATE projects SET %s WHERE id = $%d RETURNING id, name, description, owner_id, created_at",
		joinClauses(setClauses), argIdx)
	args = append(args, id)

	var p domain.Project
	err := r.pool.QueryRow(ctx, query, args...).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &p, err
}

func (r *ProjectRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM projects WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func joinClauses(clauses []string) string {
	result := clauses[0]
	for i := 1; i < len(clauses); i++ {
		result += ", " + clauses[i]
	}
	return result
}
