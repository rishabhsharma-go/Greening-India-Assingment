import { Response } from 'express';

export const successResponse = (res: Response, data: any, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    error: null,
  });
};

export const errorResponse = (res: Response, message: string, status = 500, details: any = null) => {
  return res.status(status).json({
    success: false,
    data: null,
    error: message,
    details,
  });
};
