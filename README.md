# TaskFlow

A full-stack task management system with authentication, projects, and tasks.

---

## 1. Overview

TaskFlow lets users register, log in, create projects, add tasks, and assign them to team members.

**Tech stack:**
| Layer | Technology |
|---|---|
| Backend | Java 21 + Spring Boot 3.2, Spring Security, Flyway, JJWT |
| Database | PostgreSQL 16 |
| Frontend | React 18 + TypeScript, Material UI v5, React Router v6, Axios |
| Infrastructure | Docker Compose, multi-stage Dockerfiles |
| Backend deploy | Railway |
| Frontend deploy | Netlify |

> **Note on language choice:** The assignment recommends Go, but Java + Spring Boot was used as my primary production language. All requirements (migrations, bcrypt, JWT, structured logging, graceful shutdown) are fully implemented.

---

## 2. Architecture Decisions

### Backend
- **Package-by-feature** (`auth/`, `project/`, `task/`) — each feature owns its controller, service, repository, and DTOs.
- **Flyway for migrations** with `ddl-auto=validate` — Hibernate never touches the schema.
- **PostgreSQL native ENUMs** for `task_status` and `task_priority` — constraints enforced at DB level.
- **JWT stateless auth** — no sessions, no refresh tokens (out of scope). `JwtAuthenticationFilter` populates `SecurityContextHolder` on every request.
- **No Lombok** — removed due to incompatibility with JDK 26 (the local dev JDK). Docker build uses JDK 21 where Lombok works. Explicit getters/setters/builders make the code transparent.

### Frontend
- **React Context** for auth + theme state — no Redux, the scope doesn't warrant it.
- **Optimistic UI** for task status changes — immediate local update, reverts with Snackbar on API error.
- **MUI v5** — v9 removed direct shorthand props; v5 is stable and meets all requirements.
- **Dark mode** persisted to `localStorage` via `ThemeContext`.

### Intentionally left out
- Refresh tokens, rate limiting, email verification, pagination (did stats bonus instead), WebSocket real-time

---

## 3. Running Locally

> Requires: Docker + Docker Compose only.

```bash
git clone https://github.com/your-name/taskflow-snehil
cd taskflow-snehil
cp .env.example .env
docker compose up --build
```

- **Frontend:** http://localhost:3000  
- **API:** http://localhost:8080  
- **DB:** localhost:5432 (taskflow / taskflow_password)

---

## 4. Running Migrations

Migrations run **automatically** on API startup via Flyway. To reset:

```bash
docker compose down -v   # remove pg_data volume
docker compose up --build
```

---

## 5. Test Credentials

```
Email:    test@example.com
Password: password123
```

---

## 6. API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` → `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |

### Projects (Bearer token required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects` | List accessible projects |
| POST | `/projects` | `{ name, description? }` → created project |
| GET | `/projects/:id` | Project + tasks |
| PATCH | `/projects/:id` | Update name/description (owner only) |
| DELETE | `/projects/:id` | Delete project + tasks (owner only) → 204 |
| GET | `/projects/:id/stats` | Task counts by status + assignee *(bonus)* |

### Tasks (Bearer token required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects/:id/tasks` | List tasks (`?status=todo&assignee=uuid`) |
| POST | `/projects/:id/tasks` | `{ title, description?, priority?, assigneeId?, dueDate? }` → 201 |
| PATCH | `/tasks/:id` | Partial update any field → 200 |
| DELETE | `/tasks/:id` | Owner or assignee only → 204 |

### Error format
```json
{ "error": "validation failed", "fields": { "email": "is required" } }   // 400
{ "error": "unauthorized" }   // 401
{ "error": "forbidden" }      // 403
{ "error": "not found" }      // 404
```

---

## 7. Deploying

### Backend → Railway
1. Add PostgreSQL plugin in Railway
2. Add service from `/backend` (auto-detects Maven/Dockerfile)
3. Set env vars: `JWT_SECRET`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `CORS_ALLOWED_ORIGINS=https://your-app.netlify.app`, `SPRING_PROFILES_ACTIVE=prod`

### Frontend → Netlify
1. Base dir: `frontend` | Build: `npm run build` | Publish: `dist`
2. Set `VITE_API_URL=https://your-api.up.railway.app`
3. SPA routing handled by `public/_redirects`

---

## 8. What I'd Do With More Time

**Shortcuts taken:**
- No Lombok (JDK 26 local incompatibility — the Docker image uses JDK 21 and would support it)
- Seed bcrypt hash is hardcoded — a real seed script would hash at runtime
- Integration tests cover auth and task permission; project-level edge cases need more coverage

**What I'd improve:**
- Refresh tokens with short-lived access tokens (15 min) + `/auth/refresh`
- Cursor-based pagination on list endpoints
- Soft deletes with audit log
- OpenAPI/Swagger from annotations
- Service-layer unit tests (currently only integration tests)
- React error boundaries to prevent blank-screen crashes
- Bundle splitting with dynamic `import()` per route (current bundle: 565 KB)
- Real-time task updates via SSE
