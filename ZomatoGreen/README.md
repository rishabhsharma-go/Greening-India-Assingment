# Clove

> A minimal but real task management system built for teams who want clarity, not clutter.

I thought of naming this project Clove because Jira is already taken XD.

Clove is a full-stack task management application where users can register, log in, create projects, add tasks, and assign work to themselves or teammates. It covers the full lifecycle of a task: from creation through status tracking (`todo → in_progress → done`), priority management, due dates, and assignee control.

It is not a to-do app demo. Clove has real authentication backed by bcrypt + JWT, a relational PostgreSQL schema managed through explicit migration files, a RESTful API served through a Rust microservices gateway, and a polished React frontend with protected routes, optimistic UI updates, and responsive layouts.

**Tech Stack:**
- **Backend:** Rust (Axum framework), microservices architecture with a gateway and management service
- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Database:** PostgreSQL 15 with SQL migration files
- **Infrastructure:** Docker + Docker Compose, multi-stage Dockerfiles, Nginx for frontend serving

---

## Architecture Decisions

### Why Rust + Axum?

To be honest, I don't know Golang. At my current company, Juspay, I work on Rust day-to-day, so using it here was the natural call. Concepts matter more than syntax, and picking a language I already think in meant I could focus on architecture and correctness rather than fighting a new toolchain. Learning a new language is not that hard. Learning it well enough to make good decisions under a 72-hour deadline is a different story.

On the technical merits, Rust produces a single statically-linked binary with no runtime dependency, which makes the Docker image minimal (under 20MB after a multi-stage build) and startup instantaneous. Axum sits on top of `tokio` and `hyper` and gives async-first request handling with a type-safe extractor model that catches many bugs at compile time rather than runtime.

The tradeoff is compile time and a steeper learning curve for contributors not familiar with the ownership model. For a small-scope assignment project this is acceptable. For a larger team the onboarding cost would need to be weighed more carefully.

### Why a Gateway + Management service split?

The backend is split into two services. The **Gateway** (`services/gateway`) handles all authentication concerns: JWT issuance on login and register, JWT validation middleware on every protected route, and request proxying to downstream services. It owns the `users` table exclusively. The **Management** service (`services/management`) owns projects and tasks. It trusts that the gateway has already authenticated the caller and receives the `user_id` as a forwarded header.

This separation means auth logic is colocated in one place and never duplicated. Downstream services don't need JWT libraries at all. The tradeoff is an extra network hop per request and more Docker services to configure. For the scale of this project a monolith would have been simpler, but the split makes the auth boundary explicit and auditable, which is a meaningful property for a real product.

### On PostgreSQL and migrations

PostgreSQL was required by the assignment, so there was no decision to make there. The decision that did matter was how to manage the schema. ORM auto-migration was deliberately avoided. Auto-generated DDL is convenient during development but produces schemas that are hard to reason about, hard to roll back, and often missing indexes or constraints that a human would add intentionally. Writing raw SQL migrations forces you to think about each change explicitly, which is the right habit for anything touching production data.

Every migration has a corresponding `down` file so the schema can be rolled back to any prior state deterministically. Migrations run automatically on container startup via an entrypoint script, so there is no manual step required after `docker compose up`.

### On React and the frontend stack

React was required by the assignment. Within that constraint, TypeScript was the obvious addition because it catches the class of bugs that are most common in API-driven UIs: mismatched response shapes, undefined access on optional fields, and incorrect prop types. These are exactly the bugs that show up at midnight during a demo.

Tailwind was chosen over a full component library because it gives full layout control without fighting against an opinionated design system. The utility-first model keeps styles co-located with markup and avoids the stylesheet sprawl that tends to accumulate in plain CSS projects. The tradeoff is more verbose JSX, which is a conscious choice for a project at this scale. Vite was picked over CRA or Webpack purely for speed: the development server starts in under a second and hot module replacement is near-instant.

### What was intentionally left out

**Refresh tokens.** The JWT has a 24-hour expiry. Implementing a refresh token flow would require a token store (Redis or a DB table), a `/auth/refresh` endpoint, and client-side interceptor logic. This is the right thing to do in production but adds significant complexity for a scoped assignment.

**Role-based access control beyond ownership.** The current model has project owner vs. non-owner. A real product would have roles like `admin`, `member`, and `viewer`. This was deferred because the schema supports it (the `projects` table has `owner_id`) but the full permission matrix would make the API much larger to implement and test.

**Email verification.** Users are created immediately on register without confirming their address. Adding this would require an email service integration and a token verification flow.

---

## Running Locally

The only dependency is Docker. Clone the repo, copy the env file, and start the stack:

```bash
git clone https://github.com/aadityaguptaa/Greening-India-Assingment.git
cd Greening-India-Assingment/ZomatoGreen

cp .env.example .env

docker compose up
```

The frontend will be available at **http://localhost:3000**.  
The API gateway will be available at **http://localhost:8000**.

The first `docker compose up` will:
1. Pull the PostgreSQL image
2. Build the Rust gateway and management services (multi-stage: compile in a Rust builder image, copy the binary into a minimal Debian slim image)
3. Build the React frontend (compile with Vite, serve via Nginx)
4. Run all database migrations automatically
5. Seed the database with a test user, a project, and three tasks

---

## Running Migrations

Migrations run automatically when the containers start. No manual step is needed.

If you want to run them manually against a local Postgres instance:

```bash
export DATABASE_URL=postgres://gims_user:gims_secret@localhost:5432/gims?sslmode=disable

for f in migrations/*.up.sql; do psql "$DATABASE_URL" -f "$f"; done
```

To roll back the last migration:

```bash
psql "$DATABASE_URL" -f migrations/000006_task_creator.down.sql
```

---

## Test Credentials

The seed script creates the following user automatically:

```
Email:    test@example.com
Password: password123
```

You can log in immediately after `docker compose up` without registering.

The seed also creates one project ("Seed Project") with three tasks in different statuses: one `todo`, one `in_progress`, and one `done`.

---

## API Reference

All endpoints except `/auth/*` require an `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register with name, email, and password |
| POST | `/auth/login` | Login and receive a token and user object |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects the current user owns or has tasks in |
| POST | `/projects` | Create a project |
| GET | `/projects/:id` | Get project details including its tasks |
| PATCH | `/projects/:id` | Update name or description (owner only) |
| DELETE | `/projects/:id` | Delete project and all tasks (owner only) |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:id/tasks` | List tasks, supports `?status=` and `?assignee=` filters |
| POST | `/projects/:id/tasks` | Create a task |
| PATCH | `/tasks/:id` | Update title, description, status, priority, assignee, or due date |
| DELETE | `/tasks/:id` | Delete task (project owner or task creator only) |

**Error response shapes:**

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

## What I'd Do With More Time

**Component structure and reusability.** The React components right now are not structured well. A lot of logic is tightly coupled to specific pages and not reusable across the app. Given more time I would break things into proper primitives, shared UI components, and page-level containers that compose them. The kind of structure that makes adding a new page feel easy rather than copy-paste heavy.

**Concurrency handling.** At the current scale this is not a problem, but if the project grows and multiple users are simultaneously updating tasks in the same project, race conditions become a real concern. I would add optimistic locking on task updates using a version field or `updated_at` comparison, so that a stale write fails explicitly rather than silently overwriting someone else's change. Rust makes this tractable because the type system can enforce that you check the version before writing, but the database constraint still needs to be there.

**User roles.** Right now the only distinction is project owner vs. everyone else. A real team tool needs proper roles: Admin who can manage users and all projects, Project Manager who can create projects and assign tasks, and Member who can only work on tasks assigned to them. This touches the schema, the API permission checks, and the frontend (hiding or disabling actions based on role). It was left out because getting the role model wrong early causes painful migrations later and I did not have enough time to think it through properly.

**Refresh token flow.** The 24-hour JWT works for a demo but is not production-safe. Implementing short-lived access tokens (15 minutes) with a rotating refresh token stored in an httpOnly cookie is the right pattern. I skipped this because it requires a token store and significantly more client-side interceptor logic.

**Integration tests.** The API has no automated tests right now. I would add at minimum a full flow: register, login, create project, create task, update task status, delete task, all running against a test database spun up in Docker. The Rust ecosystem has excellent support for this via `sqlx` test transactions.

**Pagination.** All list endpoints return the full result set. For real-world usage with many tasks per project, cursor-based pagination is necessary. The schema supports it (UUIDs as primary keys, `created_at` for ordering) but the endpoints don't expose it yet.

**Stats endpoint.** `GET /projects/:id/stats` returning task counts by status and by assignee would make the project detail page much more useful. The SQL is a straightforward `GROUP BY`. This was a time tradeoff, not a complexity one.

**Drag-and-drop task reordering.** The UI has filter and status views but no drag-and-drop between status columns. This would require adding an `order` column to the tasks table and a PATCH endpoint for reordering, plus a library like `dnd-kit` on the frontend.

**Real-time updates.** Multiple users editing the same project currently have no way to see each other's changes without refreshing. Server-Sent Events from the management service would be a natural fit here, lightweight, one-directional, and easy to consume from React without a WebSocket library.

**Better error boundaries.** The frontend handles loading and error states but the error boundary coverage could be more granular. Right now a single failed API call in one component can surface as a blank panel rather than an inline error message.
