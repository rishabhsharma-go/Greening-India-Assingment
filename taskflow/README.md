# TaskFlow

A full-stack task management application where users can register, log in, create projects, add tasks, and collaborate with team members through real-time updates.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture Decisions](#architecture-decisions)
- [Running Locally](#running-locally)
- [Test Credentials](#test-credentials)
- [API Reference](#api-reference)
- [WebSocket API](#websocket-api)
- [Project Structure](#project-structure)
- [What I'd Do With More Time](#what-id-do-with-more-time)

---

## Overview

**TaskFlow** is a minimal but production-ready task management system built as a full-stack application. It demonstrates:

- RESTful API design with Go
- React frontend with TypeScript
- Real-time collaboration via WebSockets
- Docker containerization with multi-stage builds
- PostgreSQL database with proper migrations

Users can:

- Create and manage projects
- Add, edit, and organize tasks with drag-and-drop
- Assign tasks to team members
- Filter tasks by status and assignee
- Receive real-time updates when collaborators make changes
- Toggle between light and dark themes

---

## Tech Stack

| Layer                | Technology                                 |
| -------------------- | ------------------------------------------ |
| **Backend**          | Go 1.22, Gin Framework, sqlx               |
| **Frontend**         | React 18, TypeScript, Vite                 |
| **UI Components**    | Tailwind CSS, shadcn/ui (Radix primitives) |
| **Database**         | PostgreSQL 16                              |
| **Authentication**   | JWT (24h expiry), bcrypt (cost 12)         |
| **Real-time**        | WebSocket (gorilla/websocket)              |
| **Drag & Drop**      | @dnd-kit/core                              |
| **Containerization** | Docker with multi-stage builds             |
| **Logging**          | Go slog (structured JSON)                  |

---

## Features

### Core Features ✅

- User registration and login with JWT authentication
- Create, update, and delete projects
- Create, update, and delete tasks
- Assign tasks to users
- Filter tasks by status and assignee
- Permission-based access (owners vs assignees)
- Responsive design (375px mobile to 1280px desktop)
- Loading and error states for all operations
- Optimistic UI updates with rollback on error

### Bonus Features ✅

- **Drag-and-drop** — Reorder tasks by dragging between status columns
- **Dark mode** — Toggle with persistence in localStorage
- **Real-time updates** — WebSocket for instant task/project sync across users
- **Pagination** — `?page=` and `?limit=` on list endpoints
- **Stats endpoint** — `GET /projects/:id/stats` for task counts by status/assignee

---

## Architecture Decisions

### Why WebSocket Over SSE?

I chose **WebSocket** for real-time updates because:

1. **Bidirectional communication** — While we primarily push server→client, WebSocket allows future expansion (typing indicators, presence)
2. **Binary frame support** — More efficient than SSE's text-only format
3. **Better browser support** — SSE has issues with HTTP/2 and some proxies
4. **Connection multiplexing** — Single connection for both project-level and user-level events
5. **Gorilla/websocket** — Battle-tested Go library with excellent documentation

**Tradeoff**: SSE would be simpler for one-way updates and auto-reconnects, but WebSocket's flexibility is worth the extra complexity.

### Backend Structure

```
backend/
├── cmd/server/          # Application entrypoint
├── internal/
│   ├── config/          # Environment configuration
│   ├── database/        # Database connection
│   ├── handlers/        # HTTP request handlers
│   ├── middleware/      # JWT auth middleware
│   ├── models/          # Data models and DTOs
│   ├── router/          # Route definitions
│   └── websocket/       # WebSocket hub and handlers
├── migrations/          # SQL migration files (up/down)
└── seeds/               # Seed data for testing
```

**Key Decisions:**

| Decision                    | Reasoning                                          | Tradeoff                 |
| --------------------------- | -------------------------------------------------- | ------------------------ |
| **sqlx over ORM**           | Explicit SQL control, better performance, no magic | More boilerplate         |
| **PostgreSQL Enums**        | Type safety at database level                      | Harder to add new values |
| **Handler structs**         | Clean dependency injection, testable               | More verbose setup       |
| **Dual WebSocket channels** | Efficient routing (project vs user events)         | More complex hub logic   |

### Frontend Structure

```
frontend/src/
├── components/ui/   # shadcn/ui components (copied, not installed)
├── context/         # Auth and Theme providers
├── hooks/           # useWebSocket, useUserWebSocket
├── lib/             # API client, utilities
├── pages/           # Route components
└── types/           # TypeScript interfaces
```

**Key Decisions:**

| Decision               | Reasoning                                  | Tradeoff                  |
| ---------------------- | ------------------------------------------ | ------------------------- |
| **shadcn/ui**          | Accessible, customizable, you own the code | More initial setup        |
| **Context for state**  | Simple enough for auth/theme               | Would need Redux at scale |
| **Optimistic updates** | Snappy UX for task status changes          | Must handle rollback      |
| **Separate WS hooks**  | Clear separation of concerns               | Two connections per user  |

### Security

- **bcrypt cost 12** — Industry-standard password hashing
- **JWT in memory + localStorage** — Persists across refreshes
- **No secrets in code** — All via `.env`
- **Owner-only actions** — Edit/delete project, assign tasks restricted

### Database Schema

```sql
users (id, name, email, password, created_at)
  └─ password: bcrypt hashed

projects (id, name, description, owner_id → users, created_at)

tasks (id, title, description, status, priority, project_id → projects,
       assignee_id → users, creator_id → users, due_date, created_at, updated_at)
  ├─ status: ENUM('todo', 'in_progress', 'done')
  └─ priority: ENUM('low', 'medium', 'high')

-- Indexes on foreign keys
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
```

---

## Running Locally

### Prerequisites

- Docker and Docker Compose (v2+)
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-name/taskflow
cd taskflow

# 2. Create environment file
cp .env.example .env

# 3. Start all services
docker compose up

# The app is now running:
#   Frontend → http://localhost:3000
#   Backend  → http://localhost:8080
```

**That's it!** Database, migrations, and seed data are handled automatically.

### Rebuilding After Changes

```bash
docker compose build --no-cache && docker compose up
```

### Stopping Services

```bash
docker compose down       # Stop containers
docker compose down -v    # Stop + reset database
```

### Running Migrations Manually

Migrations run automatically when `backend` starts. If you need to run them manually, make sure the stack is running first:

```bash
docker compose up -d
```

On macOS/Linux/Git Bash:

```bash
docker compose exec backend sh
for f in ./migrations/*.up.sql; do
  PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -f $f
done
```

On Windows `cmd.exe`, run the loop inside the container shell:

```cmd
docker compose exec backend sh -c "for f in ./migrations/*.up.sql; do PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -f $f; done"
```

On PowerShell:

```powershell
docker compose exec backend sh -c 'for f in ./migrations/*.up.sql; do PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -f $f; done'
```

---

## Test Credentials

Log in immediately with these seeded accounts:

| Role              | Email              | Password      |
| ----------------- | ------------------ | ------------- |
| **Project Owner** | `test@example.com` | `password123` |
| **Team Member**   | `jane@example.com` | `password123` |

The owner has a project "Website Redesign" with 3 sample tasks (Todo, In Progress, Done).

---

## API Reference

**Base URL:** `http://localhost:8080`

All authenticated endpoints require: `Authorization: Bearer <token>`

### Authentication

#### POST /auth/register

```json
// Request
{ "name": "John Doe", "email": "john@example.com", "password": "secret123" }

// Response 201
{ "token": "eyJhbGci...", "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" } }
```

#### POST /auth/login

```json
// Request
{ "email": "john@example.com", "password": "secret123" }

// Response 200
{ "token": "eyJhbGci...", "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" } }
```

---

### Projects

#### GET /projects

List projects the user owns OR has tasks in.

```json
// Response 200
{
  "projects": [
    {
      "id": "uuid",
      "name": "Website Redesign",
      "description": "Q2 project",
      "owner_id": "uuid",
      "created_at": "2026-04-01T10:00:00Z"
    }
  ]
}
```

#### POST /projects

```json
// Request
{ "name": "New Project", "description": "Optional" }

// Response 201 — created project
```

#### GET /projects/:id

Returns project with all its tasks.

```json
// Response 200
{
  "id": "uuid",
  "name": "Website Redesign",
  "owner_id": "uuid",
  "tasks": [
    {
      "id": "uuid",
      "title": "Design homepage",
      "status": "in_progress",
      "priority": "high",
      "assignee_id": "uuid",
      "due_date": "2026-04-15"
    }
  ]
}
```

#### PATCH /projects/:id _(owner only)_

```json
// Request
{ "name": "Updated Name", "description": "Updated" }

// Response 200 — updated project
```

#### DELETE /projects/:id _(owner only)_

```
Response 204 No Content
```

#### GET /projects/:id/stats _(bonus)_

```json
// Response 200
{
  "total_tasks": 15,
  "by_status": { "todo": 5, "in_progress": 7, "done": 3 },
  "by_assignee": [
    { "assignee_id": "uuid", "assignee_name": "John", "count": 8 }
  ]
}
```

---

### Tasks

#### GET /projects/:id/tasks

Supports filters: `?status=todo&assignee=uuid&page=1&limit=10`

```json
// Response 200
{ "tasks": [...], "total": 25, "page": 1, "limit": 10 }
```

#### POST /projects/:id/tasks _(owner only)_

```json
// Request
{
  "title": "Design homepage",
  "description": "Create mockups",
  "priority": "high",
  "assignee_id": "uuid",
  "due_date": "2026-04-15"
}

// Response 201 — created task
```

#### PATCH /tasks/:id

All fields optional. Non-owners can only update tasks assigned to them (except assignee_id).

```json
// Request
{ "title": "Updated", "status": "done", "priority": "low" }

// Response 200 — updated task
```

#### DELETE /tasks/:id _(owner only)_

```
Response 204 No Content
```

---

### Users

#### GET /users

```json
// Response 200
{ "users": [{ "id": "uuid", "name": "John Doe", "email": "john@example.com" }] }
```

---

### Error Responses

| Status | Response                                                                 |
| ------ | ------------------------------------------------------------------------ |
| 400    | `{ "error": "validation failed", "fields": { "email": "is required" } }` |
| 401    | `{ "error": "unauthorized" }`                                            |
| 403    | `{ "error": "forbidden" }`                                               |
| 404    | `{ "error": "not found" }`                                               |

---

## WebSocket API

### Project-level Updates

```
ws://localhost:8080/ws/projects/:projectId
```

| Event             | Payload             |
| ----------------- | ------------------- |
| `task_created`    | Full task object    |
| `task_updated`    | Full task object    |
| `task_deleted`    | `{ "id": "uuid" }`  |
| `project_updated` | Full project object |
| `project_deleted` | `{ "id": "uuid" }`  |

### User-level Notifications

```
ws://localhost:8080/ws/user/:userId
```

| Event              | Payload                                   | Description                       |
| ------------------ | ----------------------------------------- | --------------------------------- |
| `project_assigned` | `{ "project_id": "uuid", "task": {...} }` | User was assigned to a task       |
| `project_removed`  | `{ "project_id": "uuid" }`                | No more tasks assigned in project |

---

## Project Structure

```
taskflow/
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # Environment template
├── README.md
│
├── backend/
│   ├── Dockerfile              # Multi-stage Go build
│   ├── docker-entrypoint.sh    # Migration + seed runner
│   ├── go.mod / go.sum
│   ├── cmd/server/main.go      # Entrypoint
│   ├── internal/
│   │   ├── config/             # Env config
│   │   ├── database/           # DB connection
│   │   ├── handlers/           # HTTP handlers (auth, projects, tasks)
│   │   ├── middleware/         # JWT auth
│   │   ├── models/             # Data models
│   │   ├── router/             # Route setup
│   │   └── websocket/          # Hub + handlers
│   ├── migrations/             # SQL up/down files
│   └── seeds/seed.sql          # Test data
│
└── frontend/
    ├── Dockerfile              # Multi-stage React build
    ├── nginx.conf              # Production server config
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── components/ui/      # shadcn components
        ├── context/            # AuthContext, ThemeContext
        ├── hooks/              # useWebSocket, useUserWebSocket
        ├── lib/api.ts          # API client
        ├── pages/              # Login, Register, Projects, ProjectDetail
        └── types/index.ts      # TypeScript interfaces
```

---

## What I'd Do With More Time

### Testing (High Priority)

- **Unit tests** for Go handlers with mock DB
- **Integration tests** using testcontainers
- **Frontend tests** with Vitest + React Testing Library
- **E2E tests** with Playwright

### Security Hardening

- **Refresh tokens** — Avoid full re-login after 24h
- **Rate limiting** — Protect auth endpoints
- **CSRF protection** — For form submissions

### Features

- **Email notifications** — On task assignment
- **Task comments** — Threaded discussion
- **Activity log** — Who changed what, when
- **File attachments** — Documents on tasks
- **Due date reminders** — Before deadlines

### Infrastructure

- **Redis** — WebSocket pub/sub for horizontal scaling
- **Kubernetes** — Production deployment manifests
- **CI/CD** — GitHub Actions pipeline

### Performance

- **Connection pooling tuning** — Optimize DB pool size
- **Caching layer** — Redis for hot data
- **CDN** — Static asset delivery

---

## License

MIT

---

Built with ❤️ by Baljinder Singh
