package models

import (
	"time"

	"github.com/google/uuid"
)

type Project struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	Name        string     `db:"name" json:"name"`
	Description *string    `db:"description" json:"description,omitempty"`
	OwnerID     uuid.UUID  `db:"owner_id" json:"owner_id"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	Tasks       []Task     `json:"tasks,omitempty"`
}

type CreateProjectRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
}

type UpdateProjectRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

type ProjectWithTasks struct {
	Project
	Tasks []Task `json:"tasks"`
}
