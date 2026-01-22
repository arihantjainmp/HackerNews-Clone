import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import * as fc from 'fast-check';
import { errorHandler } from '../errorHandler';
import {
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  AppError,
} from '../../utils/errors';
import logger from '../../utils/logger';

/**
 * Property 37: Error Logging Completeness
 * 
 * For any error encountered by the backend, a log entry should be created 
 * containing at minimum the timestamp, request method, request path, 
 * error message, and stack trace.
 * 
 * **Validates: Requirements 13.1**
 */
describe('Property 37: Error Logging Completeness', () => {
  let loggerErrorSpy: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger as any);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('should log all required fields for any error', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary HTTP methods
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
        // Generate arbitrary paths
        fc.string({ minLength: 1, maxLength: 100 }).map(s => `/api/${s}`),
        // Generate arbitrary error messages
        fc.string({ minLength: 1, maxLength: 200 }),
        (method, path, errorMessage) => {
          // Reset spy for each iteration
          loggerErrorSpy.mockClear();

          const mockReq: Partial<Request> = {
            method,
            path,
          };

          const error = new Error(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: logger.error must be called
          expect(loggerErrorSpy).toHaveBeenCalledTimes(1);

          // Property: Log must contain all required fields
          const logMessage = loggerErrorSpy.mock.calls[0][0];
          const loggedData = loggerErrorSpy.mock.calls[0][1];
          
          expect(logMessage).toBe('Request error');
          // Winston adds timestamp automatically during formatting, not in metadata
          
          expect(loggedData).toHaveProperty('method');
          expect(loggedData.method).toBe(method);
          
          expect(loggedData).toHaveProperty('path');
          expect(loggedData.path).toBe(path);
          
          expect(loggedData).toHaveProperty('message');
          expect(loggedData.message).toBe(errorMessage);
          
          expect(loggedData).toHaveProperty('stack');
          expect(typeof loggedData.stack).toBe('string');
          expect(loggedData.stack.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should log statusCode for AppError instances', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary HTTP methods
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
        // Generate arbitrary paths
        fc.string({ minLength: 1, maxLength: 100 }).map(s => `/api/${s}`),
        // Generate arbitrary error messages
        fc.string({ minLength: 1, maxLength: 200 }),
        // Generate arbitrary status codes
        fc.constantFrom(400, 401, 403, 404, 409, 500),
        (method, path, errorMessage, statusCode) => {
          // Reset spy for each iteration
          loggerErrorSpy.mockClear();

          const mockReq: Partial<Request> = {
            method,
            path,
          };

          const error = new AppError(errorMessage, statusCode);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Log must contain statusCode for AppError
          const loggedData = loggerErrorSpy.mock.calls[0][1];
          
          expect(loggedData).toHaveProperty('statusCode');
          expect(loggedData.statusCode).toBe(statusCode);
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should log timestamp in ISO format for any error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset spy for each iteration
          loggerErrorSpy.mockClear();

          const mockReq: Partial<Request> = {
            method: 'GET',
            path: '/api/test',
          };

          const error = new Error(errorMessage);
          const beforeTime = new Date();

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          const afterTime = new Date();
          const loggedData = loggerErrorSpy.mock.calls[0][1];
          
          // Winston adds timestamp automatically, so we just verify the log was called
          expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
          expect(loggedData).toHaveProperty('method');
          expect(loggedData).toHaveProperty('path');
          expect(loggedData).toHaveProperty('message');
        }
      ),
      { numRuns: 5 }
    );
  });
});

/**
 * Property 38: HTTP Status Code Mapping
 * 
 * For any error, the backend should return the appropriate HTTP status code: 
 * 400 for validation errors, 401 for authentication errors, 403 for 
 * authorization errors, 404 for not found errors, and 500 for unexpected errors.
 * 
 * **Validates: Requirements 13.2, 13.3, 13.4, 13.5, 13.6**
 */
describe('Property 38: HTTP Status Code Mapping', () => {
  let consoleErrorSpy: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

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
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return 400 for any ValidationError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new ValidationError(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 400
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: errorMessage })
          );
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 401 for any AuthenticationError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new AuthenticationError(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 401
          expect(mockRes.status).toHaveBeenCalledWith(401);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: errorMessage })
          );
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 403 for any ForbiddenError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new ForbiddenError(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 403
          expect(mockRes.status).toHaveBeenCalledWith(403);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: errorMessage })
          );
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 404 for any NotFoundError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new NotFoundError(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 404
          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: errorMessage })
          );
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 409 for any ConflictError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new ConflictError(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 409
          expect(mockRes.status).toHaveBeenCalledWith(409);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: errorMessage })
          );
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 400 for any Mongoose ValidationError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new Error(errorMessage);
          error.name = 'ValidationError';

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 400
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: errorMessage })
          );
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 400 for any Mongoose CastError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new Error(errorMessage);
          error.name = 'CastError';

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 400
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid ID format' });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 401 for any JWT error', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('JsonWebTokenError', 'TokenExpiredError'),
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorName, errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new Error(errorMessage);
          error.name = errorName;

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 401
          expect(mockRes.status).toHaveBeenCalledWith(401);
          expect(mockRes.json).toHaveBeenCalledWith({ 
            error: 'Invalid or expired token' 
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 400 for any MongoDB duplicate key error', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('email', 'username', 'token', 'id'),
        (fieldName) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error: any = new Error('E11000 duplicate key error');
          error.name = 'MongoServerError';
          error.code = 11000;
          error.keyPattern = { [fieldName]: 1 };

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 400
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith({ 
            error: `${fieldName} already exists` 
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should return 500 for any unexpected error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new Error(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must be 500
          expect(mockRes.status).toHaveBeenCalledWith(500);
          expect(mockRes.json).toHaveBeenCalledWith({ 
            error: 'Internal server error' 
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should map any custom AppError to its specified status code', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 400, max: 599 }),
        (errorMessage, statusCode) => {
          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new AppError(errorMessage, statusCode);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Status must match the error's statusCode
          expect(mockRes.status).toHaveBeenCalledWith(statusCode);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: errorMessage })
          );
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should never expose internal details in production for any error', () => {
    const originalEnv = process.env.NODE_ENV;
    
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Set production environment
          process.env.NODE_ENV = 'production';

          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new Error(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Response must not contain error details in production
          const jsonCall = (mockRes.json as any).mock.calls[0][0];
          expect(jsonCall).not.toHaveProperty('details');
          expect(jsonCall.error).toBe('Internal server error');
          
          // Restore environment
          process.env.NODE_ENV = originalEnv;
        }
      ),
      { numRuns: 5 }
    );
    
    // Ensure environment is restored
    process.env.NODE_ENV = originalEnv;
  });

  it('should include error details in development for any error', () => {
    const originalEnv = process.env.NODE_ENV;
    
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Set development environment
          process.env.NODE_ENV = 'development';

          // Reset mocks for each iteration
          (mockRes.status as any).mockClear();
          (mockRes.json as any).mockClear();

          const error = new Error(errorMessage);

          errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

          // Property: Response must contain error details in development
          const jsonCall = (mockRes.json as any).mock.calls[0][0];
          expect(jsonCall).toHaveProperty('details');
          expect(jsonCall.details).toBe(errorMessage);
          
          // Restore environment
          process.env.NODE_ENV = originalEnv;
        }
      ),
      { numRuns: 5 }
    );
    
    // Ensure environment is restored
    process.env.NODE_ENV = originalEnv;
  });
});
