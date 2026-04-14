package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/dhruva/taskflow/backend/configs"
	"github.com/dhruva/taskflow/backend/internal/infra/postgres"
	httpport "github.com/dhruva/taskflow/backend/internal/port/http"
	"github.com/dhruva/taskflow/backend/internal/port/http/handler"
	"github.com/dhruva/taskflow/backend/internal/port/http/middleware"
	"github.com/dhruva/taskflow/backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := configs.MustLoad()

	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, cfg.Database.URL)
	if err != nil {
		log.Fatal("failed to connect to database:", err)
	}
	defer dbpool.Close()

	if err := dbpool.Ping(ctx); err != nil {
		log.Fatal("failed to ping database:", err)
	}
	slog.Info("database connected")

	runMigrations(cfg.Database.URL)
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		slog.Info("migration command completed")
		return
	}
	runSeed(dbpool)

	// Repositories
	userRepo := postgres.NewUserRepository(dbpool)
	projectRepo := postgres.NewProjectRepository(dbpool)
	taskRepo := postgres.NewTaskRepository(dbpool)

	// Services
	authService := service.NewAuthService(userRepo, cfg.App.JWTSecret)
	projectService := service.NewProjectService(projectRepo, taskRepo, userRepo)
	taskService := service.NewTaskService(taskRepo, projectRepo)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	projectHandler := handler.NewProjectHandler(projectService)
	taskHandler := handler.NewTaskHandler(taskService)
	userHandler := handler.NewUserHandler(userRepo)

	authMiddleware := middleware.NewAuthMiddleware(authService)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	httpport.SetupRouter(r, httpport.Handlers{
		Auth:    authHandler,
		Project: projectHandler,
		Task:    taskHandler,
		User:    userHandler,
	}, authMiddleware, cfg.App.CORSOrigins, cfg.App.CORSCredentials)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.App.Port),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("server started", "port", cfg.App.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server error:", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal("forced shutdown:", err)
	}
	slog.Info("server stopped")
}

func runMigrations(dbURL string) {
	// golang-migrate pgx5 driver expects pgx5:// scheme
	migrateURL := dbURL
	if strings.HasPrefix(migrateURL, "postgres://") {
		migrateURL = "pgx5://" + strings.TrimPrefix(migrateURL, "postgres://")
	} else if strings.HasPrefix(migrateURL, "postgresql://") {
		migrateURL = "pgx5://" + strings.TrimPrefix(migrateURL, "postgresql://")
	}

	m, err := migrate.New("file://migrations", migrateURL)
	if err != nil {
		log.Fatal("failed to create migrator:", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal("migration failed:", err)
	}
	slog.Info("migrations applied")
}

func runSeed(pool *pgxpool.Pool) {
	seed, err := os.ReadFile("seed/seed.sql")
	if err != nil {
		slog.Warn("seed file not found, skipping")
		return
	}
	if _, err := pool.Exec(context.Background(), string(seed)); err != nil {
		slog.Warn("seed execution failed (may already be seeded)", "error", err)
	} else {
		slog.Info("seed data applied")
	}
}
