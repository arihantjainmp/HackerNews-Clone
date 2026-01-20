import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../auth';
import * as jwtUtils from '../../utils/jwt';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks before each test
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      headers: {}
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = vi.fn();
  });

  it('should return 401 when Authorization header is missing', () => {
    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header format is invalid (no Bearer)', () => {
    mockRequest.headers = { authorization: 'InvalidToken123' };

    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ 
      error: 'Invalid authorization header format. Expected: Bearer <token>' 
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header has wrong scheme', () => {
    mockRequest.headers = { authorization: 'Basic token123' };

    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ 
      error: 'Invalid authorization header format. Expected: Bearer <token>' 
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    mockRequest.headers = { authorization: 'Bearer invalid.token.here' };

    // Mock verifyAccessToken to throw an error
    vi.spyOn(jwtUtils, 'verifyAccessToken').mockImplementation(() => {
      throw new Error('Invalid access token');
    });

    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid access token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token is expired', () => {
    mockRequest.headers = { authorization: 'Bearer expired.token.here' };

    // Mock verifyAccessToken to throw an expiration error
    vi.spyOn(jwtUtils, 'verifyAccessToken').mockImplementation(() => {
      throw new Error('Access token has expired');
    });

    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Access token has expired' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should attach userId to request and call next() when token is valid', () => {
    const testUserId = '507f1f77bcf86cd799439011';
    mockRequest.headers = { authorization: 'Bearer valid.token.here' };

    // Mock verifyAccessToken to return a valid payload
    vi.spyOn(jwtUtils, 'verifyAccessToken').mockReturnValue({
      userId: testUserId,
      jti: 'unique-jwt-id'
    });

    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockRequest.userId).toBe(testUserId);
    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it('should extract token correctly from Bearer scheme', () => {
    const testUserId = '507f1f77bcf86cd799439011';
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
    mockRequest.headers = { authorization: `Bearer ${testToken}` };

    const verifySpy = vi.spyOn(jwtUtils, 'verifyAccessToken').mockReturnValue({
      userId: testUserId,
      jti: 'unique-jwt-id'
    });

    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(verifySpy).toHaveBeenCalledWith(testToken);
    expect(mockRequest.userId).toBe(testUserId);
    expect(mockNext).toHaveBeenCalled();
  });
});
