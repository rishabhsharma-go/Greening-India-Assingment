.PHONY: up down build seed migrate logs

up:
	docker compose up --build

down:
	docker compose down

build:
	docker compose build

seed:
	docker compose exec -T db psql -U $${POSTGRES_USER:-taskflow} -d $${POSTGRES_DB:-taskflow} < backend/seed/seed.sql

migrate:
	docker compose exec backend ./server

logs:
	docker compose logs -f

clean:
	docker compose down -v
