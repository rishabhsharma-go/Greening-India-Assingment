package database

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/swaroop/taskflow/internal/models"
)

// CreateUser inserts a new user and returns the created record (without the hash).
func (db *DB) CreateUser(ctx context.Context, name, email, passwordHash string) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRowContext(ctx, `
		INSERT INTO users (name, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, name, email, created_at
	`, name, email, passwordHash).
		Scan(&user.ID, &user.Name, &user.Email, &user.CreatedAt)

	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrDuplicateEmail
		}
		return nil, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

// GetUserByEmail looks up a user and returns the model alongside the stored
// password hash (for bcrypt comparison). Keeping the hash out of models.User
// prevents accidental serialization.
func (db *DB) GetUserByEmail(ctx context.Context, email string) (*models.User, string, error) {
	user := &models.User{}
	var hash string

	err := db.QueryRowContext(ctx, `
		SELECT id, name, email, password_hash, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Name, &user.Email, &hash, &user.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, "", ErrNotFound
	}
	if err != nil {
		return nil, "", fmt.Errorf("get user by email: %w", err)
	}
	return user, hash, nil
}

// GetUserByID looks up a user by primary key.
func (db *DB) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user := &models.User{}

	err := db.QueryRowContext(ctx, `
		SELECT id, name, email, created_at
		FROM users
		WHERE id = $1
	`, id).Scan(&user.ID, &user.Name, &user.Email, &user.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return user, nil
}
