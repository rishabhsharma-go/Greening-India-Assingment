# TaskFlow — API Test Reference

Base URL: `http://localhost:4000`

> **Quick start**
> ```bash
> cp .env.example .env
> # Set JWT_SECRET in .env  (any long random string works locally)
> docker compose up --build
> ```
> Wait for the `seed` container to exit (≈ 60 s on first run), then use the
> credentials below.

---

## Seed Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | `test@example.com` |
| Password | `password123`      |

---

## 1. Health Check

```bash
curl -s http://localhost:4000/health | jq
```

**Expected**
```json
{"status":"ok"}
```

---

## 2. Auth

### 2.1 Register a new user

```bash
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Dev",
    "email": "alice@example.com",
    "password": "securepass99"
  }' | jq
```

**Expected — 201 Created**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "name": "Alice Dev",
    "email": "alice@example.com",
    "created_at": "2026-04-13T00:00:00Z"
  }
}
```

**Validation error — 400**
```bash
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"bad-email","password":"short"}' | jq
```
```json
{
  "error": "validation failed",
  "fields": {
    "email": "is not a valid email",
    "name": "is required",
    "password": "must be at least 8 characters"
  }
}
```

**Duplicate email — 400**
```bash
# Run the register command above a second time
```
```json
{
  "error": "validation failed",
  "fields": { "email": "already in use" }
}
```

---

### 2.2 Login

```bash
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq
```

**Expected — 200 OK**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "Test User", "email": "test@example.com", "created_at": "..." }
}
```

**Save the token for all further requests:**
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')

echo $TOKEN
```

**Wrong password — 401**
```bash
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpass"}' | jq
```
```json
{ "error": "invalid credentials" }
```

---

## 3. Projects

> All project/task endpoints require `Authorization: Bearer <token>`.

### 3.1 List projects

```bash
curl -s http://localhost:4000/projects \
  -H "Authorization: Bearer $TOKEN" | jq
```

**With pagination:**
```bash
curl -s "http://localhost:4000/projects?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected — 200 OK**
```json
{
  "projects": [
    {
      "id": "00000000-0000-0000-0000-000000000010",
      "name": "Website Redesign",
      "description": "Complete overhaul of the marketing site for Q2 launch",
      "owner_id": "00000000-0000-0000-0000-000000000001",
      "created_at": "..."
    }
  ],
  "meta": { "page": 1, "limit": 5, "total": 1, "has_next": false }
}
```

---

### 3.2 Create a project

```bash
curl -s -X POST http://localhost:4000/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App",
    "description": "iOS and Android companion app"
  }' | jq
```

**Expected — 201 Created**
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "Mobile App",
  "description": "iOS and Android companion app",
  "owner_id": "...",
  "created_at": "..."
}
```

**Save the new project ID:**
```bash
PROJECT_ID=$(curl -s -X POST http://localhost:4000/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"For curl testing"}' | jq -r '.id')

echo $PROJECT_ID
```

---

### 3.3 Get project (with embedded tasks)

```bash
# Using the seeded project
curl -s http://localhost:4000/projects/00000000-0000-0000-0000-000000000010 \
  -H "Authorization: Bearer $TOKEN" | jq
```

```bash
# Using your newly created project
curl -s http://localhost:4000/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected — 200 OK**
```json
{
  "id": "...",
  "name": "Website Redesign",
  "description": "...",
  "owner_id": "...",
  "created_at": "...",
  "tasks": [
    { "id": "...", "title": "Design new homepage", "status": "done", "priority": "high", ... },
    { "id": "...", "title": "Implement responsive navigation", "status": "in_progress", ... },
    { "id": "...", "title": "SEO audit and meta tags", "status": "todo", ... }
  ]
}
```

**Not found — 404**
```bash
curl -s http://localhost:4000/projects/00000000-0000-0000-0000-000000000999 \
  -H "Authorization: Bearer $TOKEN" | jq
```
```json
{ "error": "not found" }
```

---

### 3.4 Update a project (owner only)

```bash
curl -s -X PATCH http://localhost:4000/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project — Updated",
    "description": "Updated via PATCH"
  }' | jq
```

**Partial update (description only):**
```bash
curl -s -X PATCH http://localhost:4000/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Only description changed"}' | jq
```

**Non-owner attempt — 403**
```bash
# Log in as jane, try to update a project owned by test@example.com
JANE_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"password123"}' | jq -r '.token')

curl -s -X PATCH http://localhost:4000/projects/00000000-0000-0000-0000-000000000010 \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hijack attempt"}' | jq
```
```json
{ "error": "forbidden" }
```

---

### 3.5 Get project stats (bonus endpoint)

```bash
curl -s http://localhost:4000/projects/00000000-0000-0000-0000-000000000010/stats \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected — 200 OK**
```json
{
  "project_id": "00000000-0000-0000-0000-000000000010",
  "by_status": { "done": 1, "in_progress": 1, "todo": 1 },
  "by_assignee": {
    "00000000-0000-0000-0000-000000000001": 1,
    "00000000-0000-0000-0000-000000000002": 1,
    "unassigned": 1
  }
}
```

---

### 3.6 Delete a project

```bash
curl -s -X DELETE http://localhost:4000/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

**Expected — HTTP 204 (no body)**

---

## 4. Tasks

### 4.1 List tasks for a project

```bash
curl -s "http://localhost:4000/projects/00000000-0000-0000-0000-000000000010/tasks" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Filter by status:**
```bash
curl -s "http://localhost:4000/projects/00000000-0000-0000-0000-000000000010/tasks?status=todo" \
  -H "Authorization: Bearer $TOKEN" | jq

curl -s "http://localhost:4000/projects/00000000-0000-0000-0000-000000000010/tasks?status=in_progress" \
  -H "Authorization: Bearer $TOKEN" | jq

curl -s "http://localhost:4000/projects/00000000-0000-0000-0000-000000000010/tasks?status=done" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Filter by assignee:**
```bash
curl -s "http://localhost:4000/projects/00000000-0000-0000-0000-000000000010/tasks?assignee=00000000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Combined filter + pagination:**
```bash
curl -s "http://localhost:4000/projects/00000000-0000-0000-0000-000000000010/tasks?status=todo&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Invalid status — 400**
```bash
curl -s "http://localhost:4000/projects/00000000-0000-0000-0000-000000000010/tasks?status=invalid" \
  -H "Authorization: Bearer $TOKEN" | jq
```
```json
{
  "error": "validation failed",
  "fields": { "status": "must be todo, in_progress, or done" }
}
```

---

### 4.2 Create a task

```bash
# First create a project to add tasks to
PROJECT_ID=$(curl -s -X POST http://localhost:4000/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project"}' | jq -r '.id')
```

**Full payload:**
```bash
curl -s -X POST "http://localhost:4000/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write API documentation",
    "description": "Cover all endpoints with request/response examples",
    "priority": "high",
    "assignee_id": "00000000-0000-0000-0000-000000000001",
    "due_date": "2026-04-30"
  }' | jq
```

**Minimal payload (only title required):**
```bash
curl -s -X POST "http://localhost:4000/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Quick task"}' | jq
```

**Expected — 201 Created**
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "title": "Write API documentation",
  "description": "Cover all endpoints with request/response examples",
  "status": "todo",
  "priority": "high",
  "project_id": "...",
  "assignee_id": "00000000-0000-0000-0000-000000000001",
  "due_date": "2026-04-30T00:00:00Z",
  "created_at": "...",
  "updated_at": "..."
}
```

**Save the task ID:**
```bash
TASK_ID=$(curl -s -X POST "http://localhost:4000/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","priority":"medium"}' | jq -r '.id')

echo $TASK_ID
```

**Missing title — 400**
```bash
curl -s -X POST "http://localhost:4000/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priority":"high"}' | jq
```
```json
{
  "error": "validation failed",
  "fields": { "title": "is required" }
}
```

---

### 4.3 Update a task (PATCH — all fields optional)

**Change status only:**
```bash
curl -s -X PATCH "http://localhost:4000/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}' | jq
```

**Change priority only:**
```bash
curl -s -X PATCH "http://localhost:4000/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priority": "low"}' | jq
```

**Full update:**
```bash
curl -s -X PATCH "http://localhost:4000/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated task title",
    "description": "New description",
    "status": "done",
    "priority": "high",
    "assignee_id": "00000000-0000-0000-0000-000000000002",
    "due_date": "2026-05-15"
  }' | jq
```

**Clear assignee (send explicit null):**
```bash
curl -s -X PATCH "http://localhost:4000/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assignee_id": null}' | jq
```

**Clear due date:**
```bash
curl -s -X PATCH "http://localhost:4000/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"due_date": null}' | jq
```

**Invalid status — 400**
```bash
curl -s -X PATCH "http://localhost:4000/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "finished"}' | jq
```
```json
{
  "error": "validation failed",
  "fields": { "status": "must be todo, in_progress, or done" }
}
```

---

### 4.4 Delete a task

```bash
curl -s -X DELETE "http://localhost:4000/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP %{http_code}\n"
```

**Expected — HTTP 204 (no body)**

**Delete someone else's task without permission — 403**
```bash
# TASK_ID must be a task in a project Jane does NOT own and is NOT assignee of
curl -s -X DELETE "http://localhost:4000/tasks/00000000-0000-0000-0000-000000000020" \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -w "\nHTTP %{http_code}\n"
```

---

## 5. Auth Guard Tests

**No token — 401:**
```bash
curl -s http://localhost:4000/projects | jq
```
```json
{ "error": "unauthorized" }
```

**Expired / tampered token — 401:**
```bash
curl -s http://localhost:4000/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature" | jq
```
```json
{ "error": "unauthorized" }
```

---

## 6. Postman Setup

1. Create a new collection **TaskFlow**
2. Set a collection variable `base_url` = `http://localhost:4000`
3. Set a collection variable `token` = *(empty — filled by the login script below)*
4. On the **Login** request → **Tests** tab, add:
   ```javascript
   const json = pm.response.json();
   pm.collectionVariables.set("token", json.token);
   ```
5. For all protected requests, set **Auth** → **Bearer Token** → `{{token}}`

---

## 7. One-liner Full Flow

Copy-paste the entire block to run end-to-end in one shot:

```bash
BASE="http://localhost:4000"

# Login
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')
echo "Token: $TOKEN"

# Create project
PID=$(curl -s -X POST $BASE/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Project","description":"Full flow test"}' | jq -r '.id')
echo "Project: $PID"

# Create task
TID=$(curl -s -X POST "$BASE/projects/$PID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Task","priority":"high","due_date":"2026-12-31"}' | jq -r '.id')
echo "Task: $TID"

# Move task to in_progress
curl -s -X PATCH "$BASE/tasks/$TID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' | jq '.status'

# Move task to done
curl -s -X PATCH "$BASE/tasks/$TID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' | jq '.status'

# Stats
curl -s "$BASE/projects/$PID/stats" \
  -H "Authorization: Bearer $TOKEN" | jq

# Cleanup
curl -s -X DELETE "$BASE/projects/$PID" \
  -H "Authorization: Bearer $TOKEN" -w "Delete project: HTTP %{http_code}\n"
```
