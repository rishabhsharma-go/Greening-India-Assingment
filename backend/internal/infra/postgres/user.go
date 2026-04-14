package postgres

import (
	"context"
	"errors"

	"github.com/dhruva/taskflow/backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, email, password, created_at FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &u, err
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, email, password, created_at FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &u, err
}

func (r *UserRepository) Create(ctx context.Context, params domain.CreateUserParams) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
		 RETURNING id, name, email, password, created_at`,
		params.Name, params.Email, params.Password,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.CreatedAt)
	return &u, err
}

func (r *UserRepository) ListByProject(ctx context.Context, projectID string) ([]domain.User, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT u.id, u.name, u.email, u.created_at FROM users u
		WHERE u.id IN (
			SELECT owner_id FROM projects WHERE id = $1
			UNION
			SELECT assignee_id FROM tasks WHERE project_id = $1 AND assignee_id IS NOT NULL
		)
		ORDER BY u.name
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *UserRepository) Search(ctx context.Context, query string, limit int) ([]domain.User, error) {
	if limit <= 0 || limit > 20 {
		limit = 10
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, email, created_at FROM users
		WHERE name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%'
		ORDER BY name
		LIMIT $2
	`, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}
