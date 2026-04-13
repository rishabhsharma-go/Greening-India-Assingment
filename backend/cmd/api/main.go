package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/swaroop/taskflow/internal/config"
	"github.com/swaroop/taskflow/internal/database"
	"github.com/swaroop/taskflow/internal/server"
)

func main() {
	// Load .env in development; in production env vars are injected by Docker / k8s.
	// Ignore the error — the file is optional in containerised environments.
	_ = godotenv.Load()

	// Structured JSON logging — easy to parse in production log aggregators.
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(log)

	cfg := config.Load()

	// ── Database ────────────────────────────────────────────────────────────────
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	log.Info("database connection established")

	// Run embedded migrations on every startup — idempotent, safe.
	if err := database.RunMigrations(db); err != nil {
		log.Error("database migration failed", "error", err)
		os.Exit(1)
	}
	log.Info("database migrations applied")

	// ── HTTP Server ─────────────────────────────────────────────────────────────
	httpServer := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      server.New(cfg, db, log),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start in background so we can listen for signals below.
	go func() {
		log.Info("server listening", "addr", httpServer.Addr, "env", cfg.Env)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// ── Graceful Shutdown ───────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Info("shutdown signal received", "signal", sig.String())

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Error("graceful shutdown failed", "error", err)
	} else {
		log.Info("server shut down cleanly")
	}
}
