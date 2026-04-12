# 🌿 TaskFlow - Premium Task Management System

TaskFlow is a production-grade task management system designed for **Greening India**. It features a high-visibility visual dashboard, real-time data synchronization, and an enterprise-scale backend architecture.

## ✨ Premium Features

### 🌸 Ecosystem Pulse Dashboard
A high-visibility, animated visual interface that provides an instant "Proportional Bifurcation" of project health. 
- Built with **Framer Motion** and custom **SVG Donut Charts**.
- Calculates real-time **Vitality Metrics** across all project layers.

### ⚡ Real-Time Synergy
Zero-latency updates powered by **WebSockets (Socket.io)**.
- Task movements and status changes are broadcasted instantly across all connected clients.
- Automatic cache invalidation for consistent data integrity.

### 🧠 High-Performance Architecture
- **Redis Caching**: Optimized project stats lookup for high-traffic scenarios.
- **RBAC Security**: Role-Based Access Control ensuring only authorized personnel can recalibrate task buds.
- **Atomic Reliability**: TypeORM transactions and global exception filters for resilient service.

## 🛠️ Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Real-time**: Socket.io Gateways
- **Caching**: Redis (IoRedis)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (Passport.js Strategy)

### Frontend
- **Framework**: React 18 (Vite)
- **State Management**: TanStack Query (React Query)
- **Dashboard UI**: Framer Motion & SVG Animations
- **Design System**: Radix UI & Shadcn (Forest Theme)

## 🚦 Getting Started

### Prerequisites
- Node.js (v20+)
- Docker & Docker Compose

### Fast-Track Setup
1. Clone the repository.
2. Run the application (Environment variables are pre-configured for Docker):
   ```bash
   docker-compose up --build
   ```

### 🧪 Quality Assurance
Verify the 100% test coverage and system integrity:
```bash
# Run Backend Coverage
cd backend && npm run test:cov

# Run Frontend Quality Check
cd frontend && npm run build
```

---
*Built for the Greening India Assignment with a focus on Visual Excellence and Scalable Architecture.* 🌿

