package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var db *pgxpool.Pool
var jwtSecret string
var logger *slog.Logger

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	OwnerID     string    `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
	Tasks       []Task    `json:"tasks,omitempty"`
}

type Task struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	ProjectID   string     `json:"project_id"`
	AssigneeID  *string    `json:"assignee_id"`
	DueDate     *string    `json:"due_date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ErrorResponse struct {
	Error  string            `json:"error"`
	Fields map[string]string `json:"fields,omitempty"`
}

func init() {
	logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))
}

func main() {
	jwtSecret = os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		logger.Error("JWT_SECRET not set")
		os.Exit(1)
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		logger.Error("DATABASE_URL not set")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		logger.Error("Failed to create database pool", "error", err)
		os.Exit(1)
	}
	db = pool

	// Test connection
	if err := db.Ping(ctx); err != nil {
		logger.Error("Failed to ping database", "error", err)
		os.Exit(1)
	}
	logger.Info("Connected to database")

	router := setupRouter()

	// Start server in a goroutine
	go func() {
		addr := ":8080"
		logger.Info("Starting server", "address", addr)
		if err := http.ListenAndServe(addr, router); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("Server error", "error", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)
	<-sigChan

	logger.Info("Shutdown signal received")
	db.Close()
	logger.Info("Database connection closed")
}

func setupRouter() *chi.Mux {
	r := chi.NewRouter()

	// CORS middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(contentTypeMiddleware)

	// Public routes
	r.Post("/auth/register", handleRegister)
	r.Post("/auth/login", handleLogin)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)

		// Projects
		r.Get("/projects", handleGetProjects)
		r.Post("/projects", handleCreateProject)
		r.Get("/projects/{id}", handleGetProject)
		r.Patch("/projects/{id}", handleUpdateProject)
		r.Delete("/projects/{id}", handleDeleteProject)

		// Tasks
		r.Get("/projects/{id}/tasks", handleGetTasks)
		r.Post("/projects/{id}/tasks", handleCreateTask)
		r.Patch("/tasks/{id}", handleUpdateTask)
		r.Delete("/tasks/{id}", handleDeleteTask)
	})

	return r
}

func contentTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}

// -------- AUTH HANDLERS --------

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"body": "invalid JSON"},
		})
		return
	}

	// Validation
	fields := make(map[string]string)
	if req.Name == "" {
		fields["name"] = "is required"
	}
	if req.Email == "" {
		fields["email"] = "is required"
	}
	if req.Password == "" {
		fields["password"] = "is required"
	}
	if len(req.Password) < 6 {
		fields["password"] = "must be at least 6 characters"
	}

	if len(fields) > 0 {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: fields,
		})
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		logger.Error("Failed to hash password", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	// Create user
	id := uuid.New()
	_, err = db.Exec(context.Background(),
		"INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4)",
		id, req.Name, req.Email, string(hash))

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			respondJSON(w, http.StatusBadRequest, ErrorResponse{
				Error:  "validation failed",
				Fields: map[string]string{"email": "already exists"},
			})
			return
		}
		logger.Error("Failed to create user", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	// Generate token
	token := generateToken(id.String(), req.Email)

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user": User{
			ID:        id.String(),
			Name:      req.Name,
			Email:     req.Email,
			CreatedAt: time.Now(),
		},
	})
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"body": "invalid JSON"},
		})
		return
	}

	var id, name, hash string
	err := db.QueryRow(context.Background(),
		"SELECT id, name, password FROM users WHERE email = $1",
		req.Email).Scan(&id, &name, &hash)

	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		respondJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	token := generateToken(id, req.Email)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user": User{
			ID:        id,
			Name:      name,
			Email:     req.Email,
			CreatedAt: time.Now(),
		},
	})
}

// -------- MIDDLEWARE --------

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			respondJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
			return
		}

		tokenStr := parts[1]
		claims := jwt.MapClaims{}
		_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})

		if err != nil {
			respondJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
			return
		}

		// Store claims in context for use in handlers
		ctx := context.WithValue(r.Context(), "user_id", claims["user_id"])
		ctx = context.WithValue(ctx, "email", claims["email"])

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// -------- PROJECT HANDLERS --------

func handleGetProjects(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	rows, err := db.Query(context.Background(),
		`SELECT id, name, description, owner_id, created_at FROM projects 
		 WHERE owner_id = $1 OR id IN (SELECT project_id FROM tasks WHERE assignee_id = $1)
		 ORDER BY created_at DESC`,
		userID)
	if err != nil {
		logger.Error("Failed to query projects", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt); err != nil {
			logger.Error("Failed to scan project", "error", err)
			continue
		}
		projects = append(projects, p)
	}

	if projects == nil {
		projects = []Project{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{"projects": projects})
}

func handleCreateProject(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"body": "invalid JSON"},
		})
		return
	}

	if req.Name == "" {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"name": "is required"},
		})
		return
	}

	id := uuid.New()
	var desc *string
	if req.Description != "" {
		desc = &req.Description
	}

	_, err := db.Exec(context.Background(),
		"INSERT INTO projects (id, name, description, owner_id) VALUES ($1, $2, $3, $4)",
		id, req.Name, desc, userID)

	if err != nil {
		logger.Error("Failed to create project", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	project := Project{
		ID:          id.String(),
		Name:        req.Name,
		Description: desc,
		OwnerID:     userID,
		CreatedAt:   time.Now(),
	}

	respondJSON(w, http.StatusCreated, project)
}

func handleGetProject(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	projectID := chi.URLParam(r, "id")

	var project Project
	err := db.QueryRow(context.Background(),
		"SELECT id, name, description, owner_id, created_at FROM projects WHERE id = $1",
		projectID).Scan(&project.ID, &project.Name, &project.Description, &project.OwnerID, &project.CreatedAt)

	if err != nil {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "not found"})
		return
	}

	// Check access: owner or has tasks in project
	var hasAccess bool
	err = db.QueryRow(context.Background(),
		"SELECT EXISTS(SELECT 1 FROM tasks WHERE project_id = $1 AND assignee_id = $2)",
		projectID, userID).Scan(&hasAccess)

	if !hasAccess && project.OwnerID != userID {
		respondJSON(w, http.StatusForbidden, ErrorResponse{Error: "forbidden"})
		return
	}

	// Get tasks
	taskRows, err := db.Query(context.Background(),
		"SELECT id, title, description, status, priority, project_id, assignee_id, due_date, created_at, updated_at FROM tasks WHERE project_id = $1 ORDER BY created_at DESC",
		projectID)
	if err != nil {
		logger.Error("Failed to query tasks", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}
	defer taskRows.Close()

	for taskRows.Next() {
		var t Task
		if err := taskRows.Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.ProjectID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			logger.Error("Failed to scan task", "error", err)
			continue
		}
		project.Tasks = append(project.Tasks, t)
	}

	if project.Tasks == nil {
		project.Tasks = []Task{}
	}

	respondJSON(w, http.StatusOK, project)
}

func handleUpdateProject(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	projectID := chi.URLParam(r, "id")

	// Check ownership
	var ownerID string
	err := db.QueryRow(context.Background(),
		"SELECT owner_id FROM projects WHERE id = $1",
		projectID).Scan(&ownerID)

	if err != nil {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "not found"})
		return
	}

	if ownerID != userID {
		respondJSON(w, http.StatusForbidden, ErrorResponse{Error: "forbidden"})
		return
	}

	var req struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"body": "invalid JSON"},
		})
		return
	}

	// Build update query
	query := "UPDATE projects SET updated_at = CURRENT_TIMESTAMP"
	var args []interface{}
	argCount := 1

	if req.Name != nil {
		query += fmt.Sprintf(", name = $%d", argCount)
		args = append(args, *req.Name)
		argCount++
	}
	if req.Description != nil {
		query += fmt.Sprintf(", description = $%d", argCount)
		args = append(args, *req.Description)
		argCount++
	}

	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, projectID)

	_, err = db.Exec(context.Background(), query, args...)
	if err != nil {
		logger.Error("Failed to update project", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	// Return updated project
	var project Project
	err = db.QueryRow(context.Background(),
		"SELECT id, name, description, owner_id, created_at FROM projects WHERE id = $1",
		projectID).Scan(&project.ID, &project.Name, &project.Description, &project.OwnerID, &project.CreatedAt)

	if err != nil {
		logger.Error("Failed to fetch updated project", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	respondJSON(w, http.StatusOK, project)
}

func handleDeleteProject(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	projectID := chi.URLParam(r, "id")

	// Check ownership
	var ownerID string
	err := db.QueryRow(context.Background(),
		"SELECT owner_id FROM projects WHERE id = $1",
		projectID).Scan(&ownerID)

	if err != nil {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "not found"})
		return
	}

	if ownerID != userID {
		respondJSON(w, http.StatusForbidden, ErrorResponse{Error: "forbidden"})
		return
	}

	_, err = db.Exec(context.Background(),
		"DELETE FROM projects WHERE id = $1",
		projectID)

	if err != nil {
		logger.Error("Failed to delete project", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// -------- TASK HANDLERS --------

func handleGetTasks(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	statusFilter := r.URL.Query().Get("status")
	assigneeFilter := r.URL.Query().Get("assignee")

	query := "SELECT id, title, description, status, priority, project_id, assignee_id, due_date, created_at, updated_at FROM tasks WHERE project_id = $1"
	var args []interface{}
	args = append(args, projectID)

	argCount := 2
	if statusFilter != "" {
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, statusFilter)
		argCount++
	}

	if assigneeFilter != "" {
		query += fmt.Sprintf(" AND assignee_id = $%d", argCount)
		args = append(args, assigneeFilter)
		argCount++
	}

	query += " ORDER BY created_at DESC"

	rows, err := db.Query(context.Background(), query, args...)
	if err != nil {
		logger.Error("Failed to query tasks", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.ProjectID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			logger.Error("Failed to scan task", "error", err)
			continue
		}
		tasks = append(tasks, t)
	}

	if tasks == nil {
		tasks = []Task{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{"tasks": tasks})
}

func handleCreateTask(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Priority    string `json:"priority"`
		AssigneeID  string `json:"assignee_id"`
		DueDate     string `json:"due_date"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"body": "invalid JSON"},
		})
		return
	}

	// Validation
	if req.Title == "" {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"title": "is required"},
		})
		return
	}

	// Validate priority
	if req.Priority == "" {
		req.Priority = "medium"
	}
	validPriorities := map[string]bool{"low": true, "medium": true, "high": true}
	if !validPriorities[req.Priority] {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"priority": "must be low, medium, or high"},
		})
		return
	}

	id := uuid.New()
	var desc *string
	if req.Description != "" {
		desc = &req.Description
	}

	var assigneeID *string
	if req.AssigneeID != "" {
		assigneeID = &req.AssigneeID
	}

	var dueDate *string
	if req.DueDate != "" {
		dueDate = &req.DueDate
	}

	now := time.Now()
	_, err := db.Exec(context.Background(),
		`INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, due_date, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		id, req.Title, desc, "todo", req.Priority, projectID, assigneeID, dueDate, now, now)

	if err != nil {
		logger.Error("Failed to create task", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	task := Task{
		ID:          id.String(),
		Title:       req.Title,
		Description: desc,
		Status:      "todo",
		Priority:    req.Priority,
		ProjectID:   projectID,
		AssigneeID:  assigneeID,
		DueDate:     dueDate,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	respondJSON(w, http.StatusCreated, task)
}

func handleUpdateTask(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	taskID := chi.URLParam(r, "id")

	// Get current task
	var currentProjectID, currentCreatorID string
	err := db.QueryRow(context.Background(),
		"SELECT project_id, (SELECT owner_id FROM projects WHERE id = tasks.project_id) FROM tasks WHERE id = $1",
		taskID).Scan(&currentProjectID, &currentCreatorID)

	if err != nil {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "not found"})
		return
	}

	// Check permission: project owner or task creator
	if currentCreatorID != userID {
		respondJSON(w, http.StatusForbidden, ErrorResponse{Error: "forbidden"})
		return
	}

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
		Priority    *string `json:"priority"`
		AssigneeID  *string `json:"assignee_id"`
		DueDate     *string `json:"due_date"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:  "validation failed",
			Fields: map[string]string{"body": "invalid JSON"},
		})
		return
	}

	// Validate enums
	if req.Status != nil {
		validStatuses := map[string]bool{"todo": true, "in_progress": true, "done": true}
		if !validStatuses[*req.Status] {
			respondJSON(w, http.StatusBadRequest, ErrorResponse{
				Error:  "validation failed",
				Fields: map[string]string{"status": "must be todo, in_progress, or done"},
			})
			return
		}
	}

	if req.Priority != nil {
		validPriorities := map[string]bool{"low": true, "medium": true, "high": true}
		if !validPriorities[*req.Priority] {
			respondJSON(w, http.StatusBadRequest, ErrorResponse{
				Error:  "validation failed",
				Fields: map[string]string{"priority": "must be low, medium, or high"},
			})
			return
		}
	}

	// Build update query
	query := "UPDATE tasks SET updated_at = CURRENT_TIMESTAMP"
	var args []interface{}
	argCount := 1

	if req.Title != nil {
		query += fmt.Sprintf(", title = $%d", argCount)
		args = append(args, *req.Title)
		argCount++
	}
	if req.Description != nil {
		query += fmt.Sprintf(", description = $%d", argCount)
		args = append(args, *req.Description)
		argCount++
	}
	if req.Status != nil {
		query += fmt.Sprintf(", status = $%d", argCount)
		args = append(args, *req.Status)
		argCount++
	}
	if req.Priority != nil {
		query += fmt.Sprintf(", priority = $%d", argCount)
		args = append(args, *req.Priority)
		argCount++
	}
	if req.AssigneeID != nil {
		query += fmt.Sprintf(", assignee_id = $%d", argCount)
		args = append(args, *req.AssigneeID)
		argCount++
	}
	if req.DueDate != nil {
		query += fmt.Sprintf(", due_date = $%d", argCount)
		args = append(args, *req.DueDate)
		argCount++
	}

	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, taskID)

	_, err = db.Exec(context.Background(), query, args...)
	if err != nil {
		logger.Error("Failed to update task", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	// Return updated task
	var task Task
	err = db.QueryRow(context.Background(),
		"SELECT id, title, description, status, priority, project_id, assignee_id, due_date, created_at, updated_at FROM tasks WHERE id = $1",
		taskID).Scan(&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority, &task.ProjectID, &task.AssigneeID, &task.DueDate, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		logger.Error("Failed to fetch updated task", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	respondJSON(w, http.StatusOK, task)
}

func handleDeleteTask(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	taskID := chi.URLParam(r, "id")

	// Get task creator (project owner)
	var projectOwnerID string
	err := db.QueryRow(context.Background(),
		"SELECT (SELECT owner_id FROM projects WHERE id = tasks.project_id) FROM tasks WHERE id = $1",
		taskID).Scan(&projectOwnerID)

	if err != nil {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "not found"})
		return
	}

	// Check permission: project owner or task creator
	if projectOwnerID != userID {
		respondJSON(w, http.StatusForbidden, ErrorResponse{Error: "forbidden"})
		return
	}

	_, err = db.Exec(context.Background(),
		"DELETE FROM tasks WHERE id = $1",
		taskID)

	if err != nil {
		logger.Error("Failed to delete task", "error", err)
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// -------- HELPERS --------

func generateToken(userID, email string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	t, _ := token.SignedString([]byte(jwtSecret))
	return t
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}