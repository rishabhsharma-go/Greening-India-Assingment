package domain

import (
	"context"
	"time"
)

type User struct {
	ID        string
	Name      string
	Email     string
	Password  string
	CreatedAt time.Time
}

type CreateUserParams struct {
	Name     string
	Email    string
	Password string
}

type UserRepository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, params CreateUserParams) (*User, error)
	ListByProject(ctx context.Context, projectID string) ([]User, error)
	Search(ctx context.Context, query string, limit int) ([]User, error)
}
