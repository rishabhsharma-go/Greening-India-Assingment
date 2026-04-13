package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents an application user. The password hash is never included in JSON output.
type User struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// Project groups tasks under an owner.
type Project struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	OwnerID     uuid.UUID  `json:"owner_id"`
	CreatedAt   time.Time  `json:"created_at"`
	Tasks       []Task     `json:"tasks,omitempty"`
}

// TaskStatus is an enum for task workflow state.
type TaskStatus string

// TaskPriority is an enum for task urgency.
type TaskPriority string

const (
	StatusTodo       TaskStatus = "todo"
	StatusInProgress TaskStatus = "in_progress"
	StatusDone       TaskStatus = "done"

	PriorityLow    TaskPriority = "low"
	PriorityMedium TaskPriority = "medium"
	PriorityHigh   TaskPriority = "high"
)

// Task is the core unit of work within a Project.
type Task struct {
	ID          uuid.UUID    `json:"id"`
	Title       string       `json:"title"`
	Description *string      `json:"description,omitempty"`
	Status      TaskStatus   `json:"status"`
	Priority    TaskPriority `json:"priority"`
	ProjectID   uuid.UUID    `json:"project_id"`
	AssigneeID  *uuid.UUID   `json:"assignee_id,omitempty"`
	DueDate     *time.Time   `json:"due_date,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// PaginationMeta carries pagination info in list responses.
type PaginationMeta struct {
	Page    int `json:"page"`
	Limit   int `json:"limit"`
	Total   int `json:"total"`
	HasNext bool `json:"has_next"`
}

// ProjectStats holds aggregate task counts for a project.
type ProjectStats struct {
	ProjectID uuid.UUID           `json:"project_id"`
	ByStatus  map[string]int      `json:"by_status"`
	ByAssignee map[string]int     `json:"by_assignee"`
}

// IsValidStatus reports whether s is one of the allowed task statuses.
func IsValidStatus(s string) bool {
	switch TaskStatus(s) {
	case StatusTodo, StatusInProgress, StatusDone:
		return true
	}
	return false
}

// IsValidPriority reports whether p is one of the allowed task priorities.
func IsValidPriority(p string) bool {
	switch TaskPriority(p) {
	case PriorityLow, PriorityMedium, PriorityHigh:
		return true
	}
	return false
}
