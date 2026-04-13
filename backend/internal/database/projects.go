package database

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/swaroop/taskflow/internal/models"
)

// ListProjectsParams carries filter and pagination options.
type ListProjectsParams struct {
	UserID uuid.UUID
	Page   int
	Limit  int
}

// ListProjectsResult includes the page data and total count.
type ListProjectsResult struct {
	Projects []models.Project
	Total    int
}

// ListProjects returns projects that the user owns or has tasks assigned to them in.
func (db *DB) ListProjects(ctx context.Context, p ListProjectsParams) (*ListProjectsResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 20
	}
	offset := (p.Page - 1) * p.Limit

	// Count total for pagination metadata
	var total int
	err := db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT pr.id)
		FROM projects pr
		LEFT JOIN tasks t ON t.project_id = pr.id
		WHERE pr.owner_id = $1
		   OR t.assignee_id = $1
	`, p.UserID).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("count projects: %w", err)
	}

	rows, err := db.QueryContext(ctx, `
		SELECT DISTINCT pr.id, pr.name, pr.description, pr.owner_id, pr.created_at
		FROM projects pr
		LEFT JOIN tasks t ON t.project_id = pr.id
		WHERE pr.owner_id = $1
		   OR t.assignee_id = $1
		ORDER BY pr.created_at DESC
		LIMIT $2 OFFSET $3
	`, p.UserID, p.Limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}
	defer rows.Close()

	projects := make([]models.Project, 0)
	for rows.Next() {
		var pr models.Project
		if err := rows.Scan(&pr.ID, &pr.Name, &pr.Description, &pr.OwnerID, &pr.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan project: %w", err)
		}
		projects = append(projects, pr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate projects: %w", err)
	}

	return &ListProjectsResult{Projects: projects, Total: total}, nil
}

// CreateProject inserts a new project owned by ownerID.
func (db *DB) CreateProject(ctx context.Context, name string, description *string, ownerID uuid.UUID) (*models.Project, error) {
	pr := &models.Project{}
	err := db.QueryRowContext(ctx, `
		INSERT INTO projects (name, description, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id, name, description, owner_id, created_at
	`, name, description, ownerID).
		Scan(&pr.ID, &pr.Name, &pr.Description, &pr.OwnerID, &pr.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create project: %w", err)
	}
	return pr, nil
}

// GetProjectByID returns a project with its tasks. Returns ErrNotFound if missing.
func (db *DB) GetProjectByID(ctx context.Context, id uuid.UUID) (*models.Project, error) {
	pr := &models.Project{}
	err := db.QueryRowContext(ctx, `
		SELECT id, name, description, owner_id, created_at
		FROM projects
		WHERE id = $1
	`, id).Scan(&pr.ID, &pr.Name, &pr.Description, &pr.OwnerID, &pr.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}

	tasks, err := db.listTasksForProject(ctx, id, ListTasksParams{})
	if err != nil {
		return nil, err
	}
	pr.Tasks = tasks

	return pr, nil
}

// UpdateProject patches a project's mutable fields (owner only, enforced at handler level).
func (db *DB) UpdateProject(ctx context.Context, id uuid.UUID, name string, description *string) (*models.Project, error) {
	pr := &models.Project{}
	err := db.QueryRowContext(ctx, `
		UPDATE projects
		SET name = $1, description = $2
		WHERE id = $3
		RETURNING id, name, description, owner_id, created_at
	`, name, description, id).
		Scan(&pr.ID, &pr.Name, &pr.Description, &pr.OwnerID, &pr.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update project: %w", err)
	}
	return pr, nil
}

// DeleteProject removes a project; its tasks are cascade-deleted by the DB constraint.
func (db *DB) DeleteProject(ctx context.Context, id uuid.UUID) error {
	result, err := db.ExecContext(ctx, `DELETE FROM projects WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete project: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// GetProjectStats returns task counts grouped by status and assignee.
func (db *DB) GetProjectStats(ctx context.Context, projectID uuid.UUID) (*models.ProjectStats, error) {
	stats := &models.ProjectStats{
		ProjectID:  projectID,
		ByStatus:   make(map[string]int),
		ByAssignee: make(map[string]int),
	}

	// By status
	rows, err := db.QueryContext(ctx, `
		SELECT status, COUNT(*) FROM tasks WHERE project_id = $1 GROUP BY status
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("stats by status: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		stats.ByStatus[status] = count
	}

	// By assignee (UUID → count; names can be resolved in the frontend)
	aRows, err := db.QueryContext(ctx, `
		SELECT COALESCE(assignee_id::text, 'unassigned'), COUNT(*)
		FROM tasks
		WHERE project_id = $1
		GROUP BY assignee_id
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("stats by assignee: %w", err)
	}
	defer aRows.Close()
	for aRows.Next() {
		var assignee string
		var count int
		if err := aRows.Scan(&assignee, &count); err != nil {
			return nil, err
		}
		stats.ByAssignee[assignee] = count
	}

	return stats, nil
}
