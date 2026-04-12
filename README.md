# 🌊 TaskFlow - Enterprise Task Management System

TaskFlow is a production-grade task management system built with **NestJS** and **React**. It follows industry-standard design patterns, including RBAC, API versioning, and global error handling.

## 🛠️ Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/) (Node.js) - **IMPORTANT: THIS IS A NESTJS APP**
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT (Passport.js)
- **Architecture**: Domain-Driven Modules
- **Logging**: nestjs-pino (Structured Logging)
- **Versioning**: URI-based (v1)

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Animations**: Framer Motion
- **State Management**: TanStack Query (React Query)
- **Drag & Drop**: @hello-pangea/dnd

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Migrations**: TypeORM Migration System
- **Seeding**: typeorm-extension with Faker.js

## 🚦 Getting Started

### Prerequisites
- Node.js (v20+)
- Docker & Docker Compose

### Setup
1. Clone the repository.
2. Create `.env` files based on `.env.example` in both `backend` and `frontend`.
3. Run the application:
   ```bash
   docker-compose up --build
   ```

### 🧪 Test Credentials
Once the application is up, use these credentials to log in immediately:
- **Email**: `test@example.com`
- **Password**: `password123`

### 🏗️ Architecture Design Patterns
- **Data Mapper Pattern**: Using TypeORM entities and repositories.
- **Dependency Injection**: NestJS core DI system for decoupled services.
- **Global Error Handling**: Centralized `HttpExceptionFilter`.
- **RBAC Guard**: Role-based access control for secure operations.
- **API Versioning**: Scalable API evolution without breaking changes.

## 📈 Scalability Features
- **Pagination**: Implemented on all listing endpoints to handle large datasets.
- **Optimized SQL**: Explicit migrations and indexed UUIDs.
- **Responsive UI**: Mobile-first design using Tailwind CSS.
- **Atomic Components**: Reusable UI primitives via Shadcn.

---
*Built with ❤️ using NestJS and React.*
