# TaskFlow — Backend
 
A minimal but production-quality task management REST API. Users can register, log in, create projects, add tasks, and assign tasks to themselves or others.
 
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Language | Go 1.22 |
| Router | chi |
| Database Driver | pgx v5 |
| Migrations | golang-migrate |
| Auth | golang-jwt, bcrypt (cost 12) |
| Logging | slog (structured) |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, Docker Compose |
 
---
 
## Quick Start (Docker — Recommended)
 
> **Requires**: Docker Desktop installed and running.
 
```bash
# 1. Clone the repo
git clone https://github.com/your-name/taskflow-yourname
cd taskflow-yourname
 
# 2. Copy environment file
cp .env.example .env
 
# 3. Start everything
docker compose up --build
```
 
That's it. The following happens automatically:
- PostgreSQL starts on port 5432
- All database migrations run
- Seed data is inserted
- API server starts on port 8080
 
| Service | URL |
|---|---|
| API | http://localhost:8080 |
| Health Check | http://localhost:8080/health |
 
---
 
## Quick Start (Without Docker)
 
> **Requires**: Go 1.22+ and PostgreSQL 16 installed locally.
 
### 1. Create the database
 
```bash
psql -U postgres -c "CREATE DATABASE taskflow;"
```
 
### 2. Set up environment
 
```bash
cp .env.example .env
```
 
Open `.env` and change `DB_HOST=postgres` to `DB_HOST=localhost`.
 
### 3. Run the backend
 
```bash
cd Backend
go mod tidy
go run ./cmd/api
```
 
Migrations and seed data run automatically on startup.
 
API available at: http://localhost:8080
 
---
 
## Test Credentials
 
Seed data is inserted automatically on first startup:
 
```
Email:    test@example.com
Password: password123
```
 
---
 
## Environment Variables
 
| Variable | Default | Description |
|---|---|---|
| DB_HOST | postgres | Database host (use `localhost` without Docker) |
| DB_PORT | 5432 | Database port |
| DB_USER | postgres | Database user |
| DB_PASSWORD | postgres | Database password |
| DB_NAME | taskflow | Database name |
| DB_SSLMODE | disable | SSL mode |
| JWT_SECRET | changeme | Secret for JWT signing — change in production |
| PORT | 8080 | API server port |
 
---
 
## Running Migrations
 
Migrations run **automatically** on every startup. No manual steps needed.
 
### Migration files
 
```
Backend/migrations/
├── 000001_create_users.up.sql
├── 000001_create_users.down.sql
├── 000002_create_projects.up.sql
├── 000002_create_projects.down.sql
├── 000003_create_tasks.up.sql
└── 000003_create_tasks.down.sql
```
 
### Manual migration commands (optional)
 
```bash
# Connect to running container and run migrations manually
docker exec -it taskflow-api ./migrate \
  -path ./migrations \
  -database "postgres://postgres:postgres@postgres:5432/taskflow?sslmode=disable" up
 
# Rollback last migration
docker exec -it taskflow-api ./migrate \
  -path ./migrations \
  -database "postgres://postgres:postgres@postgres:5432/taskflow?sslmode=disable" down 1
```
 
---
 
## Project Structure
 
```
Backend/
├── Dockerfile
├── go.mod
├── go.sum
├── cmd/
│   └── api/
│       └── main.go          # Entry point, router, graceful shutdown, migrations
├── internal/
│   ├── auth/
│   │   ├── handler.go       # POST /auth/register, POST /auth/login
│   │   └── middleware.go    # JWT Bearer token validation
│   ├── db/
│   │   └── db.go            # PostgreSQL connection pool (pgx)
│   ├── models/
│   │   └── models.go        # Shared domain models (User, Project, Task)
│   ├── project/
│   │   ├── handler.go       # HTTP handlers for projects
│   │   ├── service.go       # Business logic + ownership checks
│   │   ├── repository.go    # SQL queries for projects
│   │   └── owner.go         # GetOwnerID helper
│   └── task/
│       ├── handler.go       # HTTP handlers for tasks
│       ├── service.go       # Business logic + ownership checks
│       └── repository.go    # SQL queries for tasks
└── migrations/
    ├── 000001_create_users.up.sql
    ├── 000001_create_users.down.sql
    ├── 000002_create_projects.up.sql
    ├── 000002_create_projects.down.sql
    ├── 000003_create_tasks.up.sql
    └── 000003_create_tasks.down.sql
```
 
---
 
## API Reference
 
### Base URL
```
http://localhost:8080
```
 
### Authentication
 
**POST /auth/register**
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }
 
// Response 201
{
  "token": "<jwt>",
  "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com", "created_at": "..." }
}
```
 
**POST /auth/login**
```json
// Request
{ "email": "jane@example.com", "password": "secret123" }
 
// Response 200
{
  "token": "<jwt>",
  "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com", "created_at": "..." }
}
```
 
> All endpoints below require `Authorization: Bearer <token>` header.
 
---
 
### Projects
 
| Method | Endpoint | Description |
|---|---|---|
| GET | /projects | List projects user owns or has tasks in |
| POST | /projects | Create a project (owner = current user) |
| GET | /projects/:id | Get project details + its tasks |
| PATCH | /projects/:id | Update name/description (owner only) |
| DELETE | /projects/:id | Delete project + all tasks (owner only) |
 
**POST /projects**
```json
// Request
{ "name": "Website Redesign", "description": "Q2 project" }
 
// Response 201
{ "id": "uuid", "name": "Website Redesign", "description": "Q2 project", "owner_id": "uuid", "created_at": "..." }
```
 
**GET /projects/:id**
```json
// Response 200
{
  "id": "uuid",
  "name": "Website Redesign",
  "owner_id": "uuid",
  "tasks": [
    { "id": "uuid", "title": "Design homepage", "status": "in_progress", "priority": "high" }
  ]
}
```
 
**PATCH /projects/:id**
```json
// Request
{ "name": "Updated Name", "description": "Updated description" }
 
// Response 200 — returns updated project
```
 
**DELETE /projects/:id**
```
// Response 204 No Content
```
 
---
 
### Tasks
 
| Method | Endpoint | Description |
|---|---|---|
| GET | /projects/:id/tasks | List tasks — supports ?status= and ?assignee= filters |
| POST | /projects/:id/tasks | Create a task |
| PATCH | /tasks/:id | Update title, description, status, priority, assignee, due_date |
| DELETE | /tasks/:id | Delete task (project owner or task creator only) |
 
**POST /projects/:id/tasks**
```json
// Request
{
  "title": "Design homepage",
  "description": "Create wireframes",
  "priority": "high",
  "status": "todo",
  "assignee_id": "uuid",
  "due_date": "2026-04-15T00:00:00Z"
}
 
// Response 201
{
  "id": "uuid",
  "title": "Design homepage",
  "status": "todo",
  "priority": "high",
  "project_id": "uuid",
  "created_at": "...",
  "updated_at": "..."
}
```
 
**PATCH /tasks/:id**
```json
// Request — all fields optional
{ "title": "Updated", "status": "done", "priority": "low", "assignee_id": "uuid" }
 
// Response 200 — returns updated task
```
 
**Filter tasks by status:**
```
GET /projects/:id/tasks?status=todo
GET /projects/:id/tasks?status=in_progress
GET /projects/:id/tasks?status=done
```
 
**Filter tasks by assignee:**
```
GET /projects/:id/tasks?assignee=<user-uuid>
```
 
---
 
## API Reference

> 📄 Full API documentation: [View on Google Drive](https://drive.google.com/file/d/18luu4_7vckWKwVL6MCawlsHJE9LLqBXL/view?usp=sharing)

### Error Responses
 
```json
// 400 Validation error
{ "error": "validation failed", "fields": { "title": "is required" } }
 
// 401 Unauthenticated — missing or invalid token
{ "error": "unauthorized" }
 
// 403 Forbidden — authenticated but not the owner
{ "error": "forbidden" }
 
// 404 Not found
{ "error": "not found" }
```
 
---
 
## Useful Docker Commands
 
```bash
# Start everything
docker compose up --build
 
# Start in background
docker compose up --build -d
 
# Stop everything
docker compose down
 
# Stop and wipe database (fresh start)
docker compose down -v
 
# View logs
docker compose logs -f
 
# View only backend logs
docker compose logs -f backend
 
# Open PostgreSQL shell
docker exec -it taskflow-db psql -U postgres -d taskflow
```
 
---
 
## Verify Data in Database
 
```bash
# Connect to database
docker exec -it taskflow-db psql -U postgres -d taskflow
 
# Check users
SELECT id, name, email FROM users;
 
# Check projects
SELECT id, name, owner_id FROM projects;
 
# Check tasks
SELECT id, title, status, priority FROM tasks;
 
# Exit
\q
```
 
---
 
## Architecture Decisions
 
### Handler → Service → Repository pattern
Each layer has a single responsibility. Handlers parse and validate HTTP requests. Services contain business logic and ownership checks. Repositories handle all SQL queries. This makes each layer independently testable and easy to review.
 
### pgx over database/sql
Native PostgreSQL driver with better support for UUIDs, enums, and connection pooling. All queries are plain SQL — no ORM magic, fully explicit and reviewable.
 
### golang-migrate for migrations
Explicit up and down SQL files. Migrations run automatically on startup via `migrate.Up()`. The reviewer can see exactly what SQL runs against the database.
 
### JWT in Authorization header
Stateless authentication. Token includes `user_id` and `email` claims, expires in 24 hours. JWT secret is loaded from `.env` — never hardcoded.
 
### chi router
Lightweight, stdlib-compatible, excellent middleware support. Routes are grouped cleanly — public auth routes separate from protected routes.
 
### slog for structured logging
Standard library structured logging. Every request is logged with method, path, and duration via chi's built-in logger middleware.
 
### Graceful shutdown
API server listens for `SIGTERM` and `SIGINT`. On signal, it stops accepting new connections and waits up to 10 seconds for in-flight requests to complete.
 
### Intentional omissions
- No refresh tokens — JWT expires in 24h, user re-logs in. Acceptable for this scope.
- No rate limiting — would add nginx or middleware-based limiting in production
- No pagination — added `creator_id` to tasks to enforce delete permissions correctly
 
---