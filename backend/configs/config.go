package configs

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type DatabaseConfig struct {
	URL string
}

type ApplicationConfig struct {
	Port        int
	JWTSecret   string
	CORSOrigin  string
}

type Config struct {
	Database DatabaseConfig
	App      ApplicationConfig
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	port := getEnvAsIntWithDefault("PORT", 8080)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	return &Config{
		Database: DatabaseConfig{
			URL: dbURL,
		},
		App: ApplicationConfig{
			Port:       port,
			JWTSecret:  jwtSecret,
			CORSOrigin: getEnvWithDefault("CORS_ORIGIN", "*"),
		},
	}, nil
}

func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}
	return cfg
}

func getEnvWithDefault(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

func getEnvAsIntWithDefault(key string, defaultValue int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultValue
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return defaultValue
	}
	return n
}
