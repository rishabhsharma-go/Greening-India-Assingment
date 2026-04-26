package models

import "time"

type User struct {
	ID        string    `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string    `gorm:"type:text;not null" json:"name"`
	Email     string    `gorm:"type:text;uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"type:text;not null" json:"-"`
	CreatedAt time.Time `json:"created_at"`
}
