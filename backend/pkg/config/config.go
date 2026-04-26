package config

import "github.com/spf13/viper"

type Config struct {
	ServerPort string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	JWTSecret  string
	LogLevel   string
}

func LoadConfig() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	viper.AutomaticEnv()

	viper.SetDefault("SERVER_PORT", ":8080")
	viper.SetDefault("POSTGRES_PORT", "5432")
	viper.SetDefault("POSTGRES_SSLMODE", "disable")
	viper.SetDefault("LOG_LEVEL", "info")

	_ = viper.ReadInConfig()

	return &Config{
		ServerPort: viper.GetString("SERVER_PORT"),
		DBHost:     viper.GetString("POSTGRES_HOST"),
		DBPort:     viper.GetString("POSTGRES_PORT"),
		DBUser:     viper.GetString("POSTGRES_USER"),
		DBPassword: viper.GetString("POSTGRES_PASSWORD"),
		DBName:     viper.GetString("POSTGRES_DB"),
		DBSSLMode:  viper.GetString("POSTGRES_SSLMODE"),
		JWTSecret:  viper.GetString("JWT_SECRET"),
		LogLevel:   viper.GetString("LOG_LEVEL"),
	}, nil
}
