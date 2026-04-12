package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServerPort     string
	DatabaseURL    string
	JWTSecret      string
	JWTExpiryHours int
	BcryptCost     int
}

func Load() *Config {
	jwtExpiry, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	bcryptCost, _ := strconv.Atoi(getEnv("BCRYPT_COST", "12"))

	return &Config{
		ServerPort:     getEnv("SERVER_PORT", "8080"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/taskflow?sslmode=disable"),
		JWTSecret:      getEnv("JWT_SECRET", ""),
		JWTExpiryHours: jwtExpiry,
		BcryptCost:     bcryptCost,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
