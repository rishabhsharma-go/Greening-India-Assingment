import { rest } from 'msw';
import { db, uuid } from './db.js';

const BASE = 'http://localhost:4000';

// ─── Token helpers ──────────────────────────────────────────────────────────

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + 86_400_000,
  };
  return btoa(JSON.stringify(payload));
}

function decodeToken(req) {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const decoded = JSON.parse(atob(auth.slice(7)));
    if (decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

function unauthorized(res, ctx) {
  return res(ctx.status(401), ctx.json({ error: 'unauthorized' }));
}

// ─── Handlers ───────────────────────────────────────────────────────────────

export const handlers = [
  // POST /auth/register
  rest.post(`${BASE}/auth/register`, async (req, res, ctx) => {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'validation failed', fields: { name: 'is required', email: 'is required', password: 'is required' } })
      );
    }

    if (db.users.find((u) => u.email === email)) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'validation failed', fields: { email: 'already in use' } })
      );
    }

    const user = { id: uuid(), name: name.trim(), email: email.toLowerCase().trim(), password };
    db.users.push(user);
    const token = generateToken(user);

    return res(
      ctx.status(201),
      ctx.json({ token, user: { id: user.id, name: user.name, email: user.email } })
    );
  }),

  // POST /auth/login
  rest.post(`${BASE}/auth/login`, async (req, res, ctx) => {
    const { email, password } = await req.json();
    const user = db.users.find((u) => u.email === email && u.password === password);

    if (!user) {
      return res(ctx.status(401), ctx.json({ error: 'unauthorized' }));
    }

    const token = generateToken(user);
    return res(ctx.json({ token, user: { id: user.id, name: user.name, email: user.email } }));
  }),

  // GET /users
  rest.get(`${BASE}/users`, (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    return res(
      ctx.json({ users: db.users.map((u) => ({ id: u.id, name: u.name, email: u.email })) })
    );
  }),

  // GET /projects
  rest.get(`${BASE}/projects`, (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    return res(ctx.json({ projects: db.projects }));
  }),

  // POST /projects
  rest.post(`${BASE}/projects`, async (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    const { name, description = '' } = await req.json();
    if (!name?.trim()) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'validation failed', fields: { name: 'is required' } })
      );
    }

    const project = {
      id: uuid(),
      name: name.trim(),
      description: description.trim(),
      owner_id: authUser.id,
      created_at: new Date().toISOString(),
    };
    db.projects.push(project);

    return res(ctx.status(201), ctx.json(project));
  }),

  // GET /projects/:id
  rest.get(`${BASE}/projects/:id`, (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    const project = db.projects.find((p) => p.id === req.params.id);
    if (!project) return res(ctx.status(404), ctx.json({ error: 'not found' }));

    const tasks = db.tasks.filter((t) => t.project_id === req.params.id);
    return res(ctx.json({ ...project, tasks }));
  }),

  // PATCH /projects/:id
  rest.patch(`${BASE}/projects/:id`, async (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    const idx = db.projects.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res(ctx.status(404), ctx.json({ error: 'not found' }));

    const body = await req.json();
    db.projects[idx] = { ...db.projects[idx], ...body };
    return res(ctx.json(db.projects[idx]));
  }),

  // DELETE /projects/:id
  rest.delete(`${BASE}/projects/:id`, (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    const idx = db.projects.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res(ctx.status(404), ctx.json({ error: 'not found' }));

    db.projects.splice(idx, 1);
    db.tasks = db.tasks.filter((t) => t.project_id !== req.params.id);
    return res(ctx.status(204));
  }),

  // GET /projects/:id/tasks
  rest.get(`${BASE}/projects/:id/tasks`, (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    const statusFilter = req.url.searchParams.get('status');
    const assigneeFilter = req.url.searchParams.get('assignee');

    let tasks = db.tasks.filter((t) => t.project_id === req.params.id);
    if (statusFilter) tasks = tasks.filter((t) => t.status === statusFilter);
    if (assigneeFilter) tasks = tasks.filter((t) => t.assignee_id === assigneeFilter);

    return res(ctx.json({ tasks }));
  }),

  // POST /projects/:id/tasks
  rest.post(`${BASE}/projects/:id/tasks`, async (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    const project = db.projects.find((p) => p.id === req.params.id);
    if (!project) return res(ctx.status(404), ctx.json({ error: 'not found' }));

    const { title, description = '', priority = 'medium', assignee_id = null, due_date = null } =
      await req.json();

    if (!title?.trim()) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'validation failed', fields: { title: 'is required' } })
      );
    }

    const task = {
      id: uuid(),
      project_id: req.params.id,
      title: title.trim(),
      description: description.trim(),
      status: 'todo',
      priority,
      assignee_id,
      due_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.tasks.push(task);

    return res(ctx.status(201), ctx.json(task));
  }),

  // PATCH /tasks/:id
  rest.patch(`${BASE}/tasks/:id`, async (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    const idx = db.tasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res(ctx.status(404), ctx.json({ error: 'not found' }));

    const body = await req.json();
    db.tasks[idx] = { ...db.tasks[idx], ...body, updated_at: new Date().toISOString() };
    return res(ctx.json(db.tasks[idx]));
  }),

  // DELETE /tasks/:id
  rest.delete(`${BASE}/tasks/:id`, (req, res, ctx) => {
    const authUser = decodeToken(req);
    if (!authUser) return unauthorized(res, ctx);

    const idx = db.tasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res(ctx.status(404), ctx.json({ error: 'not found' }));

    db.tasks.splice(idx, 1);
    return res(ctx.status(204));
  }),
];
