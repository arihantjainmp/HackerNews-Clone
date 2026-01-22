import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Centralized error handling middleware
 * Logs all errors and returns appropriate HTTP responses
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log error with full context
  // Requirement 13.1: Log all errors with timestamp, method, path, message, and stack trace
  logger.error('Request error', {
    method: req.method,
    path: req.path,
    message: err.message,
    stack: err.stack,
    ...(err instanceof AppError && { statusCode: err.statusCode }),
  });

  // Handle AppError instances (custom errors with status codes)
  if (err instanceof AppError) {
    // Requirement 13.6: Never expose internal details in production
    const response: { error: string; details?: string } = {
      error: err.message,
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.details = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Mongoose validation errors
  // Requirement 13.2: Return 400 for validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }

  // Handle JWT errors
  // Requirement 13.3: Return 401 for authentication errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Handle MongoDB duplicate key errors (E11000)
  // Requirement 13.2: Return 400 for validation errors (duplicate is a validation issue)
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0] || 'field';
    res.status(400).json({ error: `${field} already exists` });
    return;
  }

  // Default to 500 for unexpected errors
  // Requirement 13.6: Return 500 without exposing internal details
  const response: { error: string; details?: string } = {
    error: 'Internal server error',
  };

  // Only include error details in development
  if (process.env.NODE_ENV === 'development') {
    response.details = err.message;
  }

  res.status(500).json(response);
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handling middleware
 *
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
