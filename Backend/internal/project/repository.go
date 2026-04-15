package project

import (
	"context"
	"errors"

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

// ListForUser returns projects the user owns OR has tasks assigned to them in.
func (r *Repository) ListForUser(ctx context.Context, userID uuid.UUID) ([]models.Project, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at
		FROM projects p
		LEFT JOIN tasks t ON t.project_id = p.id
		WHERE p.owner_id = $1 OR t.assignee_id = $1
		ORDER BY p.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var p models.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (r *Repository) Create(ctx context.Context, name string, description *string, ownerID uuid.UUID) (models.Project, error) {
	var p models.Project
	err := r.db.QueryRow(ctx, `
		INSERT INTO projects (id, name, description, owner_id, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, NOW())
		RETURNING id, name, description, owner_id, created_at
	`, name, description, ownerID).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	return p, err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (models.Project, error) {
	var p models.Project
	err := r.db.QueryRow(ctx, `
		SELECT id, name, description, owner_id, created_at
		FROM projects WHERE id = $1
	`, id).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, name string, description *string) (models.Project, error) {
	var p models.Project
	err := r.db.QueryRow(ctx, `
		UPDATE projects SET name=$1, description=$2
		WHERE id=$3
		RETURNING id, name, description, owner_id, created_at
	`, name, description, id).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, "DELETE FROM projects WHERE id=$1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
