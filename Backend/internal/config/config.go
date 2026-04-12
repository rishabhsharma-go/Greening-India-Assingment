package config

import "os"

type Config struct {
	DBUrl     string
	JWTSecret string
}

func Load() Config {
	return Config{
		DBUrl:     os.Getenv("DB_URL"),
		JWTSecret: os.Getenv("JWT_SECRET"),
	}
}