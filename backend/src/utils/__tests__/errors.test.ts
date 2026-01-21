import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../errors';

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with correct properties', () => {
      const error = new AppError('Test error', 500);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should allow setting isOperational flag', () => {
      const error = new AppError('Test error', 500, false);
      
      expect(error.isOperational).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error with default message', () => {
      const error = new ValidationError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 400 error with custom message', () => {
      const error = new ValidationError('Invalid email format');
      
      expect(error.message).toBe('Invalid email format');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('AuthenticationError', () => {
    it('should create a 401 error with default message', () => {
      const error = new AuthenticationError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 401 error with custom message', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should create a 403 error with default message', () => {
      const error = new ForbiddenError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.name).toBe('ForbiddenError');
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 403 error with custom message', () => {
      const error = new ForbiddenError('You cannot edit this comment');
      
      expect(error.message).toBe('You cannot edit this comment');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error with default message', () => {
      const error = new NotFoundError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 404 error with custom message', () => {
      const error = new NotFoundError('Post not found');
      
      expect(error.message).toBe('Post not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ConflictError', () => {
    it('should create a 409 error with default message', () => {
      const error = new ConflictError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.name).toBe('ConflictError');
      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.isOperational).toBe(true);
    });

    it('should create a 409 error with custom message', () => {
      const error = new ConflictError('Username already exists');
      
      expect(error.message).toBe('Username already exists');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('Error instanceof checks', () => {
    it('should maintain proper prototype chain', () => {
      const validationError = new ValidationError();
      const authError = new AuthenticationError();
      const forbiddenError = new ForbiddenError();
      const notFoundError = new NotFoundError();
      const conflictError = new ConflictError();

      // All should be instances of Error
      expect(validationError instanceof Error).toBe(true);
      expect(authError instanceof Error).toBe(true);
      expect(forbiddenError instanceof Error).toBe(true);
      expect(notFoundError instanceof Error).toBe(true);
      expect(conflictError instanceof Error).toBe(true);

      // All should be instances of AppError
      expect(validationError instanceof AppError).toBe(true);
      expect(authError instanceof AppError).toBe(true);
      expect(forbiddenError instanceof AppError).toBe(true);
      expect(notFoundError instanceof AppError).toBe(true);
      expect(conflictError instanceof AppError).toBe(true);

      // Each should only be instance of its own class
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof AuthenticationError).toBe(false);
      expect(authError instanceof AuthenticationError).toBe(true);
      expect(authError instanceof ValidationError).toBe(false);
    });
  });
});
