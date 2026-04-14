package configs

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type DatabaseConfig struct {
	URL string
}

type ApplicationConfig struct {
	Port            int
	JWTSecret       string
	CORSOrigins     []string
	CORSCredentials bool
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
			Port:            port,
			JWTSecret:       jwtSecret,
			CORSOrigins:     parseCORSOrigins(getEnvWithDefault("CORS_ORIGIN", "*")),
			CORSCredentials: shouldAllowCORSCredentials(getEnvWithDefault("CORS_ORIGIN", "*")),
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

func parseCORSOrigins(value string) []string {
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	if len(origins) == 0 {
		return []string{"*"}
	}
	return origins
}

func shouldAllowCORSCredentials(value string) bool {
	for _, origin := range parseCORSOrigins(value) {
		if origin == "*" {
			return false
		}
	}
	return true
}
