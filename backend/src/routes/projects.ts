import { Router, Request, Response, NextFunction } from 'express';
import * as projectService from '../services/projectService';
import { authMiddleware } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// GET /projects/stats (Bonus Feature)
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.user_id;
    const { rows } = await require('../db').default.query(`
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE owner_id = $1) as total_projects,
        (SELECT COUNT(*) FROM tasks t JOIN projects p ON t.project_id = p.id WHERE p.owner_id = $1 OR t.assignee_id = $1) as total_tasks,
        (SELECT COUNT(*) FROM tasks t JOIN projects p ON t.project_id = p.id WHERE (p.owner_id = $1 OR t.assignee_id = $1) AND t.status = 'done') as completed_tasks
    `, [userId]);
    return successResponse(res, rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /projects
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.user_id;
    const projects = await projectService.getProjectsForUser(userId);
    return successResponse(res, { projects });
  } catch (err) {
    next(err);
  }
});

// POST /projects
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.user_id;
    const validated = projectSchema.parse(req.body);
    const project = await projectService.createProject(validated.name, validated.description || '', userId);
    return successResponse(res, project, 201);
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = (req as any).user.user_id;
    const project = await projectService.getProjectWithTasks(projectId, userId);
    
    if (!project) {
      return errorResponse(res, 'not found', 404);
    }

    return successResponse(res, project);
  } catch (err) {
    next(err);
  }
});

// PATCH /projects/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = (req as any).user.user_id;
    const validated = projectSchema.partial().parse(req.body);

    const result = await projectService.updateProject(projectId, userId, validated);
    if (result.error === 'not_found') return errorResponse(res, 'not found', 404);
    if (result.error === 'forbidden') return errorResponse(res, 'forbidden', 403);

    return successResponse(res, result.project);
  } catch (err) {
    next(err);
  }
});

// DELETE /projects/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = (req as any).user.user_id;

    const result = await projectService.deleteProject(projectId, userId);
    if (result.error === 'not_found') return errorResponse(res, 'not found', 404);
    if (result.error === 'forbidden') return errorResponse(res, 'forbidden', 403);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
