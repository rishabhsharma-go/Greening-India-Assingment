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

const statusEnum = z.enum(["todo", "in_progress", "done"]);
const priorityEnum = z.enum(["low", "medium", "high"]);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: priorityEnum.optional().default("medium"),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(), // YYYY-MM-DD
});

const patchTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    assignee_id: z.string().uuid().nullable().optional(),
    due_date: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "at least one field is required",
  });

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get(
  "/projects/:id/tasks",
  async (req: Request, res: Response, next: NextFunction) => {
    const querySchema = z.object({
      status: statusEnum.optional(),
      assignee: z.string().uuid().optional(),
    });
    const parsedQ = querySchema.safeParse(req.query);
    if (!parsedQ.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsedQ.error.issues) {
        const k = issue.path.join(".") || "query";
        fields[k] = issue.message;
      }
      return next(validationError(fields));
    }

    try {
      const projectId = req.params.id;
      const userId = req.auth!.userId;

      const accessRes = await pool.query(
        `select 1 as ok
       from projects p
       left join tasks t on t.project_id = p.id
       where p.id = $1 and (p.owner_id = $2 or t.assignee_id = $2)
       limit 1`,
        [projectId, userId],
      );
      if (accessRes.rowCount === 0) return next(forbiddenError());

      const where: string[] = ["project_id = $1"];
      const args: any[] = [projectId];

      if (parsedQ.data.status) {
        args.push(parsedQ.data.status);
        where.push(`status = $${args.length}`);
      }
      if (parsedQ.data.assignee) {
        args.push(parsedQ.data.assignee);
        where.push(`assignee_id = $${args.length}`);
      }

      const sql = `select id, title, description, status, priority, project_id, assignee_id, due_date, creator_id, created_at, updated_at
                 from tasks
                 where ${where.join(" and ")}
                 order by created_at desc`;

      const result = await pool.query(sql, args);
      return res.json({ tasks: result.rows });
    } catch (err) {
      return next(err);
    }
  },
);

tasksRouter.post(
  "/projects/:id/tasks",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = createTaskSchema.safeParse(req.body);
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

      const result = await pool.query(
        `insert into tasks(
         id, title, description, status, priority, project_id, assignee_id, due_date, creator_id
       ) values(
         gen_random_uuid(), $1, $2, 'todo', $3, $4, $5, $6, $7
       )
       returning id, title, description, status, priority, project_id, assignee_id, due_date, creator_id, created_at, updated_at`,
        [
          parsed.data.title,
          parsed.data.description ?? null,
          parsed.data.priority,
          projectId,
          parsed.data.assignee_id ?? null,
          parsed.data.due_date ?? null,
          userId,
        ],
      );

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return next(err);
    }
  },
);

tasksRouter.patch(
  "/tasks/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = patchTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path.join(".") || "body";
        fields[k] = issue.message;
      }
      return next(validationError(fields));
    }

    try {
      const taskId = req.params.id;
      const userId = req.auth!.userId;

      const tRes = await pool.query(
        `select t.project_id, p.owner_id
       from tasks t
       join projects p on p.id = t.project_id
       where t.id = $1`,
        [taskId],
      );
      const row = tRes.rows[0] as
        | undefined
        | { project_id: string; owner_id: string };
      if (!row) return next(notFoundError());

      // Allow project owner or creator to update
      const ownerOrCreatorRes = await pool.query(
        `select 1 as ok
       from tasks t
       join projects p on p.id = t.project_id
       where t.id = $1 and (p.owner_id = $2 or t.creator_id = $2)
       limit 1`,
        [taskId, userId],
      );
      if (ownerOrCreatorRes.rowCount === 0) return next(forbiddenError());

      const result = await pool.query(
        `update tasks
       set title = coalesce($2, title),
           description = case when $3::text is null then description else $3 end,
           status = coalesce($4, status),
           priority = coalesce($5, priority),
           assignee_id = case when $6::uuid is null then assignee_id else $6 end,
           due_date = case when $7::date is null then due_date else $7 end,
           updated_at = now()
       where id = $1
       returning id, title, description, status, priority, project_id, assignee_id, due_date, creator_id, created_at, updated_at`,
        [
          taskId,
          parsed.data.title ?? null,
          parsed.data.description ?? null,
          parsed.data.status ?? null,
          parsed.data.priority ?? null,
          parsed.data.assignee_id ?? null,
          parsed.data.due_date ?? null,
        ],
      );

      return res.json(result.rows[0]);
    } catch (err) {
      return next(err);
    }
  },
);

tasksRouter.delete(
  "/tasks/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.id;
      const userId = req.auth!.userId;

      const authRes = await pool.query(
        `select 1 as ok
       from tasks t
       join projects p on p.id = t.project_id
       where t.id = $1 and (p.owner_id = $2 or t.creator_id = $2)
       limit 1`,
        [taskId, userId],
      );
      if (authRes.rowCount === 0) {
        const existsRes = await pool.query(
          "select 1 as ok from tasks where id = $1",
          [taskId],
        );
        if (existsRes.rowCount === 0) return next(notFoundError());
        return next(forbiddenError());
      }

      await pool.query("delete from tasks where id = $1", [taskId]);
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },
);
