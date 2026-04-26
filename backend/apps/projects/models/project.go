package models

import "time"

type Project struct {
	ID          string    `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string    `gorm:"type:text;not null" json:"name"`
	Description *string   `gorm:"type:text" json:"description,omitempty"`
	OwnerID     string    `gorm:"type:uuid;not null;index:idx_projects_owner_id" json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
}
