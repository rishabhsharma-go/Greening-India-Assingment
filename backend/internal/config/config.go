package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	JWTExpiry   int // hours
	Env         string
}

// Load reads configuration from environment variables with sensible defaults.
// It panics if required secrets are missing in non-development environments.
func Load() *Config {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("JWT_SECRET environment variable is required")
	}

	return &Config{
		Port:        getEnv("PORT", "4000"),
		DatabaseURL: buildDatabaseURL(),
		JWTSecret:   secret,
		JWTExpiry:   getEnvInt("JWT_EXPIRY_HOURS", 24),
		Env:         getEnv("APP_ENV", "development"),
	}
}

func buildDatabaseURL() string {
	// Prefer a fully formed DATABASE_URL if provided
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
	}

	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	pass := getEnv("DB_PASSWORD", "postgres")
	name := getEnv("DB_NAME", "taskflow")
	ssl := getEnv("DB_SSLMODE", "disable")

	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		user, pass, host, port, name, ssl,
	)
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
}
