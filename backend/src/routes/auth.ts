import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { pool } from "../lib/db.js";
import { env } from "../lib/env.js";
import { validationError, unauthorizedError } from "../lib/httpErrors.js";

// Validates request bodies for auth endpoints.
const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Creates a signed JWT used by clients as:
// Authorization: Bearer <token>
//
// Note: the token payload is built from the trusted server-side user record
// (DB-generated id + normalized email), not directly from the raw request body.
const signToken = (user: { id: string; email: string }) => {
  return jwt.sign({ user_id: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

export const authRouter = Router();

authRouter.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    // 1) Validate input.
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path.join(".") || "body";
        fields[k] = issue.message;
      }
      return next(validationError(fields));
    }

    try {
      // 2) Hash password before storing.
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);

      // 3) Insert user and return the created row.
      const result = await pool.query(
        "insert into users(id, name, email, password_hash) values(gen_random_uuid(), $1, $2, $3) returning id, name, email, created_at",
        [parsed.data.name, parsed.data.email.toLowerCase(), passwordHash],
      );

      const user = result.rows[0] as {
        id: string;
        name: string;
        email: string;
      };
      // 4) Create a JWT for subsequent authenticated requests.
      const token = signToken(user);
      return res.status(201).json({ token, user });
    } catch (err: any) {
      if (err?.code === "23505") {
        return next(validationError({ email: "already in use" }));
      }
      return next(err);
    }
  },
);

authRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    // 1) Validate input.
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path.join(".") || "body";
        fields[k] = issue.message;
      }
      return next(validationError(fields));
    }

    try {
      // 2) Find user by email.
      const result = await pool.query(
        "select id, name, email, password_hash from users where email = $1",
        [parsed.data.email.toLowerCase()],
      );
      const row = result.rows[0] as
        | undefined
        | {
            id: string;
            name: string;
            email: string;
            password_hash: string;
          };

      if (!row) return next(unauthorizedError());

      // 3) Verify password.
      const ok = await bcrypt.compare(parsed.data.password, row.password_hash);
      if (!ok) return next(unauthorizedError());

      // 4) Sign JWT and return it.
      const token = signToken({ id: row.id, email: row.email });
      return res.json({
        token,
        user: { id: row.id, name: row.name, email: row.email },
      });
    } catch (err) {
      return next(err);
    }
  },
);
