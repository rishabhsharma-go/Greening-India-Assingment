package domain

import (
	"context"
	"time"
)

type Task struct {
	ID          string
	Title       string
	Description string
	Status      string
	Priority    string
	ProjectID   string
	AssigneeID  *string
	CreatorID   string
	DueDate     *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreateTaskParams struct {
	Title       string
	Description string
	Priority    string
	ProjectID   string
	AssigneeID  *string
	CreatorID   string
	DueDate     *time.Time
}

type UpdateTaskParams struct {
	Title       *string
	Description *string
	Status      *string
	Priority    *string
	AssigneeID  *string
	DueDate     *time.Time
}

type TaskFilter struct {
	Status   string
	Priority string
	Assignee string
	Page     int
	Limit    int
}

type StatusCount struct {
	Todo       int `json:"todo"`
	InProgress int `json:"in_progress"`
	Done       int `json:"done"`
}

type AssigneeCount struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	Count    int    `json:"count"`
}

type ProjectStats struct {
	ByStatus   StatusCount     `json:"by_status"`
	ByAssignee []AssigneeCount `json:"by_assignee"`
}

type TaskRepository interface {
	ListByProject(ctx context.Context, projectID string, filter TaskFilter) ([]Task, int, error)
	GetByID(ctx context.Context, id string) (*Task, error)
	Create(ctx context.Context, params CreateTaskParams) (*Task, error)
	Update(ctx context.Context, id string, params UpdateTaskParams) (*Task, error)
	Delete(ctx context.Context, id string) error
	GetStatsByProject(ctx context.Context, projectID string) (*ProjectStats, error)
}
