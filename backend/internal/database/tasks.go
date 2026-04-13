package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/swaroop/taskflow/internal/models"
)

// ListTasksParams carries optional filter and pagination options.
type ListTasksParams struct {
	Status     string
	AssigneeID string
	Page       int
	Limit      int
}

// ListTasksResult wraps a task slice with pagination metadata.
type ListTasksResult struct {
	Tasks []models.Task
	Total int
}

// listTasksForProject is an internal helper used by GetProjectByID (no pagination).
func (db *DB) listTasksForProject(ctx context.Context, projectID uuid.UUID, p ListTasksParams) ([]models.Task, error) {
	args := []interface{}{projectID}
	where := []string{"project_id = $1"}
	n := 2

	if p.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", n))
		args = append(args, p.Status)
		n++
	}
	if p.AssigneeID != "" {
		where = append(where, fmt.Sprintf("assignee_id = $%d", n))
		args = append(args, p.AssigneeID)
		n++
	}

	query := fmt.Sprintf(`
		SELECT id, title, description, status, priority,
		       project_id, assignee_id, due_date, created_at, updated_at
		FROM tasks
		WHERE %s
		ORDER BY created_at DESC
	`, strings.Join(where, " AND "))

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	tasks := make([]models.Task, 0)
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, *t)
	}
	return tasks, rows.Err()
}

// ListTasks returns paginated tasks for a project with optional filters.
func (db *DB) ListTasks(ctx context.Context, projectID uuid.UUID, p ListTasksParams) (*ListTasksResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 50
	}
	offset := (p.Page - 1) * p.Limit

	args := []interface{}{projectID}
	where := []string{"project_id = $1"}
	n := 2

	if p.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", n))
		args = append(args, p.Status)
		n++
	}
	if p.AssigneeID != "" {
		where = append(where, fmt.Sprintf("assignee_id = $%d", n))
		args = append(args, p.AssigneeID)
		n++
	}

	whereClause := strings.Join(where, " AND ")

	// Total count
	var total int
	if err := db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM tasks WHERE %s", whereClause),
		args...,
	).Scan(&total); err != nil {
		return nil, fmt.Errorf("count tasks: %w", err)
	}

	// Paginated rows
	args = append(args, p.Limit, offset)
	query := fmt.Sprintf(`
		SELECT id, title, description, status, priority,
		       project_id, assignee_id, due_date, created_at, updated_at
		FROM tasks
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, n, n+1)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	tasks := make([]models.Task, 0)
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, *t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &ListTasksResult{Tasks: tasks, Total: total}, nil
}

// CreateTaskParams holds validated input for task creation.
type CreateTaskParams struct {
	Title       string
	Description *string
	Priority    models.TaskPriority
	ProjectID   uuid.UUID
	AssigneeID  *uuid.UUID
	DueDate     *string // "YYYY-MM-DD"
}

// CreateTask inserts a new task and returns the created record.
func (db *DB) CreateTask(ctx context.Context, p CreateTaskParams) (*models.Task, error) {
	t := &models.Task{}
	err := db.QueryRowContext(ctx, `
		INSERT INTO tasks (title, description, priority, project_id, assignee_id, due_date)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, title, description, status, priority,
		          project_id, assignee_id, due_date, created_at, updated_at
	`, p.Title, p.Description, p.Priority, p.ProjectID, p.AssigneeID, p.DueDate).
		Scan(
			&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
			&t.ProjectID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt,
		)
	if err != nil {
		return nil, fmt.Errorf("create task: %w", err)
	}
	return t, nil
}

// UpdateTaskParams holds optional patch fields. Nil means "don't change".
type UpdateTaskParams struct {
	Title       *string
	Description *string
	Status      *models.TaskStatus
	Priority    *models.TaskPriority
	AssigneeID  *uuid.UUID
	ClearAssignee bool
	DueDate     *string
	ClearDueDate  bool
}

// UpdateTask applies a partial update to a task, returns the updated record.
func (db *DB) UpdateTask(ctx context.Context, id uuid.UUID, p UpdateTaskParams) (*models.Task, error) {
	// Build a dynamic SET clause
	sets := []string{"updated_at = NOW()"}
	args := []interface{}{}
	n := 1

	if p.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", n))
		args = append(args, *p.Title)
		n++
	}
	if p.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", n))
		args = append(args, *p.Description)
		n++
	}
	if p.Status != nil {
		sets = append(sets, fmt.Sprintf("status = $%d", n))
		args = append(args, *p.Status)
		n++
	}
	if p.Priority != nil {
		sets = append(sets, fmt.Sprintf("priority = $%d", n))
		args = append(args, *p.Priority)
		n++
	}
	if p.ClearAssignee {
		sets = append(sets, "assignee_id = NULL")
	} else if p.AssigneeID != nil {
		sets = append(sets, fmt.Sprintf("assignee_id = $%d", n))
		args = append(args, *p.AssigneeID)
		n++
	}
	if p.ClearDueDate {
		sets = append(sets, "due_date = NULL")
	} else if p.DueDate != nil {
		sets = append(sets, fmt.Sprintf("due_date = $%d", n))
		args = append(args, *p.DueDate)
		n++
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE tasks
		SET %s
		WHERE id = $%d
		RETURNING id, title, description, status, priority,
		          project_id, assignee_id, due_date, created_at, updated_at
	`, strings.Join(sets, ", "), n)

	t := &models.Task{}
	err := db.QueryRowContext(ctx, query, args...).
		Scan(
			&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
			&t.ProjectID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt,
		)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update task: %w", err)
	}
	return t, nil
}

// GetTaskByID returns a single task by primary key.
func (db *DB) GetTaskByID(ctx context.Context, id uuid.UUID) (*models.Task, error) {
	row := db.QueryRowContext(ctx, `
		SELECT id, title, description, status, priority,
		       project_id, assignee_id, due_date, created_at, updated_at
		FROM tasks WHERE id = $1
	`, id)
	t, err := scanTask(row)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get task: %w", err)
	}
	return t, nil
}

// DeleteTask removes a task by ID. Returns ErrNotFound if it doesn't exist.
func (db *DB) DeleteTask(ctx context.Context, id uuid.UUID) error {
	result, err := db.ExecContext(ctx, `DELETE FROM tasks WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// scanner is satisfied by *sql.Row and *sql.Rows — lets scanTask work for both.
type scanner interface {
	Scan(dest ...interface{}) error
}

func scanTask(s scanner) (*models.Task, error) {
	t := &models.Task{}
	err := s.Scan(
		&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.ProjectID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return t, nil
}
