# Clove

A full-stack enterprise agroforestry platform built for Eternal/Zomato's tree-planting initiative. Tracks land parcels, tree instances, telemetry measurements, and carbon sequestration with cryptographic audit chaining for Verra registry compliance.

---

## 1. Overview

**What it does:**
- Manage field projects and tasks (operational layer)
- Register land parcels with GeoJSON polygon boundaries and ASI scoring
- Track individual tree instances by GPS coordinates and species
- Ingest real-time telemetry (height, diameter, health) via idempotent events
- Compute CO2e carbon sequestration using allometric AGB/BGB equations
- Maintain an immutable, SHA-256-chained carbon audit log

**Tech stack:**
| Layer | Technology |
|---|---|
| Backend | Rust, Axum 0.7, microservices (Hexagonal/Ports & Adapters) |
| Database | PostgreSQL 16 + PostGIS |
| DB access | sqlx 0.8 (no ORM, raw SQL) |
| Migrations | sqlx::migrate!() (SQL files in /migrations) |
| Auth | JWT (jsonwebtoken crate), bcrypt cost 12 |
| Messaging | Apache Kafka (telemetry pipeline) |
| Cache | Redis 7 (idempotency keys) |
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS |
| UI components | Custom Tailwind components + Lucide React icons (no third-party component library) |
| State | TanStack Query + Zustand |
| Containerization | Docker Compose |

---

## 2. Architecture Decisions

**Hexagonal (Ports & Adapters):** Every service has a pure `domain/` module with no external imports, `ports/` with trait definitions, and `adapters/` with implementations. This makes the business logic independently testable.

**Microservices split:**
- `gateway` (8000) — JWT validation, user auth, reverse proxy to downstream services
- `management` (8001) — Projects and Tasks (TaskFlow spec)
- `geospatial` (8002) — Land parcels and tree instances with PostGIS spatial queries
- `telemetry` (8003) — Measurement event ingestion via worker pool → Kafka
- `carbon` (8004) — Kafka consumer → AGB math → SHA-256 chained audit records

**Why Kafka for telemetry?** Telemetry events arrive in bursts from field devices. A bounded worker pool + Kafka producer decouples ingestion from carbon computation, preventing backpressure from blocking HTTP responses.

**Redis idempotency:** Field devices may retry POST /telemetry on network failures. Redis SET NX with 24h TTL ensures duplicate events are detected and skipped without re-processing.

**SHA-256 hash chaining:** Each `carbon_audit` record stores `hash = SHA256(audit_json + prev_hash)`. This creates a Merkle-style chain per parcel — tampering with any record breaks all subsequent hashes, making it suitable for Verra registry audits.

**What was intentionally left out:**
- Cassandra (prescribed in spec) — replaced with PostgreSQL time-series queries for simplicity. For 2.5M+ trees at production scale, a dedicated time-series store would be needed.
- Kubernetes manifests — Docker Compose is sufficient for evaluation; K8s adds complexity without benefit here.
- Real ASI scoring integration — ASI validation calls a stub that computes a score from parcel area. The NITI Aayog dataset integration is noted as future work.

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
- Geospatial: http://localhost:8002
- Telemetry: http://localhost:8003
- Carbon: http://localhost:8004

First startup takes ~5–10 minutes to compile all Rust binaries. Subsequent starts are fast (layers cached).

---

## 4. Running Migrations

Migrations run **automatically** when the gateway container starts. The gateway embeds all SQL files via `sqlx::migrate!()` and applies them on boot.

To run the seed script (adds a demo project and 3 tasks — requires the gateway to have started at least once to create the test user):
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

The seed also creates 3 tree species (Bamboo, Seabuckthorn, Teak) with allometric coefficients.

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

### Geospatial (via Gateway)

| Method | Endpoint | Notes |
|---|---|---|
| GET | /parcels | List parcels |
| POST | /parcels | `{ polygon: GeoJSON, soil_type, project_id? }` |
| GET | /parcels/:id | Single parcel |
| PATCH | /parcels/:id | Update parcel |
| DELETE | /parcels/:id | Delete parcel |
| POST | /parcels/:id/validate | Compute ASI score, set status |
| GET | /parcels/:id/trees | List trees in parcel |
| POST | /parcels/:id/trees | `{ species_id, gps_point: GeoJSON Point, planting_date, status? }` |

### Telemetry (via Gateway)

| Method | Endpoint | Notes |
|---|---|---|
| POST | /telemetry | `{ tree_id, event_timestamp, height_cm, diameter_cm, health_status, idempotency_key }` |
| GET | /trees/:id/measurements | Time-series for a tree |

### Carbon (via Gateway)

| Method | Endpoint | Notes |
|---|---|---|
| GET | /audits | List all audits |
| GET | /audits/:id | Single audit with hash |
| GET | /parcels/:id/carbon-report | Compute and store fresh CO2e audit for parcel |

**Error format:**
```json
{ "error": "message" }
```

**Auth header:** `Authorization: Bearer <token>`

---

## 7. What You'd Do With More Time

- **Integration tests** — 3+ integration tests for auth, task CRUD, and carbon computation hitting a real test database
- **Cassandra for telemetry** — Replace PostgreSQL time-series queries with Cassandra for write-heavy telemetry at 2.5M tree scale
- **Real ASI validation** — Integrate NITI Aayog GeoJSON boundaries via PostGIS ST_Intersects for genuine Agro-Silvi Index scoring
- **Pagination** — Add `?page=&limit=` to all list endpoints
- **WebSocket** — Real-time task status updates across collaborative project members
- **Verra API integration** — Submit signed carbon audit chains directly to the Verra registry API
- **Dark mode** — Frontend dark mode toggle with Zustand persistence
- **Within-column drag reordering** — Current drag-and-drop supports cross-column status changes; adding an explicit sort order column to tasks would enable reordering within a column
- **Rate limiting** — Redis-backed rate limiter on the gateway for telemetry ingestion endpoints
