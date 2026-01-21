/**
 * Custom error classes for the application
 * Each error class corresponds to a specific HTTP status code
 */

/**
 * Base class for application errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * ValidationError - 400 Bad Request
 * Used when request data fails validation
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * AuthenticationError - 401 Unauthorized
 * Used when authentication is required but not provided or invalid
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * ForbiddenError - 403 Forbidden
 * Used when user is authenticated but lacks permission for the resource
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * NotFoundError - 404 Not Found
 * Used when a requested resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * ConflictError - 409 Conflict
 * Used when a request conflicts with the current state (e.g., duplicate resource)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}
