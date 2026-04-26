# TaskFlow — Engineering Take-Home Assignment

> **Mid-level Engineer · Full Stack / Frontend / Backend**
> Estimated time: 3–5 hours · Deadline: 72 hours from receipt

---

## Overview

You're building **TaskFlow** — a minimal but real task management system. Users can register, log in, create projects, add tasks to those projects, and assign tasks to themselves or others.

This is not a to-do app demo. It's a small product with authentication, relational data, a REST API, and a polished UI. Scope is intentionally constrained so you can ship something **complete**.

> **On AI tools:** Cursor, Copilot, and ChatGPT are permitted. We evaluate the quality of your decisions, not the volume of your code. A project with thoughtful architecture and honest tradeoffs outranks boilerplate AI output every time. Be prepared to discuss every part of your submission on a follow-up call.

---

## Who Builds What

| Role | Backend (Go) | Frontend (React) | Docker + README |
|---|---|---|---|
| Full Stack Engineer | ✅ Required | ✅ Required | ✅ Required |
| Backend Engineer | ✅ Required | ❌ Not required — include a Postman/Bruno collection or test suite instead | ✅ Required |
| Frontend Engineer | ❌ Not required — build against the mock API spec in [Appendix A](#appendix-a-mock-api-spec-for-frontend-only-candidates) | ✅ Required | ✅ Required |

---

## The Data Model

Design your schema around these entities. You may add fields, but do not remove any required ones.

```
User
  id          uuid, primary key
  name        string, required
  email       string, unique, required
  password    string, hashed (bcrypt), required
  created_at  timestamp

Project
  id          uuid, primary key
  name        string, required
  description string, optional
  owner_id    uuid → User
  created_at  timestamp

Task
  id          uuid, primary key
  title       string, required
  description string, optional
  status      enum: todo | in_progress | done
  priority    enum: low | medium | high
  project_id  uuid → Project
  assignee_id uuid → User, nullable
  due_date    date, optional
  created_at  timestamp
  updated_at  timestamp
```

Use **PostgreSQL**. Schema must be managed via migrations — not auto-migrate or ORM magic.

---

## Backend Requirements

> Required for: Full Stack and Backend roles
> Language: **Go (preferred)**. If you're not comfortable with Go, use a language you know well — note your choice in the README.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register with name, email, password |
| POST | `/auth/login` | Returns a JWT access token |

- Passwords must be hashed with **bcrypt** (cost ≥ 12)
- JWT expiry: **24 hours**. Include `user_id` and `email` in claims.
- All non-auth endpoints require `Authorization: Bearer <token>`

### Projects API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects` | List projects the current user owns or has tasks in |
| POST | `/projects` | Create a project (owner = current user) |
| GET | `/projects/:id` | Get project details + its tasks |
| PATCH | `/projects/:id` | Update name/description (owner only) |
| DELETE | `/projects/:id` | Delete project and all its tasks (owner only) |

### Tasks API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects/:id/tasks` | List tasks — support `?status=` and `?assignee=` filters |
| POST | `/projects/:id/tasks` | Create a task |
| PATCH | `/tasks/:id` | Update title, description, status, priority, assignee, due_date |
| DELETE | `/tasks/:id` | Delete task (project owner or task creator only) |

### General API Requirements

- All responses: `Content-Type: application/json`
- Validation errors → `400` with structured body:
  ```json
  { "error": "validation failed", "fields": { "email": "is required" } }
  ```
- Unauthenticated → `401`. Unauthorized action → `403`. Do **not** conflate these.
- Not found → `404` with `{ "error": "not found" }`
- Use structured logging (`slog`, `zap`, or `logrus`)
- Graceful shutdown on `SIGTERM`

### Backend Bonus (optional)

- Pagination on list endpoints (`?page=&limit=`)
- `GET /projects/:id/stats` — task counts by status and by assignee
- At least 3 integration tests for auth or task endpoints

---

## Frontend Requirements

> Required for: Full Stack and Frontend roles
> Framework: **React** (with TypeScript strongly preferred)

### Pages & Views

| View | Requirements |
|---|---|
| Login / Register | Form with client-side validation, error handling, JWT storage |
| Projects list | Show all accessible projects, button to create new project |
| Project detail | Tasks listed or grouped, filter by status and assignee |
| Task create/edit | Modal or side panel — title, status, priority, assignee, due date |
| Navbar | Show logged-in user's name, logout button |

### UX & State

- Use **React Router** for navigation
- Auth state must persist across page refreshes (localStorage or equivalent)
- Protected routes: redirect to `/login` if unauthenticated
- **Loading and error states must be visible** — no silent failures, no blank screens
- Optimistic UI for task status changes (update immediately, revert on error)

### Design & Polish

- Use a component library (shadcn/ui, Radix, Chakra, MUI) **or** build your own — state your choice in the README
- Responsive: must work at **375px** (mobile) and **1280px** (desktop) widths
- No broken layouts, no console errors in the production build
- Sensible empty states — no `undefined`, no blank white boxes

### Frontend Bonus (optional)

- Drag-and-drop to reorder tasks or change their status column
- Dark mode toggle that persists across sessions
- Real-time task updates via WebSocket or SSE (requires backend support)

---

## Infrastructure Requirements

> Required for all roles

### Docker

- `docker-compose.yml` at the repo root must spin up the **full stack**: PostgreSQL, API server, and (for Full Stack) the React app
- A single `docker compose up` must work with **zero manual steps**
- PostgreSQL credentials must be configurable via `.env`
- Include a `.env.example` with **all** required variables and sensible defaults
- The API `Dockerfile` must use a **multi-stage build** (build stage + minimal runtime stage)

### Migrations

- Use a migration tool: `golang-migrate`, `goose`, `dbmate`, or equivalent
- Migrations must run **automatically on container start**, OR instructions must be explicit and exact in the README
- Both **up and down** migrations are required for every migration file
- Include a **seed script or SQL file** that creates at least:
  - 1 user (with a known password for testing)
  - 1 project
  - 3 tasks with different statuses

---

## README Requirements

Your README is evaluated as part of the rubric. It must include all of the following sections:

### 1. Overview
What this is, what it does, and what tech stack you used.

### 2. Architecture Decisions
Why did you structure things the way you did? What tradeoffs did you make? What did you intentionally leave out and why?

### 3. Running Locally
Exact commands from `git clone` to the app running in a browser. Assume the reviewer has Docker and nothing else installed.

```bash
# Example — your actual commands go here
git clone https://github.com/your-name/taskflow
cd taskflow
cp .env.example .env
docker compose up
# App available at http://localhost:3000
```

### 4. Running Migrations
If migrations don't run automatically on startup, provide the exact commands.

### 5. Test Credentials
Seed user credentials so we can log in immediately without registering:
```
Email:    test@example.com
Password: password123
```

### 6. API Reference
List all endpoints with request/response examples, or link to a Postman/Bruno collection in the repo.

### 7. What You'd Do With More Time
Honest reflection. What shortcuts did you take? What would you improve or add? This section matters — it tells us how you think about quality and tradeoffs.

---

## Evaluation Rubric

Minimum passing scores: **28 / 45** for Full Stack · **16 / 25** for Frontend-only or Backend-only

| Area | What we look for | Points | Roles |
|---|---|---|---|
| **Correctness** | Does it run? Does auth work end-to-end? Can we complete the core flows? | 5 | All |
| **Code quality** | Naming, structure, separation of concerns, reviewable code, no god functions | 5 | All |
| **API design** | RESTful conventions, correct HTTP status codes, clean error responses, auth handled properly | 5 | FS, BE |
| **Data modeling** | Schema makes sense, migrations are clean, indexes where appropriate | 5 | FS, BE |
| **UI/UX** | Usable, consistent, handles loading/error/empty states, responsive | 5 | FS, FE |
| **Component design** | Sensible breakdown, state managed at the right level, no prop-drilling nightmares | 5 | FS, FE |
| **Docker & DevEx** | Does `docker compose up` just work? Multi-stage Dockerfile? `.env.example` present? | 5 | All |
| **README quality** | Clear setup, architecture reasoning, honest "what's missing" section | 5 | All |
| **Bonus** | Tests, pagination, drag-and-drop, real-time, dark mode, stats endpoint | +5 | All |

### Automatic Disqualifiers

The following will result in immediate rejection, regardless of other quality:

- App does not run with `docker compose up`
- No database migrations (manual SQL dumps do not count)
- Passwords stored in plaintext
- JWT secret hardcoded in source code (not in `.env`)
- No README
- Submission after the 72-hour deadline without prior notice

---

## Submission Instructions

1. **Create a public GitHub repository** — name it `taskflow-[your-name]`
2. **Repo structure** — monorepo with `/backend` and `/frontend` directories, or two separate repos linked from the README. `docker-compose.yml` at root.
3. **No secrets in git** — commit `.env.example`, never `.env`. If you accidentally commit secrets, rotate them before submitting.
4. **Send us the link** — reply to the assignment email with your GitHub URL before the deadline.
5. **Expect a code review call** — we'll schedule a 30-minute session to walk through your decisions. You should be able to explain any part of your code.

---

## Appendix A: Mock API Spec (Frontend-only candidates)

If you are applying for a **Frontend-only** role, build your UI against this mock API. You may use `json-server`, `msw` (Mock Service Worker), or any other mocking approach — just document it in your README.

### Base URL
```
http://localhost:4000
```

### Auth endpoints

**POST `/auth/register`**
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }

// Response 201
{ "token": "<jwt>", "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

**POST `/auth/login`**
```json
// Request
{ "email": "jane@example.com", "password": "secret123" }

// Response 200
{ "token": "<jwt>", "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

### Projects endpoints

**GET `/projects`** — requires `Authorization: Bearer <token>`
```json
// Response 200
{
  "projects": [
    { "id": "uuid", "name": "Website Redesign", "description": "Q2 project", "owner_id": "uuid", "created_at": "2026-04-01T10:00:00Z" }
  ]
}
```

**POST `/projects`**
```json
// Request
{ "name": "New Project", "description": "Optional description" }

// Response 201
{ "id": "uuid", "name": "New Project", "description": "Optional description", "owner_id": "uuid", "created_at": "2026-04-09T10:00:00Z" }
```

**GET `/projects/:id`**
```json
// Response 200
{
  "id": "uuid", "name": "Website Redesign", "description": "Q2 project", "owner_id": "uuid",
  "tasks": [
    { "id": "uuid", "title": "Design homepage", "status": "in_progress", "priority": "high", "assignee_id": "uuid", "due_date": "2026-04-15", "created_at": "...", "updated_at": "..." }
  ]
}
```

**PATCH `/projects/:id`**
```json
// Request
{ "name": "Updated Name", "description": "Updated description" }
// Response 200 — returns updated project object
```

**DELETE `/projects/:id`** → Response `204 No Content`

### Tasks endpoints

**GET `/projects/:id/tasks?status=todo&assignee=uuid`**
```json
// Response 200
{ "tasks": [ /* task objects */ ] }
```

**POST `/projects/:id/tasks`**
```json
// Request
{ "title": "Design homepage", "description": "...", "priority": "high", "assignee_id": "uuid", "due_date": "2026-04-15" }
// Response 201 — returns created task object
```

**PATCH `/tasks/:id`**
```json
// Request — all fields optional
{ "title": "Updated title", "status": "done", "priority": "low", "assignee_id": "uuid", "due_date": "2026-04-20" }
// Response 200 — returns updated task object
```

**DELETE `/tasks/:id`** → Response `204 No Content`

### Error responses

```json
// 400 Validation error
{ "error": "validation failed", "fields": { "email": "is required" } }

// 401 Unauthenticated
{ "error": "unauthorized" }

// 403 Forbidden
{ "error": "forbidden" }

// 404 Not found
{ "error": "not found" }
```

---

*Questions? Reply to the email this was sent from. Good luck — we look forward to seeing what you build.*
