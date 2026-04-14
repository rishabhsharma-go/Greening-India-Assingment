# TaskFlow - Task Management System

TaskFlow is a complete full-stack task management application built with Go, React, and PostgreSQL. Users can register, log in, create projects, manage tasks, and assign them within those projects.

## Overview

This is a production-ready task management system featuring:
- **Authentication**: User registration and JWT-based login
- **Projects**: Create and manage multiple projects
- **Tasks**: Full task lifecycle management with priority levels and status tracking
- **Responsive UI**: Mobile-friendly React interface with Tailwind CSS
- **REST API**: Clean, RESTful API with proper error handling
- **Docker**: Complete Docker Compose setup for local development and deployment

## Tech Stack

**Backend:**
- Go 1.22 with Chi router
- PostgreSQL 15 for data persistence
- JWT for authentication (golang-jwt/jwt)
- Bcrypt for password hashing
- pgx for database access

**Frontend:**
- React 18 with TypeScript
- React Router for navigation
- Axios for API calls
- Tailwind CSS for styling
- Lucide React for icons
- Vite as build tool

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL with migrations
- Multi-stage Docker builds

## Architecture Decisions

### Backend Structure
- **Handler-based routing** using Chi router for simplicity and performance
- **Direct SQL** instead of ORM for full control over queries and performance
- **Middleware pattern** for authentication and logging
- **Structured logging** with slog for observability
- **Graceful shutdown** support via signal handling
- **Proper error responses** with validation field details

### Frontend Structure
- **Context API** for auth state management (lightweight, no Redux needed)
- **Custom hooks** (`useAuth`) for clean component logic
- **Tailwind CSS** for utility-first styling (no component library bloat)
- **React Router v6** for nested routing and protected routes
- **Optimistic UI updates** for better UX on task status changes
- **localStorage persistence** for auth token across sessions

### Data Model
- **UUID primary keys** for distributed system readiness
- **Proper foreign keys** with cascade deletes for data integrity
- **Enum types** for status and priority validation at database level
- **Timestamps** (created_at, updated_at) for audit trails
- **Nullable assignee_id** to support unassigned tasks
- **Proper indexes** on foreign keys and frequently queried columns

### Access Control
- **Project owner** can CRUD their own projects and all tasks within
- **Task assignee** can view their assigned tasks
- **Users can see** projects they own or have tasks in
- **403 Forbidden** returned for unauthorized actions (not 404 confusion)

### Intentional Tradeoffs
- **No real-time updates**: Kept simple with HTTP polling (SSE/WebSocket optional bonus)
- **No drag-and-drop**: Status changes via dropdown (drag-and-drop is bonus feature)
- **No dark mode**: Focused on core functionality (dark mode is bonus)
- **Single database**: No caching layer, kept deployment simple
- **Client-side validation only**: Server validates everything anyway
- **No pagination**: Works fine with demo data, easy to add (bonus feature)

## Running Locally

### Prerequisites
- Docker & Docker Compose installed
- Nothing else required!

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-name/taskflow
cd taskflow

# Copy environment file
cp .env.example .env

# Start the entire stack
docker compose up --build

# App is available at http://localhost:3000
```

That's it! The database will be automatically initialized with migrations and seed data.

### What docker compose up does:
1. **Starts PostgreSQL** on port 5432
2. **Runs migrations** automatically on backend startup
3. **Seeds demo data** (test user, project, tasks)
4. **Starts Go API** on port 8080
5. **Starts React frontend** on port 3000

### Manual Verification

Once running, verify everything works:

```bash
# In another terminal, test the API
curl http://localhost:8080/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Should return: {"token":"...","user":{...}}
```

Then visit `http://localhost:3000` in your browser and log in with the test credentials.

## Test Credentials

Use these to log in immediately:

```
Email:    test@example.com
Password: password123
```

## Running Migrations

Migrations run **automatically** when the backend container starts. If you need to run them manually:

```bash
# View current migrations
docker compose exec db psql -U postgres -d taskflow -c "\dt"

# Migrations are in: backend/migrations/
# - 001_init_schema.up.sql   (creates tables)
# - 001_init_schema.down.sql  (drops tables)
# - seed.sql                   (seeds test data)
```

To reset the database:

```bash
docker compose down -v  # Remove volumes
docker compose up --build  # Recreate everything
```

## API Reference

### Authentication

**POST /auth/register**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123"
}
```
Response: `201 Created`
```json
{
  "token": "eyJ...",
  "user": {"id": "uuid", "name": "Jane Doe", "email": "jane@example.com", "created_at": "..."}
}
```

**POST /auth/login**
```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```
Response: `200 OK` (same as register)

### Projects

All project endpoints require: `Authorization: Bearer <token>`

**GET /projects**
Response: `200 OK`
```json
{
  "projects": [
    {"id": "uuid", "name": "Website Redesign", "description": "Q2 project", "owner_id": "uuid", "created_at": "..."}
  ]
}
```

**POST /projects**
```json
{
  "name": "New Project",
  "description": "Optional description"
}
```
Response: `201 Created`
```json
{"id": "uuid", "name": "New Project", "description": "...", "owner_id": "uuid", "created_at": "..."}
```

**GET /projects/:id**
Response: `200 OK`
```json
{
  "id": "uuid",
  "name": "Website Redesign",
  "description": "Q2 project",
  "owner_id": "uuid",
  "created_at": "...",
  "tasks": [
    {"id": "uuid", "title": "Design homepage", "status": "in_progress", "priority": "high", ...}
  ]
}
```

**PATCH /projects/:id**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```
Response: `200 OK` (returns updated project)

**DELETE /projects/:id**
Response: `204 No Content`

### Tasks

**GET /projects/:id/tasks?status=todo&assignee=uuid**
Response: `200 OK`
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Design homepage",
      "description": "Create mockups",
      "status": "in_progress",
      "priority": "high",
      "project_id": "uuid",
      "assignee_id": "uuid",
      "due_date": "2026-04-15",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

**POST /projects/:id/tasks**
```json
{
  "title": "Design homepage",
  "description": "Create mockups",
  "priority": "high",
  "assignee_id": "uuid",
  "due_date": "2026-04-15"
}
```
Response: `201 Created` (returns created task)

**PATCH /tasks/:id**
```json
{
  "title": "Updated title",
  "status": "done",
  "priority": "low",
  "assignee_id": "uuid",
  "due_date": "2026-04-20"
}
```
Response: `200 OK` (returns updated task)

**DELETE /tasks/:id**
Response: `204 No Content`

### Error Responses

**400 Bad Request** (validation error)
```json
{
  "error": "validation failed",
  "fields": {"email": "is required", "password": "must be at least 6 characters"}
}
```

**401 Unauthorized** (auth failed)
```json
{"error": "unauthorized"}
```

**403 Forbidden** (insufficient permissions)
```json
{"error": "forbidden"}
```

**404 Not Found**
```json
{"error": "not found"}
```

## Development Notes

### Frontend Development

To run frontend in development mode with hot reload:

```bash
cd frontend
npm install
npm run dev
```

The frontend will try to connect to `http://localhost:8080` for the API.

### Backend Development

To run backend locally without Docker:

```bash
# Set environment
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/taskflow"
export JWT_SECRET="dev-secret"

# Run migrations manually (if needed)
psql -U postgres -d taskflow -f backend/migrations/001_init_schema.up.sql
psql -U postgres -d taskflow -f backend/migrations/seed.sql

# Run backend
cd backend
go run main.go
```

### Database Access

```bash
# Connect to running database
docker compose exec db psql -U postgres -d taskflow

# Some useful queries:
\dt                                    # List tables
SELECT * FROM users;                  # View users
SELECT * FROM projects;               # View projects
SELECT * FROM tasks;                  # View tasks
```

## What You'd Do With More Time

### Immediate Improvements (1-2 hours)
1. **Add pagination** to list endpoints - currently returns all results
2. **Add unique constraint** on project names per user
3. **Add task filters** in UI - pagination, sorting
4. **Add due date picker** in task form - currently just text input
5. **Improve error messages** - show field-specific validation errors in UI

### Medium-term (4-8 hours)
1. **Real-time updates via WebSocket** - live task status updates
2. **Drag-and-drop task reordering** - change status by dragging
3. **Dark mode toggle** - persist in localStorage
4. **Task assignments UI** - show user list when assigning
5. **Task statistics endpoint** - counts by status/priority/assignee
6. **Search and advanced filtering** - find tasks across projects

### Long-term (1-2 days)
1. **Comments on tasks** - discussion threads
2. **Task notifications** - email when assigned
3. **Audit log** - track all changes
4. **Batch operations** - bulk update status/assignee
5. **Mobile app** - React Native version
6. **Rate limiting & caching** - Redis for performance
7. **Elasticsearch integration** - full-text search
8. **RBAC** - granular role-based access control
9. **Export/import** - backup projects as JSON
10. **Webhooks** - integrate with external tools

### Known Limitations
- No pagination (simple for demo, needed for scale)
- No caching (each request hits database)
- No email notifications (requires SMTP setup)
- No file uploads (attachment support)
- No task comments (single model per entity)
- No collaborative editing (real-time sync)

## Troubleshooting

### Docker issues

**Port already in use:**
```bash
# Kill process on port 3000, 8080, or 5432
lsof -i :3000
kill -9 <PID>
```

**Permission denied running migrations:**
```bash
# Ensure migrate.sh is executable
docker compose exec backend chmod +x /app/migrate.sh
```

**Database connection failed:**
```bash
# Check database is healthy
docker compose ps
# Should show db service as healthy

# View backend logs
docker compose logs -f backend
```

### Frontend issues

**Cannot reach API:**
- Verify backend is running: `docker compose logs backend`
- Check API URL in browser console network tab
- Ensure Bearer token is being sent in requests

**CORS errors:**
- Backend should accept requests from any origin (no CORS middleware added)
- Check browser console for actual error

**Blank page:**
- Check browser console for JavaScript errors
- Verify localStorage for auth token

## License

MIT

## Support

For issues or questions, please open a GitHub issue or reach out to the development team.

### Frontend
- **Framework:** React with TypeScript for type safety and better DX.
- **State Management:** React Context API for auth state (JWT token + user info). Props for local component state.
- **Routing:** React Router v6 for nested routes and protected route patterns.
- **Styling:** Tailwind CSS with utility-first approach. No component library - built custom components for full control.
- **API Client:** Axios with interceptor for Bearer token injection.
- **Persistence:** localStorage for auth token and user info - survives page refresh.

### Database Schema
- **Users:** UUID primary keys, unique emails, bcrypt hashed passwords.
- **Projects:** Owner relationship to enforce permissions.
- **Tasks:** Enum types for status and priority, nullable assignee, cascade delete on project removal.
- **Indexes:** On foreign keys (owner_id, project_id, assignee_id) and status for query optimization.

### API Design
- **REST conventions:** POST for creation, PATCH for updates, DELETE for removal.
- **Auth:** Bearer token in Authorization header, validated on every protected request.
- **Validation:** Request body validation before DB operations; 400 errors with field-level messages.
- **Permissions:** Project owner can manage project/tasks; users can only see projects they own or have tasks in.

### Intentional Tradeoffs
- **No real-time updates:** Could add WebSocket/SSE for collaborative updates - deferred for scope.
- **No pagination:** Works well for small datasets. Could add ?page=&limit= query params.
- **Simple deployment:** Docker Compose for local development. Production would need reverse proxy, proper secrets management.
- **No email verification:** Assumes trusted environment; production needs email confirmation flows.
- **Minimal validation:** Basic field checks. Production needs more rigorous validation (email format, password strength).

## Running Locally

### Prerequisites
- Docker and Docker Compose installed
- Git

### Quick Start

```bash
# Clone and navigate
git clone https://github.com/your-name/taskflow
cd taskflow

# Copy environment file
cp .env.example .env

# Start all services
docker compose up

# Wait for PostgreSQL and migrations to complete (15-20 seconds)
# App will be available at http://localhost:3000
```

That's it! The database, migrations, backend, and frontend all start with a single command.

### Accessing the Application

- **Frontend:** http://localhost:3000
- **API:** http://localhost:8080
- **Database:** localhost:5432 (credentials in .env)

### Test Credentials

Use these to log in immediately:

```
Email:    test@example.com
Password: password123
```

A test project and tasks are pre-seeded.

## Running Migrations

Migrations run automatically on backend container startup via `migrate.sh`:

1. Connects to PostgreSQL
2. Applies all `.up.sql` files from `backend/migrations/`
3. Runs `seed.sql` to insert test data

### Manual Migration (if needed)

```bash
# Inside the backend container
docker compose exec backend sh

# View migration status
psql $DATABASE_URL -c "\dt"

# Rollback all tables (destructive - for development only)
for f in $(ls -r backend/migrations/*.down.sql); do
  psql $DATABASE_URL -f "$f"
done
```

## API Reference

### Authentication

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "created_at": "2026-04-14T10:00:00Z"
  }
}
```

#### POST /auth/login
Log in with email and password.

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
Same as register response.

---

### Projects

All project endpoints require `Authorization: Bearer <token>` header.

#### GET /projects
List all projects the user owns or has tasks in.

**Response (200):**
```json
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
Create a new project.

**Request:**
```json
{
  "name": "New Project",
  "description": "Optional description"
}
```

**Response (201):** Project object (see above).

#### GET /projects/:id
Get project details including all tasks.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Website Redesign",
  "description": "Q2 project",
  "owner_id": "uuid",
  "created_at": "2026-04-01T10:00:00Z",
  "tasks": [
    {
      "id": "uuid",
      "title": "Design homepage",
      "description": "Create mockups",
      "status": "in_progress",
      "priority": "high",
      "project_id": "uuid",
      "assignee_id": "uuid",
      "due_date": "2026-04-20",
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-04-01T10:00:00Z"
    }
  ]
}
```

#### PATCH /projects/:id
Update project name/description (owner only).

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response (200):** Updated project object.

#### DELETE /projects/:id
Delete project and all its tasks (owner only).

**Response (204):** No content.

---

### Tasks

#### GET /projects/:id/tasks
List tasks in a project with optional filters.

**Query Parameters:**
- `status`: Filter by status (todo, in_progress, done)
- `assignee`: Filter by assignee UUID

**Response (200):**
```json
{
  "tasks": [{ "id": "...", "title": "..." }]
}
```

#### POST /projects/:id/tasks
Create a task in a project.

**Request:**
```json
{
  "title": "Design homepage",
  "description": "Create wireframes and mockups",
  "priority": "high",
  "assignee_id": "uuid",
  "due_date": "2026-04-20"
}
```

**Response (201):** Task object.

#### PATCH /tasks/:id
Update task (project owner only).

**Request (all fields optional):**
```json
{
  "title": "Updated title",
  "status": "done",
  "priority": "low",
  "assignee_id": "uuid",
  "due_date": "2026-05-01"
}
```

**Response (200):** Updated task object.

#### DELETE /tasks/:id
Delete task (project owner only).

**Response (204):** No content.

---

### Error Responses

**Validation Error (400):**
```json
{
  "error": "validation failed",
  "fields": {
    "email": "is required",
    "password": "must be at least 6 characters"
  }
}
```

**Unauthorized (401):**
```json
{
  "error": "unauthorized"
}
```

**Forbidden (403):**
```json
{
  "error": "forbidden"
}
```

**Not Found (404):**
```json
{
  "error": "not found"
}
```

---

## Project Structure

```
taskflow/
├── backend/
│   ├── main.go              # API server
│   ├── go.mod               # Go dependencies
│   ├── Dockerfile           # Multi-stage build
│   ├── migrate.sh           # Migration runner
│   └── migrations/
│       ├── 001_init_schema.up.sql
│       ├── 001_init_schema.down.sql
│       └── seed.sql
├── frontend/
│   ├── src/
│   │   ├── pages/           # Route pages
│   │   ├── components/      # Reusable components
│   │   ├── context/         # Auth context
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Router setup
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Tailwind imports
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml       # Orchestration
├── .env.example             # Environment template
└── README.md
```

## What You'd Do With More Time

### High Priority
1. **Pagination:** Add `?page=&limit=` query params to projects and tasks endpoints for scalability.
2. **Task Assignment UI:** Show available users in project when assigning tasks (currently just accepts UUID).
3. **Drag-and-drop Kanban:** Reorder tasks or drag between status columns instead of dropdown.
4. **Stats endpoint:** `GET /projects/:id/stats` returning task counts by status and assignee.

### Medium Priority
5. **Email Notifications:** Send emails when tasks are assigned or due.
6. **Search:** Full-text search on task titles and descriptions.
7. **Real-time Updates:** WebSocket or Server-Sent Events for collaborative updates.
8. **Dark Mode:** Toggle with localStorage persistence.
9. **Audit Logging:** Track who changed what and when.

### Lower Priority
10. **Team/Permissions:** More granular permissions (view-only, editor, admin roles).
11. **Bulk Operations:** Batch update multiple tasks.
12. **Recurring Tasks:** Repeat tasks on a schedule.
13. **Integrations:** Slack webhooks, calendar sync, etc.
14. **Mobile App:** React Native or Flutter version.

### Technical Improvements
15. **Testing:** Unit tests for business logic, integration tests for API endpoints, E2E tests with Playwright.
16. **Secrets Management:** Vault or environment-specific .env files instead of .env.example.
17. **Database Connection Pooling:** Better config for max connections, timeouts.
18. **Rate Limiting:** Prevent brute force attacks on login endpoint.
19. **CORS:** Proper CORS configuration for cross-origin requests.
20. **Caching:** Redis for frequently accessed data (projects list, user details).

## Deployment Notes

### Docker Compose (Development)
Ready to go: `docker compose up`

### Production Deployment
You'd need:
- Reverse proxy (nginx/Caddy) for SSL/TLS
- Managed PostgreSQL database
- Container registry (Docker Hub, ECR, GCR)
- Secrets management (AWS Secrets Manager, Vault)
- CI/CD pipeline (GitHub Actions, GitLab CI)
- Monitoring & logging (Prometheus, ELK stack)

## Code Quality Notes

- **Go backend:** Clean architecture with separated concerns (handlers, middleware, database queries). Error handling throughout. Structured logging for debugging.
- **React frontend:** Component composition, React Context for state, TypeScript for type safety. Accessibility could be improved (aria labels, keyboard navigation).
- **Database:** Proper migrations, indexes on foreign keys and frequently queried columns. Schema design follows relational normalization.
- **No third-party surprises:** Only standard, well-maintained dependencies (chi, pgx, React Router, Tailwind).

## Questions or Issues?

Please reach out. Good luck! 🚀
