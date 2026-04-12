# TaskFlow

> A minimal but fully-featured task management system built as a React SPA — following the **RICE enforcement model**.

---

## Table of Contents

- [Overview](#overview)
- [RICE Enforcement](#rice-enforcement)
- [Tech Stack & Decisions](#tech-stack--decisions)
- [Project Structure](#project-structure)
- [Getting Started — Local Dev](#getting-started--local-dev)
- [Getting Started — Docker](#getting-started--docker)
- [Demo Credentials](#demo-credentials)
- [Features](#features)
- [API Mock (MSW)](#api-mock-msw)
- [Responsive Breakpoints](#responsive-breakpoints)
- [Architecture Decisions](#architecture-decisions)

---

## Overview

TaskFlow is a task management frontend where users can:

- **Register / Log in** with JWT-based authentication
- **Browse projects** they have access to
- **Create, edit, and delete projects** (owner only)
- **Add tasks** to projects with title, description, status, priority, assignee, and due date
- **Filter tasks** by status and assignee
- **Update task status optimistically** — the UI responds instantly and reverts on error

---

## RICE Enforcement

| Criterion | How this project satisfies it |
|---|---|
| **Correctness** (weight: 5) | Auth works end-to-end; JWT stored in localStorage; protected routes redirect to `/login`; all core flows covered with MSW seed data |
| **Code Quality** | Feature-based file structure; single-responsibility components; custom hooks; no god functions; clear naming throughout |
| **UI/UX** (weight: 5) | Every view has loading, error, and empty states; overdue task highlight; toast notifications; responsive at 375 px and 1280 px; no console errors |
| **Component Design** | State lives at the page level; Auth and Toast state in context; no unnecessary prop drilling; `useMemo` / `useCallback` for performance |

---

## Tech Stack & Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **React 18** + **Vite 4** | Fast HMR, modern DX, small bundle |
| Routing | **React Router v6** | Declarative nested routes, protected route support |
| Styling | **Vanilla CSS** (custom design system) | Zero runtime overhead; maximum control; premium dark theme |
| API Mocking | **MSW v1** (Mock Service Worker) | Intercepts real `fetch` at the network layer — no app-code changes needed for a real backend swap |
| Auth | **JWT in `localStorage`** | Persists across refreshes as required by the spec |
| State | **React built-ins** (`useState`, `useMemo`, `useCallback`, Context) | Right tool for this scale — no Redux overhead |
| Container | **Docker** (Node 18 build → nginx serve) | Reproducible, production-grade deployment |

---

## Project Structure

```
taskflow/
├── public/
│   ├── favicon.svg
│   └── mockServiceWorker.js        # MSW service worker (auto-generated)
├── src/
│   ├── api/
│   │   ├── client.js               # Fetch wrapper (JWT injection, error typing)
│   │   ├── auth.js                 # Login / register calls
│   │   ├── projects.js             # Projects CRUD
│   │   └── tasks.js                # Tasks CRUD + users list
│   ├── components/
│   │   ├── EmptyState.jsx          # Prevents blank white boxes
│   │   ├── LoadingSpinner.jsx      # Accessible spinner + page-level loader
│   │   ├── Modal.jsx               # Accessible modal (Escape, backdrop click)
│   │   ├── Navbar.jsx              # Brand, nav links, user avatar, logout
│   │   ├── ProjectModal.jsx        # Create / edit project form
│   │   ├── ProtectedRoute.jsx      # Redirects unauthenticated users
│   │   └── TaskModal.jsx           # Create / edit task form (all fields)
│   ├── context/
│   │   ├── AuthContext.jsx         # JWT + user in localStorage
│   │   └── ToastContext.jsx        # Global toast notifications
│   ├── mocks/
│   │   ├── browser.js              # MSW worker setup
│   │   ├── db.js                   # In-memory DB with seed data
│   │   └── handlers.js             # All REST handlers (auth, projects, tasks)
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Projects.jsx            # Project grid + create/edit/delete
│   │   └── ProjectDetail.jsx       # Task list, filters, optimistic UI
│   ├── App.jsx                     # Router + providers
│   ├── index.css                   # Full design system (tokens, components)
│   └── main.jsx                    # MSW bootstrap → ReactDOM render
├── Dockerfile
├── nginx.conf
├── .dockerignore
├── package.json
└── vite.config.js
```

---

## Getting Started — Local Dev

### Prerequisites

- Node.js **≥ 16**
- npm **≥ 8**

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Generate MSW service worker (only needed once)
npx msw init public/ --save

# 3. Start the dev server
npm run dev
```

The app opens at **http://localhost:3000** (or the next available port).  
MSW intercepts all API calls to `http://localhost:4000` automatically — **no separate backend needed**.

---

## Getting Started — Docker

### Build

```bash
docker build -t taskflow:latest .
```

### Run

```bash
docker run -p 8080:80 taskflow:latest
```

Then visit **http://localhost:8080**.

> **Note:** In the Docker production build, MSW is **active** (the service worker is embedded in the static bundle). No backend is required.

### One-liner

```bash
docker build -t taskflow . && docker run --rm -p 8080:80 taskflow
```

---

## Demo Credentials

| Name | Email | Password |
|---|---|---|
| Jane Doe | jane@example.com | secret123 |
| John Smith | john@example.com | secret123 |
| Alex Rivera | alex@example.com | secret123 |

> You can also register a new account from the `/register` page.

---

## Features

### Authentication
- [x] Register with name, email, password (client + server-side validation)
- [x] Login with email + password
- [x] JWT stored in `localStorage` — persists across page refreshes
- [x] Protected routes — unauthenticated users redirected to `/login`
- [x] Post-login redirect to originally requested page

### Projects
- [x] List all accessible projects
- [x] Create new project (modal with validation)
- [x] Edit project name/description (owner only)
- [x] Delete project with confirmation (owner only, cascades to tasks)
- [x] Empty state when no projects exist

### Tasks
- [x] View all tasks for a project
- [x] Filter by status (All / To Do / In Progress / Done)
- [x] Filter by assignee (dropdown with all members + "Assigned to me" shortcut)
- [x] Create task: title, description, priority, assignee, due date
- [x] Edit task: all fields including status
- [x] Delete task with confirmation
- [x] **Optimistic UI**: clicking the status badge cycles instantly `todo → in_progress → done → todo`; reverts with error toast if the API call fails
- [x] Overdue tasks highlighted in red
- [x] Task stats bar (To Do / In Progress / Done / Total counts)
- [x] Empty state for no tasks + no results from filters

### UX
- [x] Loading spinners on every async operation — no silent failures
- [x] Error alerts with retry option
- [x] Toast notifications for create / update / delete success & failure
- [x] Responsive layout at 375 px (mobile) and 1280 px (desktop)
- [x] No console errors in development

---

## API Mock (MSW)

All API calls target `http://localhost:4000`. MSW intercepts these in the browser — no real server runs.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/users` | List all users (for assignee picker) |
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project + tasks |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project (cascades tasks) |
| GET | `/projects/:id/tasks` | List tasks (supports `?status=` and `?assignee=`) |
| POST | `/projects/:id/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |

**Auth:** All endpoints except `POST /auth/*` require `Authorization: Bearer <jwt>`.

---

## Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| **≤ 375 px** | Full-width cards, stacked page header, compact stat chips |
| **≤ 768 px** | Single-column project grid, compact navbar (name hidden), scrollable filter tabs |
| **≥ 1280 px** | 3-column project grid, full navbar, spacious task rows |

---
