import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import * as taskService from '../services/taskService';
import { authMiddleware } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date: z.string().optional().nullable(),
});

// GET /projects/:id/tasks
router.get('/projects/:id/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = (req as any).user.user_id;
    const { status, assignee } = req.query;
    
    // Auth check
    const hasAccess = await taskService.checkProjectAccess(projectId, userId);
    if (!hasAccess) return errorResponse(res, 'not found', 404);

    let query = 'SELECT * FROM tasks WHERE project_id = $1';
    const params: any[] = [projectId];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (assignee) {
      params.push(assignee);
      query += ` AND assignee_id = $${params.length}`;
    }
    
    query += ' ORDER BY created_at ASC';
    
    const { rows } = await pool.query(query, params);
    return successResponse(res, { tasks: rows });
  } catch (err) {
    next(err);
  }
});

// POST /projects/:id/tasks
router.post('/projects/:id/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = (req as any).user.user_id;
    const validated = taskSchema.parse(req.body);

    // Auth check (Only owner can add tasks? Assignment doesn't specify but usually owner or project members. Let's say anyone with access for now, or just owner if we want to be strict.)
    const hasAccess = await taskService.checkProjectAccess(projectId, userId);
    if (!hasAccess) return errorResponse(res, 'not found', 404);

    const task = await taskService.createTask({
      ...validated,
      project_id: projectId
    });
    return successResponse(res, task, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /tasks/:id
router.patch('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const userId = (req as any).user.user_id;
    const validated = taskSchema.partial().parse(req.body);

    // Permission check: must have access to project
    const { rows: taskCheck } = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.length === 0) return errorResponse(res, 'not found', 404);

    const hasAccess = await taskService.checkProjectAccess(taskCheck[0].project_id, userId);
    if (!hasAccess) return errorResponse(res, 'forbidden', 403);

    const task = await taskService.updateTask(taskId, validated);
    return successResponse(res, task);
  } catch (err) {
    next(err);
  }
});

// DELETE /tasks/:id
router.delete('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const userId = (req as any).user.user_id;

    const { rows } = await pool.query(`
      SELECT p.owner_id 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `, [taskId]);

    if (rows.length === 0) return errorResponse(res, 'not found', 404);

    if (rows[0].owner_id !== userId) {
      return errorResponse(res, 'forbidden', 403);
    }

    await taskService.deleteTask(taskId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

export default router;
