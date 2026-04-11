import { Router } from "express";
import type { Request, Response } from "express";

import { errorHandler } from "../middleware/errorHandler.js";
import { authRouter } from "./auth.js";
import { projectsRouter } from "./projects.js";
import { tasksRouter } from "./tasks.js";

// Builds the main API router.
//
// Order matters:
// - Public routes first (/health, /auth)
// - Protected domain routers next (/projects and task routes)
// - Error handler last
export const makeRouter = () => {
  const r = Router();

  r.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

  r.use("/auth", authRouter);
  r.use("/projects", projectsRouter);
  r.use("/", tasksRouter);

  r.use(errorHandler);

  return r;
};
