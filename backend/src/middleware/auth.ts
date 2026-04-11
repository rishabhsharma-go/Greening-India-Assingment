import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../lib/env.js";
import { unauthorizedError } from "../lib/httpErrors.js";

// Auth info attached to the request after successful JWT verification.
export type AuthUser = {
  userId: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

type TokenClaims = {
  user_id: string;
  email: string;
};

// Express middleware that enforces authentication.
//
// Expected header:
// Authorization: Bearer <jwt>
//
// On success, it sets req.auth = { userId, email } and allows the request.
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.header("authorization");
  if (!header) return next(unauthorizedError());

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return next(unauthorizedError());

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenClaims;
    // Make the authenticated user available to downstream handlers.
    req.auth = { userId: decoded.user_id, email: decoded.email };
    return next();
  } catch {
    return next(unauthorizedError());
  }
};
