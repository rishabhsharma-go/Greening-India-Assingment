import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

import { HttpError } from "../lib/httpErrors.js";

// Central Express error handler.
//
// - Logs all unexpected errors
// - Converts known HttpError instances into their structured JSON response
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  req.log.error({ err }, "request error");

  if (err instanceof HttpError) {
    return res.status(err.status).json(err.body);
  }

  return res.status(500).json({ error: "internal server error" });
};
