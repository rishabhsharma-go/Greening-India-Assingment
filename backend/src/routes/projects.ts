import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { pool } from "../lib/db.js";
import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../lib/httpErrors.js";
import { requireAuth } from "../middleware/auth.js";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "at least one field is required",
  });

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth!.userId;
      const result = await pool.query(
        `select distinct p.id, p.name, p.description, p.owner_id, p.created_at
       from projects p
       left join tasks t on t.project_id = p.id
       where p.owner_id = $1 or t.assignee_id = $1
       order by p.created_at desc`,
        [userId],
      );
      return res.json({ projects: result.rows });
    } catch (err) {
      return next(err);
    }
  },
);

projectsRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path.join(".") || "body";
        fields[k] = issue.message;
      }
      return next(validationError(fields));
    }

    try {
      const result = await pool.query(
        "insert into projects(id, name, description, owner_id) values(gen_random_uuid(), $1, $2, $3) returning id, name, description, owner_id, created_at",
        [parsed.data.name, parsed.data.description ?? null, req.auth!.userId],
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return next(err);
    }
  },
);

projectsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id;
      const userId = req.auth!.userId;

      const pRes = await pool.query(
        `select p.id, p.name, p.description, p.owner_id, p.created_at
       from projects p
       where p.id = $1`,
        [projectId],
      );
      const project = pRes.rows[0];
      if (!project) return next(notFoundError());

      const accessRes = await pool.query(
        `select 1 as ok
       from projects p
       left join tasks t on t.project_id = p.id
       where p.id = $1 and (p.owner_id = $2 or t.assignee_id = $2)
       limit 1`,
        [projectId, userId],
      );
      if (accessRes.rowCount === 0) return next(forbiddenError());

      const tasksRes = await pool.query(
        `select id, title, description, status, priority, project_id, assignee_id, due_date, creator_id, created_at, updated_at
       from tasks
       where project_id = $1
       order by created_at desc`,
        [projectId],
      );

      return res.json({ ...project, tasks: tasksRes.rows });
    } catch (err) {
      return next(err);
    }
  },
);

projectsRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path.join(".") || "body";
        fields[k] = issue.message;
      }
      return next(validationError(fields));
    }

    try {
      const projectId = req.params.id;
      const userId = req.auth!.userId;

      const pRes = await pool.query(
        "select owner_id from projects where id = $1",
        [projectId],
      );
      const p = pRes.rows[0] as undefined | { owner_id: string };
      if (!p) return next(notFoundError());
      if (p.owner_id !== userId) return next(forbiddenError());

      const name = parsed.data.name ?? null;
      const description = parsed.data.description ?? null;

      const uRes = await pool.query(
        `update projects
       set name = coalesce($2, name),
           description = case when $3::text is null then description else $3 end
       where id = $1
       returning id, name, description, owner_id, created_at`,
        [projectId, name, description],
      );

      return res.json(uRes.rows[0]);
    } catch (err) {
      return next(err);
    }
  },
);

projectsRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id;
      const userId = req.auth!.userId;

      const pRes = await pool.query(
        "select owner_id from projects where id = $1",
        [projectId],
      );
      const p = pRes.rows[0] as undefined | { owner_id: string };
      if (!p) return next(notFoundError());
      if (p.owner_id !== userId) return next(forbiddenError());

      await pool.query("delete from projects where id = $1", [projectId]);
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },
);
