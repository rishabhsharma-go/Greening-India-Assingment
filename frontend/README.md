# TaskFlow Frontend

React + Vite + TypeScript task management frontend for the backend controllers you shared.

## UI choice
This app uses **MUI** for dialogs, forms, cards, drawers, and responsive layout.

## Backend contract used
The frontend is wired to the following endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `DELETE /projects/:id`
- `GET /projects/:id/tasks`
- `POST /projects/:id/tasks`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`
- `GET /user/:id`
- `GET /task/:id`

The frontend also expects a configurable lookup route for assignee-by-name resolution when updating assignees. Set `VITE_ASSIGNEE_LOOKUP_TEMPLATE` to whatever your backend exposes, for example:
`/user/by-name/{name}`.

## Notes
- JWT is stored in `localStorage`.
- `/` redirects to `/projects` when a token exists, otherwise to `/login`.
- Authenticated requests send `Authorization: Bearer <token>`.
- Requests under `/auth/*` are sent without auth headers.
- Vite dev server proxies `/api/v1` to `http://localhost:8080` to reduce local CORS friction.

## Setup
```bash
npm install
cp .env.example .env
npm run dev
```

## Assumptions
- JWT payload contains a usable user identifier in one of: `sub`, `userId`, `id`, `uid`.
- `GET /projects/:id` returns the project plus task IDs.
- `GET /task/:id` returns the detailed task fields, and the task ID is supplied by the list route.
- Status and priority enum values are rendered as strings. Update the option lists in `src/lib/constants.ts` if your backend uses different enum names.
