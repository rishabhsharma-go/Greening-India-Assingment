package models

import (
	"time"

	"github.com/google/uuid"
)

type TaskStatus string
type TaskPriority string

const (
	StatusTodo       TaskStatus = "todo"
	StatusInProgress TaskStatus = "in_progress"
	StatusDone       TaskStatus = "done"

	PriorityLow    TaskPriority = "low"
	PriorityMedium TaskPriority = "medium"
	PriorityHigh   TaskPriority = "high"
)

type Task struct {
	ID          uuid.UUID    `db:"id" json:"id"`
	Title       string       `db:"title" json:"title"`
	Description *string      `db:"description" json:"description,omitempty"`
	Status      TaskStatus   `db:"status" json:"status"`
	Priority    TaskPriority `db:"priority" json:"priority"`
	ProjectID   uuid.UUID    `db:"project_id" json:"project_id"`
	AssigneeID  *uuid.UUID   `db:"assignee_id" json:"assignee_id,omitempty"`
	CreatorID   uuid.UUID    `db:"creator_id" json:"creator_id"`
	DueDate     *time.Time   `db:"due_date" json:"due_date,omitempty"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time    `db:"updated_at" json:"updated_at"`
}

type CreateTaskRequest struct {
	Title       string       `json:"title" binding:"required"`
	Description *string      `json:"description"`
	Status      TaskStatus   `json:"status"`
	Priority    TaskPriority `json:"priority"`
	AssigneeID  *uuid.UUID   `json:"assignee_id"`
	DueDate     *string      `json:"due_date"`
}

type UpdateTaskRequest struct {
	Title       *string       `json:"title"`
	Description *string       `json:"description"`
	Status      *TaskStatus   `json:"status"`
	Priority    *TaskPriority `json:"priority"`
	AssigneeID  *uuid.UUID    `json:"assignee_id"`
	DueDate     *string       `json:"due_date"`
}

func ValidateStatus(status TaskStatus) bool {
	return status == StatusTodo || status == StatusInProgress || status == StatusDone
}

func ValidatePriority(priority TaskPriority) bool {
	return priority == PriorityLow || priority == PriorityMedium || priority == PriorityHigh
}
