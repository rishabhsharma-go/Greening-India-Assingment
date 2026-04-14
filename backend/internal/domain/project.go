package domain

import (
	"context"
	"time"
)

type Project struct {
	ID          string
	Name        string
	Description string
	OwnerID     string
	CreatedAt   time.Time
	Tasks       []Task
}

type CreateProjectParams struct {
	Name        string
	Description string
	OwnerID     string
}

type UpdateProjectParams struct {
	Name        *string
	Description *string
}

type ProjectRepository interface {
	ListByUser(ctx context.Context, userID string, page, limit int) ([]Project, int, error)
	GetByID(ctx context.Context, id string) (*Project, error)
	HasAccess(ctx context.Context, projectID, userID string) (bool, error)
	Create(ctx context.Context, params CreateProjectParams) (*Project, error)
	Update(ctx context.Context, id string, params UpdateProjectParams) (*Project, error)
	Delete(ctx context.Context, id string) error
}
