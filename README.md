# TaskFlow

A backend REST API for task management built with Go and PostgreSQL. Users can register, log in, create projects, add tasks, and assign them.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Running Locally](#running-locally)
4. [Running Migrations](#running-migrations)
5. [Test Credentials](#test-credentials)
6. [API Reference](#api-reference)
7. [What You'd Do With More Time](#what-youd-do-with-more-time)

---

## Overview

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | Go 1.23, `chi` router, `database/sql` + `lib/pq` |
| Auth       | JWT (HS256, 24 h expiry), bcrypt cost=12        |
| Database   | PostgreSQL 16, `golang-migrate` (embedded)      |
| Container  | Docker multi-stage build, docker-compose        |

### Features

- User registration & login with JWT authentication
- Project CRUD (owner-scoped)
- Task CRUD with status (`todo` / `in_progress` / `done`), priority (`low` / `medium` / `high`), assignee, and due date
- Pagination on all list endpoints (`?page=&limit=`)
- `GET /projects/:id/stats` — task counts by status and assignee
- Structured JSON logging (`slog`)
- Graceful shutdown on `SIGTERM`
- Idempotent DB migrations run automatically on startup

---

## Architecture Decisions

### Go backend structure

```
backend/
├── cmd/api/main.go          # entry point — wires everything together
├── internal/
│   ├── config/              # env-based config, panics on missing JWT_SECRET
│   ├── models/              # pure data types, no DB logic
│   ├── auth/                # JWT sign/validate
│   ├── database/            # sql.DB wrapper + all query methods
│   ├── middleware/           # CORS, auth, structured logger, recoverer
│   ├── handlers/            # HTTP handlers; one file per resource group
│   └── server/              # chi router wiring
└── migrations/              # embedded SQL files (golang-migrate iofs driver)
```

**Why `database/sql` + `lib/pq` instead of `pgx` or an ORM?**  
The standard library interface is familiar, widely understood, and easy to test with `sql.DB` mocks. An ORM would hide the SQL, which matters in a code review — reviewers can read the queries directly. `pgx` is faster but the difference is invisible at this scale.

**Why embed migrations in the binary?**  
No external files to mount or forget. The binary is self-contained: run it, it migrates, it serves. `golang-migrate` with the `iofs` source driver makes this three lines of code.

**Why chi instead of the standard `http.ServeMux`?**  
`chi` gives us URL parameters (`{id}`), middleware chaining, and route groups with zero reflection — it compiles to the same interface. It's idiomatic and well-maintained.

**Why structured `slog` logging?**  
`slog` ships in the Go standard library since 1.21. JSON output integrates with any log aggregator (Datadog, Loki, CloudWatch) without extra dependencies.

### Docker

- Multi-stage `backend/Dockerfile`: Go builder → distroless/static runtime (~8 MB image).
- The `seed` service uses the official postgres image to run seed SQL once, then exits — no custom code needed.

### Deliberate omissions

- **Rate limiting** — would add `golang.org/x/time/rate` on the auth endpoints in production.
- **Refresh tokens** — 24 h JWTs are acceptable for a take-home; real products need rotation.
- **Input sanitisation beyond trimming** — the API validates and trims inputs at boundaries; HTML escaping is the consumer's responsibility.
- **Soft deletes** — the schema uses hard deletes. Audit trails would require an `archived_at` column and updated queries.

---

## Running Locally

**Prerequisites**: Docker and Docker Compose (bundled with Docker Desktop).  
Nothing else is required — Go is only needed inside the container.

```bash
# 1. Clone
git clone https://github.com/swaroop/taskflow
cd taskflow

# 2. Create your .env (edit JWT_SECRET — everything else has safe defaults)
cp .env.example .env
# On Linux/macOS you can generate a secret with:
#   openssl rand -hex 32
# On Windows PowerShell:
#   -join ((1..32) | ForEach { '{0:x2}' -f (Get-Random -Maximum 256) })

# 3. Start everything
docker compose up --build

# API:  http://localhost:4000/health
```

First startup takes ~1-2 minutes (Go compile). Subsequent starts are cached and fast.

To stop:
```bash
docker compose down          # keep DB volume
docker compose down -v       # also wipe DB
```

---

## Running Migrations

Migrations run **automatically** when the API container starts.  
They are embedded inside the binary via Go's `embed` package and executed by `golang-migrate` before the HTTP server opens.

To roll back manually (requires `golang-migrate` CLI):
```bash
# Install: https://github.com/golang-migrate/migrate/releases
migrate -path backend/migrations \
        -database "postgres://taskflow:changeme@localhost:5432/taskflow?sslmode=disable" \
        down 1
```

---

## Test Credentials

Seed data is loaded automatically by the `seed` docker-compose service on first start.

| Field    | Value             |
|----------|-------------------|
| Email    | `test@example.com` |
| Password | `password123`     |

A second user (`jane@example.com` / `password123`) is also seeded, along with a sample project and three tasks in different statuses.

---

## API Reference

**Base URL**: `http://localhost:4000`  
All endpoints return `Content-Type: application/json`.  
Protected endpoints require `Authorization: Bearer <token>`.

### Auth

#### POST `/auth/register`
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }

// 201 Created
{ "token": "<jwt>", "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "created_at": "..." } }
```

#### POST `/auth/login`
```json
// Request
{ "email": "jane@example.com", "password": "secret123" }

// 200 OK
{ "token": "<jwt>", "user": { ... } }
```

### Projects

#### GET `/projects?page=1&limit=12`
Returns projects the user owns or has tasks assigned to them in.
```json
{
  "projects": [ { "id": "...", "name": "...", "description": "...", "owner_id": "...", "created_at": "..." } ],
  "meta": { "page": 1, "limit": 12, "total": 5, "has_next": false }
}
```

#### POST `/projects`
```json
// Request
{ "name": "Website Redesign", "description": "Q2 project" }
// 201 Created — project object
```

#### GET `/projects/:id`
Returns the project with all its tasks embedded.

#### PATCH `/projects/:id` *(owner only)*
```json
{ "name": "Updated Name", "description": "New description" }
// 200 OK — updated project
```

#### DELETE `/projects/:id` *(owner only)*
`204 No Content`. Cascades to all tasks.

#### GET `/projects/:id/stats`
```json
{
  "project_id": "...",
  "by_status":  { "todo": 2, "in_progress": 1, "done": 3 },
  "by_assignee": { "uuid-1": 3, "unassigned": 3 }
}
```

### Tasks

#### GET `/projects/:id/tasks?status=todo&assignee=uuid&page=1&limit=50`

#### POST `/projects/:id/tasks`
```json
{
  "title": "Design homepage",
  "description": "Wireframes first",
  "priority": "high",
  "assignee_id": "uuid",
  "due_date": "2026-04-15"
}
// 201 Created — task object
```

#### PATCH `/tasks/:id`
All fields optional. Send `"assignee_id": null` to clear the assignee.
```json
{ "status": "done", "priority": "low" }
// 200 OK — updated task
```

#### DELETE `/tasks/:id` *(project owner or task assignee)*
`204 No Content`

### Error Responses

| Status | Body |
|--------|------|
| 400    | `{ "error": "validation failed", "fields": { "email": "is required" } }` |
| 401    | `{ "error": "unauthorized" }` |
| 403    | `{ "error": "forbidden" }` |
| 404    | `{ "error": "not found" }` |
| 500    | `{ "error": "internal server error" }` |

---

## What You'd Do With More Time

**Security**
- Add per-IP rate limiting on auth endpoints (`x/time/rate` token bucket)
- Rotate JWT with short-lived access tokens + refresh token rotation
- CSRF protection if using cookies instead of Bearer tokens
- `helmet`-style security headers on the API

**Data & API**
- Soft deletes + an audit log table for compliance use cases
- Full-text task search (`pg_trgm` GIN index on `title || ' ' || description`)
- WebSocket or SSE for real-time board updates across browser tabs
- File attachments on tasks (S3/MinIO + presigned URLs)
- Project member roles (viewer / editor / admin) instead of binary owner/non-owner

**Operations**
- GitHub Actions CI: `go test ./...`, `go vet`, `golangci-lint`, `npm run build`
- Kubernetes manifests / Helm chart
- Prometheus metrics endpoint (`/metrics`) + Grafana dashboard
- Structured error tracking (Sentry)
- Proper secrets management (Vault or AWS Secrets Manager instead of `.env`)

**Shortcuts taken**
- No integration tests are included — a production service would have at minimum auth and task CRUD covered.
