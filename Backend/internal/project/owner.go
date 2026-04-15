package project

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// GetOwnerID returns the owner_id for a project.
// Implements task.ProjectOwnerChecker.
func (r *Repository) GetOwnerID(ctx context.Context, projectID uuid.UUID) (uuid.UUID, error) {
	var ownerID uuid.UUID
	err := r.db.QueryRow(ctx, "SELECT owner_id FROM projects WHERE id=$1", projectID).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return ownerID, err
}
