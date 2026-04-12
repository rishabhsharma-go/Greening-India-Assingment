import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  
  if (err.name === 'ZodError') {
    return errorResponse(res, 'validation failed', 400, err.errors);
  }

  if (err.status) {
    return errorResponse(res, err.message, err.status);
  }

  return errorResponse(res, 'internal server error', 500);
};
