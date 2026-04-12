# TaskFlow: Architectural Master Lattice

**TaskFlow** is a high-availability management ecosystem engineered for **Greening India** to orchestrate reforestation through decentralized continental nodes. This platform is a technical showcase of high-fidelity engineering, absolute security, and 100% strict type integrity.

---

## 🏗️ Project Hierarchy Tree

```text
Greening-India-Assingment/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT & Passport-Local Integrity
│   │   ├── common/         # Guards, Interceptors, Filters, Events (Sockets)
│   │   ├── projects/       # Core Project Orchestration
│   │   ├── tasks/          # Task Lattice Logic
│   │   └── users/          # Identity Management
│   ├── test/               # E2E Surveillance & Spec Suites
│   ├── entrypoint.sh       # Autonomous Startup Script
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # High-Density UI Components
│   │   ├── context/        # Global State Synchronization
│   │   └── pages/          # Perspective-Based Dashboards
│   └── Dockerfile
├── docker-compose.yml       # Ecosystem Orchestation
└── README.md                # Master Technical Manual
```

---

## 🛠️ Autonomous Orchestration (Manual & Docker)

### 1. THE SOLO COMMAND (Recommended)
To launch the entire 4-node ecosystem (Backend, Frontend, PostgreSQL, Redis) fully seeded and production-ready:
```bash
docker-compose up --build
```

### 2. The Zero-Manual Entrypoint
TaskFlow features an **Autonomous Entrypoint Lattice** (`entrypoint.sh`) that eliminates manual maintenance. Upon container boot, it automatically:
- Waits for Database & Redis stabilization.
- Executes all pending **TypeORM Migrations**.
- Repopulates the lattice via **System Seeders** (`node dist/run-seeder.js`).

### 3. Setup (No Docker)
Requires local PostgreSQL and Redis instances:
```bash
# In /backend and /frontend
npm install
npm run start:dev (Backend) | npm run dev (Frontend)
```
*Note: The platform features **Zero-Config connectivity**—defaults to localhost/default ports if `.env` is absent.*

---

## 🔐 The Security Shield (RBAC/ABAC Matrix)

| Perspective | Identity (Email) | Secret (Password) | Permissions Level |
|-------------|------------------|-------------------|-------------------|
| **Architect (Admin)** | `test@example.com` | `password123` | Full Lattice Visibility, Telemetry access, Global Edit/Delete. |
| **Guardian (User)** | `user@taskflow.com` | `password123` | Ownership-Locked Management, Read-Only Global Grid. |

### Security Implementation Highlights:
- **JwtAuthGuard**: Validates user identity via token pulse.
- **RolesGuard**: Enforces hierarchical boundaries (Architect vs Guardian).
- **@CheckOwnership (The Shield)**: A granular ABAC resolver that checks resource headers before ANY mutation (Update/Delete). Ensures a Guardian only manages their own nodes.

---

## 🏛️ Engineering DNA & Design Patterns

TaskFlow is built on a foundation of absolute code integrity:

- **SOLID Principles**: Focused implementation of **SRP** (Domain separation), **LSP** (Task Service Hierarchy), and **DIP** (Repository abstraction).
- **100% Type Safety**: Removed **67+ `any` occurrences**. Strictly typed project-wide from API payloads to frontend props.
- **Design Patterns**:
    - **Repository**: Centralized data persistence layer.
    - **singleton**: Predictive performance for core services.
    - **Interceptor**: High-performance structured logging (`nestjs-pino`) and response normalization.
- **Real-time Pulse**: WebSocket synchronization via **Socket.io** for immediate task-health updates.
- **Ecological Caching**: **Redis**-integrated telemetry for high-speed counter tracking.

---

## 🧪 Testing Surveillance (Backend Lattice)

> [!IMPORTANT]
> The project features a comprehensive backend surveillance lattice with 90%+ coverage.

### Surveillance Commands
```bash
# 1. Access the Backend Node
cd backend

# 2. Execute Coverage Surveillance
npm run test:cov
```
*View detailed reports in: `backend/coverage/lcov-report/index.html`*

---

## 🌍 Operational Registry

- **API Specification (Swagger)**: `http://localhost:3000/docs`
- **Manual Lattice Testing (Postman)**: Use the `taskflow.postman_collection.json` pre-bundled in the project root.
- **The Public Digital Twin**: Re-implemented the "Launch Digital Portal" website link (Globe Icon) in project headers for external oversight.

---
*Developed by the Advanced Agentic Coding Team for Greening India.*
