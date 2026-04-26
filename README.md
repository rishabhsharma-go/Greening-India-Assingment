# TaskFlow

TaskFlow is a REST API for a task management application built in Go. It lets authenticated users create projects, invite collaborators, assign tasks, and track work through a simple status lifecycle — `todo → in_progress → done`. The API exposes 13 HTTP endpoints secured with JWT authentication.

**Tech stack:** Go 1.22, Gin, GORM v2, PostgreSQL 16, golang-migrate, Uber FX, Viper, Logrus, JWT (HS256), bcrypt, Docker

---

## Architecture Decisions

I made a few deliberate choices here that are worth explaining:

**Gin over net/http** — Gin's middleware chain made it easy to plug in auth, request ID injection, and panic recovery without writing boilerplate. It's also fast enough that I didn't need to think about it.

**GORM with SQL migrations instead of AutoMigrate** — AutoMigrate is convenient for prototypes but loses control over the schema over time. I disabled it and let `golang-migrate` own the schema through versioned SQL files. This makes rollbacks explicit and auditable.

**golang-migrate embedded via embed.FS** — Migration files are compiled into the binary itself. This means the Docker image is fully self-contained — no mounted volumes, no migration sidecars. On every startup, the binary applies any pending migrations automatically.

**Uber FX for dependency injection** — FX gives you constructor-based wiring with interface annotations. It feels verbose at first but pays off in testability — you can swap any layer (DAO, service, logger) without touching the wiring code.

**panic/recover for error handling** — Each handler defers a `HandleErrorPanics` middleware that catches typed `CustomError` panics and maps them to structured JSON responses with error codes (`TF-400` through `TF-500`). This keeps handler code clean — no repetitive `if err != nil` blocks.

**What I intentionally left out:**
- Refresh tokens — the 24h JWT window was acceptable for this scope
- Soft deletes — hard deletes are simpler to reason about; soft deletes need careful filtering everywhere
- Role-based membership — the owner/assignee model covers the core use case; a `project_members` table would be the next step

---

## Running Locally

The only prerequisite is Docker. Nothing else needs to be installed.

```bash
git clone https://github.com/Siddharth-Sharma1327/taskflow-SiddharthSharma.git
cd taskflow-SiddharthSharma
cp .env.example .env
docker compose up --build
```

The API will be available at `http://localhost:8080`.

The server runs schema migrations automatically on startup — there is no separate migration step. Once the containers are up, the database is ready.

> **Note:** If you want to pre-load seed data (test user + demo project + 3 tasks), run the seed command after the stack is up — see the [Running Migrations](#running-migrations) section below.

---

## Running Migrations

Migrations run automatically every time the API container starts. The migration files are embedded inside the binary using Go's `embed.FS`, so there is no external tooling required.

Migration files live in `backend/migrations/` and follow the `golang-migrate` naming convention:

```
000001_create_users.up.sql   / 000001_create_users.down.sql
000002_create_projects.up.sql / 000002_create_projects.down.sql
000003_create_tasks.up.sql   / 000003_create_tasks.down.sql
```

Both `up` and `down` migrations exist for every version.

**Seed data** is not applied automatically (it would conflict on repeated restarts). To load it once after the stack is running:

```bash
cat backend/migrations/seed.sql | docker compose exec -T postgres psql -U postgres -d postgres
```

This inserts a test user, a demo project, and 3 tasks with different statuses.

---

## Test Credentials

The seed script creates the following test account:

| Field      | Value               |
|------------|---------------------|
| Email      | `test@example.com`  |
| Password   | `password123`       |
| Project ID | `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22` |

Use `POST /auth/login` to get a JWT token, then pass it as `Authorization: Bearer <token>` on all protected endpoints.

A Postman collection is included at `backend/postman_collection.json` — import it to get all endpoints pre-configured with auto-token saving on login.

---

## API Reference

All protected endpoints require the header `Authorization: Bearer <token>`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Create account → `201` with token + user |
| `POST` | `/auth/login` | No | Login → `200` with token + user |

**Register / Login request:**
```json
{ "name": "Alice", "email": "alice@example.com", "password": "password123" }
```

**Response:**
```json
{
  "token": "<jwt>",
  "user": { "id": "<uuid>", "name": "Alice", "email": "alice@example.com", "created_at": "..." }
}
```

**Validation error shape:**
```json
{ "error": "validation failed", "fields": { "email": "must be a valid email" } }
```

---

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects` | Yes | List projects you own or are assigned to. Supports `?page=1&limit=20` |
| `POST` | `/projects` | Yes | Create a project → `201`. You become the owner |
| `GET` | `/projects/:id` | Yes | Get project detail with its tasks |
| `PATCH` | `/projects/:id` | Yes | Update name or description. Owner only |
| `DELETE` | `/projects/:id` | Yes | Delete project and all tasks. Owner only → `204` |
| `GET` | `/projects/:id/stats` | Yes | Task counts grouped by status and assignee |

**Create project body:**
```json
{ "name": "My Project", "description": "Optional description" }
```

**Stats response:**
```json
{ "by_status": { "todo": 1, "in_progress": 1, "done": 1 }, "by_assignee": { "<uuid>": 2 } }
```

---

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects/:id/tasks` | Yes | List tasks. Supports `?status=todo&assignee_id=<uuid>&page=1&limit=20` |
| `POST` | `/projects/:id/tasks` | Yes | Create a task. Project owner only → `201` |
| `PATCH` | `/tasks/:id` | Yes | Partial update. Owner or assignee can update |
| `DELETE` | `/tasks/:id` | Yes | Delete task. Project owner only → `204` |

**Create task body:**
```json
{
  "title": "Fix the bug",
  "description": "Optional",
  "status": "todo",
  "priority": "high",
  "assignee_id": "<user-uuid-or-omit>",
  "due_date": "2025-12-31"
}
```

**Task response:**
```json
{
  "id": "<uuid>",
  "title": "Fix the bug",
  "status": "todo",
  "priority": "high",
  "project_id": "<uuid>",
  "assignee_id": "<uuid>",
  "due_date": "2025-12-31",
  "created_at": "...",
  "updated_at": "..."
}
```

**Error codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| TF-400 | 400 | Validation failed |
| TF-401 | 401 | Missing or invalid token |
| TF-403 | 403 | Not the owner or assignee |
| TF-404 | 404 | Resource not found |
| TF-500 | 500 | Internal server error |

---

## Running Integration Tests

Integration tests run against a real database with no mocking. They create and clean up their own data (all test emails end in `@int.test`).

```bash
# Postgres must be running first
docker compose up -d postgres

cd backend
go test ./tests/integration/ -v -count=1
```

---

## Improvements that can be done

**Soft deletes & transactions for atomicity** - Right now deleting a project hard-deletes everything. Adding `deleted_at` would make data recovearble and is always the right way to do in a production app.

**Idempotency keys** - To avoid duplicate request processing across multiple PODs

**Caching** - Can cache in Redis for projects with large number of tasks and assignees with frequent API hits. 

**Integrate Google auth/ Mobile OTP to avoid password based authentications** - Right now deleting a project hard-deletes everything. Adding `deleted_at` would make data recoverable. Using Twilio or google auth for easier login and avoid dependency only on password 

**Refresh tokens** - The current 24h JWT is stateless and can't be revoked. A proper auth flow would pair short-lived access tokens with refresh tokens stored in the DB, so you can log users out server-side.

**Role-based project membership** - The owner/assignee model is a simplification. A `project_members` table with roles (viewer, editor, admin) would give much finer control.

**Audit Log** - Can keep separate records of projects and  tasks in table for role based access to the users and their actions

**Cursor-based pagination** - The current offset pagination is simple but gives inconsistent results under concurrent writes. Keyset pagination solves this cleanly.

**Rate limiting** - The auth endpoints have no throttling. Per-IP limits on `/auth/login` and `/auth/register` needed and login attempts per time window to avoid generating multiple tokens/OTPs in small amount of time.

**Request tracing** - There's already a `request_id` injected by middleware, but it doesn't propagate into DB queries or sub-calls. Wiring it through with OpenTelemetry we can track whole journey of a request and and time it took to travel in this service with `trace_id` and `span_id`.

**OpenAPI spec** - The Postman collection covers it for now, but generating an OpenAPI spec from code (via swaggo) would keep documentation in sync automatically.


## Short-cuts that I took

Set up base repo from source code similar project that I have built
Used AI agents for design discussions, research, debugging errors and generating helping documents

