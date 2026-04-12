import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userService from '../services/userService';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';
import { config } from '../config';

const router = Router();
const JWT_SECRET = config.jwtSecret;

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await userService.findByEmail(validated.email);
    if (existingUser) {
      return errorResponse(res, 'email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);
    const user = await userService.createUser(validated.name, validated.email, hashedPassword);

    const token = jwt.sign({ user_id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    return successResponse(res, { token, user }, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await userService.findByEmail(validated.email);
    if (!user) {
      return errorResponse(res, 'invalid credentials', 401);
    }

    const valid = await bcrypt.compare(validated.password, user.password);
    if (!valid) {
      return errorResponse(res, 'invalid credentials', 401);
    }

    const token = jwt.sign({ user_id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    return successResponse(res, { 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/users - to list available users for assignment
router.get('/users', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.listUsers();
    return successResponse(res, { users });
  } catch (err) {
    next(err);
  }
});

export default router;
