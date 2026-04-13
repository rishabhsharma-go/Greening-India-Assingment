package server

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"

	"github.com/swaroop/taskflow/internal/config"
	"github.com/swaroop/taskflow/internal/database"
	"github.com/swaroop/taskflow/internal/handlers"
	"github.com/swaroop/taskflow/internal/middleware"
)

// New builds and returns the fully wired HTTP router.
func New(cfg *config.Config, db *database.DB, log *slog.Logger) http.Handler {
	r := chi.NewRouter()

	// Global middleware — order matters
	r.Use(middleware.CORS)
	r.Use(middleware.Logger(log))
	r.Use(middleware.Recoverer(log))
	r.Use(chiMiddleware.RequestID)

	// Instantiate handlers with their dependencies
	authH := handlers.NewAuthHandler(db, cfg.JWTSecret, cfg.JWTExpiry, log)
	projectH := handlers.NewProjectHandler(db, log)
	taskH := handlers.NewTaskHandler(db, log)

	// Health check — useful for Docker / k8s liveness probes
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// ── Public routes ──────────────────────────────────────────────────────────
	r.Post("/auth/register", authH.Register)
	r.Post("/auth/login", authH.Login)

	// ── Protected routes ───────────────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(middleware.Authenticate(cfg.JWTSecret))

		// Projects
		r.Get("/projects", projectH.List)
		r.Post("/projects", projectH.Create)
		r.Get("/projects/{id}", projectH.Get)
		r.Patch("/projects/{id}", projectH.Update)
		r.Delete("/projects/{id}", projectH.Delete)
		r.Get("/projects/{id}/stats", projectH.Stats)

		// Tasks nested under a project
		r.Get("/projects/{id}/tasks", taskH.List)
		r.Post("/projects/{id}/tasks", taskH.Create)

		// Task operations by task ID (not nested)
		r.Patch("/tasks/{id}", taskH.Update)
		r.Delete("/tasks/{id}", taskH.Delete)
	})

	return r
}
