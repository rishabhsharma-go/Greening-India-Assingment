package database

import (
	"log/slog"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func Connect(databaseURL string) (*sqlx.DB, error) {
	var db *sqlx.DB
	var err error

	// Retry connection with exponential backoff
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		db, err = sqlx.Connect("postgres", databaseURL)
		if err == nil {
			break
		}
		slog.Warn("Failed to connect to database, retrying...", "attempt", i+1, "error", err)
		time.Sleep(time.Duration(i+1) * time.Second)
	}

	if err != nil {
		return nil, err
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	slog.Info("Successfully connected to database")
	return db, nil
}
