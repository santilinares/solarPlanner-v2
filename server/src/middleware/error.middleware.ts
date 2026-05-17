import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Central error handling middleware
 * Catches all errors and formats them consistently
 */
export function errorMiddleware(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    interface MongooseFieldError { path: string; message: string }
    interface MongooseValidationError extends Error { errors: Record<string, MongooseFieldError> }
    const ve = err as MongooseValidationError;
    res.status(400).json({
      success: false,
      message: 'Database validation failed',
      errors: Object.values(ve.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Mongoose duplicate key errors
  interface MongoServerError extends Error { code: number; keyPattern: Record<string, unknown> }
  if (err.name === 'MongoServerError' && (err as MongoServerError).code === 11000) {
    const field = Object.keys((err as MongoServerError).keyPattern)[0];
    res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle JWT errors (fallback - should be caught in auth middleware)
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default to 500 server error
  const statusCode = (err as AppError).statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}
