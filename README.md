# TaskFlow - Full Stack Task Management System

A production-ready task management application built with Node.js, React, and PostgreSQL, fully containerized with Docker.

## 🚀 Quick Start (via Docker)

The easiest way to run TaskFlow is using Docker Compose. Ensure Docker Desktop is running.

1.  **Start the application**:
    ```bash
    docker compose up --build
    ```

2.  **Access the apps**:
    - **Frontend**: [http://localhost:3000](http://localhost:3000)
    - **Backend API**: [http://localhost:4000](http://localhost:4000)

3.  **Test Credentials**:
    - **Email**: `test@example.com`
    - **Password**: `password123`

## 🧠 Architecture & Design Decisions

### Backend: Clean Architecture & Security
- **Config Management**: Centralized `config.ts` enforces non-fallback environment variables (e.g., `JWT_SECRET`). The app crashes on startup if secrets are missing, preventing insecure configurations.
- **Service Layer Pattern**: Business logic is encapsulated in `services/`. Routes handle HTTP concerns (request parsing, response shaping), while services handle data orchestration. This ensures high testability.
- **Strict Authorization**: Implemented robust middleware checks. Task modification requires access to the parent project, and task deletion is restricted to project owners, preventing cross-tenant access.
- **Unified Error Protocol**: A global `errorHandler` middleware catches synchronous and asynchronous (via `next()`) errors, returning standardized JSON payloads.

### Database: Optimized Schema
- **Indexing**: Custom migrations add indexes on frequently filtered columns (`email`, `project_id`, `owner_id`, `assignee_id`) to maintain performance as data grows.
- **UUIDs**: Native PostgreSQL UUIDs used for all primary keys to ensure global uniqueness and obfuscate record counts.

### Frontend: Modular & Premium UI
- **Component Breakdown**: Refactored "God-file" pages into highly reusable, granular components (`TaskCard`, `Spinner`, `EmptyState`, `TaskModal`).
- **Responsive & Dynamic**: Built with a mobile-first approach using Tailwind CSS. Added entrance and interaction animations (`animate-in`, `hover:scale-105`) to create a "Premium" feel.
- **Resilient States**: Every dynamic view handles loading, error (with retry logic), and empty states properly.

## 🌐 API Reference

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/auth/register` | POST | No| Create a new user account |
| `/auth/login` | POST | No | Authenticate and get JWT token |
| `/projects` | GET | Yes | List all projects for current user |
| `/projects` | POST | Yes | Create a new project |
| `/projects/:id` | GET | Yes | Get project details |
| `/projects/stats` | GET | Yes | Get usage summary (Bonus) |
| `/projects/:id/tasks` | GET | Yes | List tasks (supports ?status= & ?assignee=) |
| `/tasks/:id` | PATCH| Yes | Update task status, assignee, etc. |
| `/tasks/:id` | DELETE| Yes | Delete task (Project Owner only) |

## ⚖️ Tradeoffs & Future Improvements

- **WebSockets**: Real-time updates were sacrificed for a stable REST-based optimistic UI to fit the assignment timeline. I would implement Socket.io for live collaboration next.
- **Data Fetching**: Currently using custom Axios hooks. Transitioning to **React Query** (TanStack Query) would be the next step to handle caching and background revalidation.
- **Security Check**: Currently using JWT-in-Memory on the client. For production, **HttpOnly Cookies** would be implemented to mitigate XSS risks.
- **E2E Testing**: Backend units are modular, but adding **Playwright** for frontend integration testing would ensure zero-regression flows.

---
Created for the Zomato Engineering Assignment.
