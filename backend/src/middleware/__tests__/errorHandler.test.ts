import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, asyncHandler } from '../errorHandler';
import {
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors';
import logger from '../../utils/logger';

describe('Error Handling Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let loggerErrorSpy: any;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/test',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    // Spy on logger.error to verify logging
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger as any);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('errorHandler', () => {
    it('should log error with timestamp, method, path, message, and stack trace', () => {
      const error = new Error('Test error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          method: 'GET',
          path: '/api/test',
          message: 'Test error',
          stack: expect.any(String),
        })
      );
    });

    it('should return 400 for ValidationError', () => {
      const error = new ValidationError('Invalid input');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid input',
      });
    });

    it('should return 401 for AuthenticationError', () => {
      const error = new AuthenticationError('Invalid token');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
    });

    it('should return 403 for ForbiddenError', () => {
      const error = new ForbiddenError('Access denied');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied',
      });
    });

    it('should return 404 for NotFoundError', () => {
      const error = new NotFoundError('Post not found');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Post not found',
      });
    });

    it('should return 409 for ConflictError', () => {
      const error = new ConflictError('Username already exists');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Username already exists',
      });
    });

    it('should return 400 for Mongoose ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
      });
    });

    it('should return 400 for Mongoose CastError', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid ID format',
      });
    });

    it('should return 401 for JsonWebTokenError', () => {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should return 401 for TokenExpiredError', () => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should return 400 for MongoDB duplicate key error', () => {
      const error: any = new Error('E11000 duplicate key error');
      error.name = 'MongoServerError';
      error.code = 11000;
      error.keyPattern = { email: 1 };
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'email already exists',
      });
    });

    it('should return 500 for unexpected errors', () => {
      const error = new Error('Unexpected error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });

    it('should not expose internal details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal database error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should include error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Internal database error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Internal database error',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace for AppError in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new ValidationError('Invalid input');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid input',
        details: expect.any(String),
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should call the wrapped function', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);
      const wrappedFn = asyncHandler(mockFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const mockFn = vi.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(mockFn);

      // Call the wrapped function and wait for promise to settle
      wrappedFn(mockReq as Request, mockRes as Response, mockNext);
      
      // Wait for next tick to allow promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors thrown in async function', async () => {
      const error = new Error('Sync error');
      const mockFn = vi.fn().mockImplementation(async () => {
        throw error;
      });
      const wrappedFn = asyncHandler(mockFn);

      // Call the wrapped function and wait for promise to settle
      wrappedFn(mockReq as Request, mockRes as Response, mockNext);
      
      // Wait for next tick to allow promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should not call next if no error occurs', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);
      const wrappedFn = asyncHandler(mockFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
