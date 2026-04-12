package db

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func Init(dbUrl string) {
	pool, err := pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		log.Fatal("DB connection failed:", err)
	}
	DB = pool
}