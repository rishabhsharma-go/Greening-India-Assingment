package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/you/taskflow/backend/internal/auth"
	"github.com/you/taskflow/backend/internal/db"
	"github.com/you/taskflow/backend/internal/project"
	"github.com/you/taskflow/backend/internal/task"
)

func main() {
	_ = godotenv.Load()

	runMigrations()

	ctx := context.Background()
	pool, err := db.New(ctx)
	if err != nil {
		slog.Error("connect to database", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	projectRepo := project.NewRepository(pool)
	projectSvc := project.NewService(projectRepo)

	taskRepo := task.NewRepository(pool)
	taskSvc := task.NewService(taskRepo, projectRepo)

	authHandler := auth.NewHandler(pool)
	projectHandler := project.NewHandler(projectSvc, taskSvc)
	taskHandler := task.NewHandler(taskSvc)

	// Router
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Public routes
	r.Post("/auth/register", authHandler.Register)
	r.Post("/auth/login", authHandler.Login)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware)

		r.Get("/projects", projectHandler.List)
		r.Post("/projects", projectHandler.Create)
		r.Get("/projects/{id}", projectHandler.Get)
		r.Patch("/projects/{id}", projectHandler.Update)
		r.Delete("/projects/{id}", projectHandler.Delete)

		r.Get("/projects/{id}/tasks", taskHandler.List)
		r.Post("/projects/{id}/tasks", taskHandler.Create)

		r.Patch("/tasks/{id}", taskHandler.Update)
		r.Delete("/tasks/{id}", taskHandler.Delete)
	})

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	port := getEnv("PORT", "8080")
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		slog.Info("server starting", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-quit
	slog.Info("shutting down gracefully")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "err", err)
	}
	slog.Info("server stopped")
}

func runMigrations() {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PASSWORD", "postgres"),
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_NAME", "taskflow"),
		getEnv("DB_SSLMODE", "disable"),
	)

	m, err := migrate.New("file://migrations", dsn)
	if err != nil {
		slog.Error("migration init", "err", err)
		os.Exit(1)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		slog.Error("migration up", "err", err)
		os.Exit(1)
	}

	slog.Info("migrations applied")

	// Run seed
	runSeed()
}

func runSeed() {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", "postgres"),
		getEnv("DB_NAME", "taskflow"),
		getEnv("DB_SSLMODE", "disable"),
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		slog.Warn("seed: could not open db", "err", err)
		return
	}
	defer db.Close()

	seed := `
	INSERT INTO users (id, name, email, password) VALUES
	  ('00000000-0000-0000-0000-000000000001', 'Test User', 'test@example.com',
	   '$2a$12$oLoMbOmPE/JqxHkm.S7P7.qFhxUVmhMTq9s4UJMXv2h7zVzEEMqEe')
	ON CONFLICT DO NOTHING;

	INSERT INTO projects (id, name, description, owner_id) VALUES
	  ('00000000-0000-0000-0000-000000000002', 'Demo Project', 'Seeded project',
	   '00000000-0000-0000-0000-000000000001')
	ON CONFLICT DO NOTHING;

	INSERT INTO tasks (title, status, priority, project_id, creator_id) VALUES
	  ('Set up CI pipeline',  'todo',        'high',
	   '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
	  ('Write API tests',     'in_progress', 'medium',
	   '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
	  ('Deploy to staging',   'done',        'low',
	   '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001')
	ON CONFLICT DO NOTHING;
	`

	if _, err := db.Exec(seed); err != nil {
		slog.Warn("seed: could not run seed", "err", err)
		return
	}
	slog.Info("seed data applied")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
