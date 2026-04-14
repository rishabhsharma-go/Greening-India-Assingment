# TaskFlow

A full-stack task management system where teams can organize work into projects, create and assign tasks, and track progress on a drag-and-drop kanban board. Built with Go, React, and PostgreSQL.

## Tech Stack

- **Backend:** Go 1.25, Gin, pgx, golang-migrate, JWT (golang-jwt), bcrypt
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack React Query, React Router v7, @dnd-kit
- **Database:** PostgreSQL 16
- **Infrastructure:** Docker, docker-compose, multi-stage builds, nginx

The frontend uses lightweight custom components built on native HTML elements with Tailwind and CVA for variants — no heavy UI library dependency.

## Architecture Decisions

The backend follows a **hexagonal architecture** (ports & adapters):

```
backend/
  cmd/server/          → entry point, migration runner, seed loader
  configs/             → env-based configuration with godotenv
  internal/
    domain/            → entities, repository interfaces, domain errors (zero deps)
    service/           → business logic (auth, project, task orchestration)
    infra/
      postgres/        → repository implementations using pgx
      errors/          → AppError / ServerError types
      util/            → context helpers
    port/http/
      handler/         → HTTP handlers (request/response mapping)
      middleware/       → JWT auth, global error handler, request logger
      router.go        → route registration with CORS
  migrations/          → versioned SQL (up + down)
  seed/                → test data
```

**Why this structure:**

- Domain layer has zero external dependencies — pure business types and interfaces. Easy to test, easy to reason about.
- Services own business rules (ownership checks, authorization); handlers just translate HTTP to domain calls.
- Global error handler middleware means handlers call `abort(c, err)` and the middleware formats AppError/ServerError/ValidationError responses consistently — no duplicate error formatting logic.
- Repository interfaces in domain make it straightforward to swap implementations or mock for testing.

**Tradeoffs:**

- No sqlc — wrote raw SQL in repositories directly. For a project this size, the overhead of code generation setup wasn't worth it.
- No Redis / caching — JWT is stateless so no session store needed. Good enough for the scope.
- Pagination uses offset, not cursors. Works fine at this data scale.

## Running Locally

```bash
git clone <repo-url>
cd taskflow
cp .env.example .env
docker compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080

That's it. Migrations, seed data, and the full stack spin up automatically. The database resets on every restart so you always get fresh seed data.

## Running Migrations

Migrations run automatically when the backend container starts — no manual steps needed. The backend uses golang-migrate to apply all pending migrations on boot before starting the HTTP server.

## Test Credentials

Two seed accounts are available immediately after startup:

| Name        | Email            | Password    |
| ----------- | ---------------- | ----------- |
| Alex Morgan | test@example.com | password123 |
| Jane Doe    | jane@example.com | secret123   |

The seed also creates 3 projects and 16 tasks across all statuses, priorities, and assignees so you can see the full UI immediately.

## API Reference

All endpoints return JSON. Protected endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint         | Description         |
| ------ | ---------------- | ------------------- |
| POST   | `/auth/register` | Register a new user |
| POST   | `/auth/login`    | Login, returns JWT  |

**Register:**

```json
// POST /auth/register
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }

// 201
{ "token": "eyJ...", "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

**Login:**

```json
// POST /auth/login
{ "email": "jane@example.com", "password": "secret123" }

// 200
{ "token": "eyJ...", "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

### Projects

| Method | Endpoint                | Description                                                          |
| ------ | ----------------------- | -------------------------------------------------------------------- |
| GET    | `/projects`             | List projects (owned or assigned tasks). Supports `?page=` `?limit=` |
| POST   | `/projects`             | Create project                                                       |
| GET    | `/projects/:id`         | Get project with tasks                                               |
| PATCH  | `/projects/:id`         | Update project (owner only)                                          |
| DELETE | `/projects/:id`         | Delete project and tasks (owner only)                                |
| GET    | `/projects/:id/stats`   | Task counts by status and assignee                                   |
| GET    | `/projects/:id/members` | Users involved in project (owner + assignees)                        |

### Tasks

| Method | Endpoint              | Description                                                                      |
| ------ | --------------------- | -------------------------------------------------------------------------------- |
| GET    | `/projects/:id/tasks` | List tasks. Supports `?status=`, `?priority=`, `?assignee=`, `?page=`, `?limit=` |
| POST   | `/projects/:id/tasks` | Create task                                                                      |
| PATCH  | `/tasks/:id`          | Update task                                                                      |
| DELETE | `/tasks/:id`          | Delete task (project owner or task creator)                                      |

### Users

| Method | Endpoint           | Description                   |
| ------ | ------------------ | ----------------------------- |
| GET    | `/users/search?q=` | Search users by name or email |

### Error Responses

```json
// 400
{ "error": "validation failed", "fields": { "email": "is required" } }

// 401
{ "error": "unauthorized" }

// 403
{ "error": "forbidden" }

// 404
{ "error": "not found" }
```

## What I'd Do With More Time

- **Integration tests** — at minimum for the auth flow and task CRUD. Would use testcontainers for a real Postgres instance rather than mocking.
- **sqlc** — auto-generate the database layer from SQL queries. Eliminates hand-written Scan() calls and catches SQL bugs at compile time.
- **Real-time updates** via WebSocket or SSE so task changes propagate instantly across browser tabs and users.
- **Rate limiting** on auth endpoints to prevent brute force.
- **Request IDs** propagated through slog for distributed tracing.
- **E2E tests** with Playwright covering the login → create project → add task → drag to done flow.
- **Better mobile drag-and-drop** — @dnd-kit works on touch but the kanban columns could use a mobile-specific layout (horizontal scroll or stacked accordion).
