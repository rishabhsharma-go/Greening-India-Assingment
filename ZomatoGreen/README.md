# TaskFlow

A full-stack task management application. Users can register, log in, create projects, add tasks, and assign tasks to team members.

---

## 1. Overview

**What it does:**
- Register and authenticate users with JWT
- Create and manage projects
- Add tasks to projects with status, priority, due dates, and assignees
- View tasks assigned to you across all projects
- Role-based access (project owner vs. member)

**Tech stack:**
| Layer | Technology |
|---|---|
| Backend | Rust, Axum 0.7, microservices |
| Database | PostgreSQL 16 |
| DB access | sqlx 0.8 (no ORM, raw SQL) |
| Migrations | sqlx::migrate!() (SQL files in /migrations) |
| Auth | JWT (jsonwebtoken crate), bcrypt cost 12 |
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS |
| State | TanStack Query + Zustand |
| Containerization | Docker Compose |

---

## 2. Architecture

**Microservices:**
- `gateway` (8000) — JWT validation, user auth, reverse proxy to downstream services
- `management` (8001) — Projects and Tasks

**Auth flow:** Login/register returns a signed JWT. All protected routes require `Authorization: Bearer <token>`. The gateway validates the token and forwards `X-User-ID` and `X-User-Role` headers to downstream services.

---

## 3. Running Locally

**Prerequisites:** Docker and Docker Compose (nothing else needed).

```bash
git clone <repo-url>
cd ZomatoGreen
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Gateway API: http://localhost:8000
- Management: http://localhost:8001

First startup takes ~5–10 minutes to compile all Rust binaries. Subsequent starts are fast (layers cached).

---

## 4. Migrations

Migrations run **automatically** when the gateway container starts via `sqlx::migrate!()`.

To run the seed script (adds a demo project and tasks):
```bash
docker compose exec postgres bash -c "psql -U gims_user -d gims" < migrations/seed.sql
```

---

## 5. Test Credentials

A seed user is created automatically on gateway startup:

```
Email:    test@example.com
Password: password123
```

---

## 6. API Reference

### Auth (Gateway — port 8000)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | /auth/register | No | `{ name, email, password }` |
| POST | /auth/login | No | `{ email, password }` → `{ token, user }` |
| GET | /auth/me | Yes | — |

### Projects & Tasks (via Gateway → Management)

| Method | Endpoint | Notes |
|---|---|---|
| GET | /projects | List user's projects |
| POST | /projects | `{ name, description? }` |
| GET | /projects/:id | Project + tasks |
| PATCH | /projects/:id | Owner only |
| DELETE | /projects/:id | Owner only |
| GET | /projects/:id/stats | Task counts by status |
| GET | /projects/:id/tasks | Supports `?status=` `?assignee=` |
| POST | /projects/:id/tasks | `{ title, description?, status?, priority?, assignee_id?, due_date? }` |
| PATCH | /tasks/:id | Update any task field |
| DELETE | /tasks/:id | Owner or project owner |
| GET | /users | List users (for assignee dropdown) |

**Error format:**
```json
{ "error": "message" }
```

**Auth header:** `Authorization: Bearer <token>`

---

## 7. What You'd Do With More Time

- **Integration tests** — Auth, task CRUD, and assignment hitting a real test database
- **Pagination** — Add `?page=&limit=` to all list endpoints
- **WebSocket** — Real-time task updates across collaborative project members
- **Dark mode** — Frontend dark mode toggle with Zustand persistence
- **Within-column drag reordering** — Current drag-and-drop supports cross-column status changes; adding a sort order column would enable reordering within a column
- **Rate limiting** — Redis-backed rate limiter on the gateway
