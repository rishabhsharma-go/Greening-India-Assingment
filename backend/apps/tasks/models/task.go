package models

import "time"

type Task struct {
	ID          string     `gorm:"type:uuid;primaryKey" json:"id"`
	Title       string     `gorm:"type:text;not null" json:"title"`
	Description *string    `gorm:"type:text" json:"description,omitempty"`
	Status      string     `gorm:"type:text;not null;default:'todo'" json:"status"`
	Priority    string     `gorm:"type:text;not null;default:'medium'" json:"priority"`
	ProjectID   string     `gorm:"type:uuid;not null;index:idx_tasks_project_id" json:"project_id"`
	AssigneeID  *string    `gorm:"type:uuid;index:idx_tasks_assignee_id" json:"assignee_id,omitempty"`
	DueDate     *time.Time `gorm:"type:date" json:"due_date,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
