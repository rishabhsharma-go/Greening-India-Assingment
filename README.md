# 🚀 TaskFlow — Full Stack Task Management System

TaskFlow is a minimal yet production-oriented task management system that allows users to manage projects and tasks efficiently.

This project demonstrates:
- Full-stack engineering (backend + frontend)
- Authentication & authorization
- RESTful API design
- Database modeling with PostgreSQL
- Dockerized deployment
- Clean architecture and tradeoffs

---

# 📌 Features

### 🔐 Authentication
- User registration & login
- Password hashing using bcrypt
- JWT-based authentication (24h expiry)
- Protected API routes

### 📁 Projects
- Create projects
- View all projects
- Project-level ownership (basic)

### ✅ Tasks
- Create tasks within a project
- Update task status (todo → in_progress → done)
- Filter tasks by status
- Task listing per project

### 🎯 UX Features
- Error handling (API + UI)
- Loading states
- Protected routes (frontend)
- Persistent login using localStorage

---

# 🧱 Tech Stack

## Backend
- **Language:** Go
- **Framework:** Gin
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt
- **DB Driver:** pgx

## Frontend
- **Framework:** React
- **Language:** TypeScript
- **Routing:** React Router
- **HTTP Client:** Axios

## Infrastructure
- Docker
- Docker Compose

---

# 🏗️ Architecture Overview

## High-Level Architecture
# 🚀 TaskFlow — Full Stack Task Management System

TaskFlow is a minimal yet production-oriented task management system that allows users to manage projects and tasks efficiently.

This project demonstrates:
- Full-stack engineering (backend + frontend)
- Authentication & authorization
- RESTful API design
- Database modeling with PostgreSQL
- Dockerized deployment
- Clean architecture and tradeoffs

---

# 📌 Features

### 🔐 Authentication
- User registration & login
- Password hashing using bcrypt
- JWT-based authentication (24h expiry)
- Protected API routes

### 📁 Projects
- Create projects
- View all projects
- Project-level ownership (basic)

### ✅ Tasks
- Create tasks within a project
- Update task status (todo → in_progress → done)
- Filter tasks by status
- Task listing per project

### 🎯 UX Features
- Error handling (API + UI)
- Loading states
- Protected routes (frontend)
- Persistent login using localStorage

---

# 🧱 Tech Stack

## Backend
- **Language:** Go
- **Framework:** Gin
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt
- **DB Driver:** pgx

## Frontend
- **Framework:** React
- **Language:** TypeScript
- **Routing:** React Router
- **HTTP Client:** Axios

## Infrastructure
- Docker
- Docker Compose

---

# 🏗️ Architecture Overview

## High-Level Architecture
[ React Frontend ] ---> [ Go Backend API ] ---> [ PostgreSQL DB ]
| | |
Axios API calls Business logic Relational data
Auth storage Auth validation Users/Projects/Tasks


---

## Backend Architecture
internal/
├── handlers/ → HTTP layer (controllers)
├── middleware/ → Auth (JWT validation)
├── utils/ → hashing, JWT, responses
├── db/ → database connection


### Design Principles

- **Separation of Concerns**
  - Handlers only deal with HTTP
  - Business logic isolated
- **Stateless Auth**
  - JWT used instead of sessions
- **Explicit SQL**
  - Avoided heavy ORM for clarity

---

## Frontend Architecture
src/
├── api/ → Axios client
├── context/ → Auth state (global)
├── pages/ → Screens (Login, Projects, ProjectDetail)
├── hooks/ → Custom hooks (optional)


### Design Principles

- **Centralized API layer**
- **Global auth state via Context**
- **Route-based navigation**
- **Component-level state management**

---

# 🗄️ Data Model

### User
| Field | Type |
|------|------|
| id | UUID |
| name | string |
| email | string (unique) |
| password | hashed |

---

### Project
| Field | Type |
|------|------|
| id | UUID |
| name | string |
| description | string |

---

### Task
| Field | Type |
|------|------|
| id | UUID |
| title | string |
| status | enum |
| priority | enum |
| project_id | UUID |
| assignee_id | UUID |

---

# 🔐 Authentication Flow

1. User logs in
2. Backend verifies credentials
3. JWT token issued
4. Frontend stores token in localStorage
5. Axios sends token in Authorization header

Authorization: Bearer <token>

---

# 📡 API Design

## Auth
- `POST /auth/register`
- `POST /auth/login`

## Projects
- `GET /projects`
- `POST /projects`

## Tasks
- `GET /projects/:id/tasks?status=`
- `POST /projects/:id/tasks`
- `PATCH /tasks/:id`

---

# ⚙️ Running the Project

## 🐳 Recommended: Docker (One Command)

### Step 1: Clone

```bash
git clone <your-repo-url>
cd Greening-India-Assingment

Step 2: Setup env
cp .env.example .env

Step 3: Run
docker compose up --build

Step 4: Access
Frontend → http://localhost:3000
Backend → http://localhost:8080

One-Time DB Setup
Run this SQL:
CREATE TABLE users (...);
CREATE TABLE projects (...);
CREATE TABLE tasks (...);

Test Credentials
Email: test@example.com
Password: password123

Design Decisions & Tradeoffs
✅ Decisions
Used JWT instead of sessions
Stateless & scalable
Used raw SQL instead of ORM
Better control and clarity
Used Context API instead of Redux
Simpler state management

Tradeoffs
No auto migrations (manual step)
Basic UI (focused on functionality)
No pagination implemented
No role-based access control

What I’d Improve With More Time
Pagination (?page=&limit=)
Project ownership enforcement
Drag-and-drop Kanban board
WebSocket real-time updates
Dark mode
Unit & integration tests
CI/CD pipeline

Docker Notes
Uses service name db for DB connection
Multi-container setup
One command startup

Security Considerations
Passwords hashed with bcrypt
JWT expiry (24h)
Protected routes
No secrets committed (.env ignored)

Testing Strategy (Planned)
API integration tests
Auth flow testing
Task CRUD tests

Final Thoughts
This project focuses on:
Completeness over partial demos
Clean architecture
Real-world engineering practices

Thank You
Thanks for reviewing this project.
Looking forward to discussing the implementation and tradeoffs!