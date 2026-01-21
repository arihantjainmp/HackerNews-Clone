import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Extend Express Request interface to include userId
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Authentication middleware that verifies JWT access tokens
 * 
 * Extracts the token from the Authorization header (Bearer scheme),
 * verifies it, and attaches the userId to the request object.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns 401 error if token is missing or invalid, otherwise calls next()
 * 
 * Requirements: 1.3, 3.4, 6.7
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract Authorization header
  const authHeader = req.headers['authorization'];
  
  // Check if Authorization header exists
  if (!authHeader) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  // Extract token from Bearer scheme
  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid authorization header format. Expected: Bearer <token>' });
    return;
  }

  const token = parts[1];

  // Check if token is empty
  if (!token) {
    res.status(401).json({ error: 'Token is required' });
    return;
  }

  // Verify token and extract userId
  try {
    const payload = verifyAccessToken(token);
    
    // Attach userId to request object for use in route handlers
    req.userId = payload.userId;
    
    // Continue to next middleware or route handler
    next();
  } catch (error) {
    // Token verification failed (invalid, expired, or malformed)
    const errorMessage = error instanceof Error ? error.message : 'Invalid or expired token';
    res.status(401).json({ error: errorMessage });
    return;
  }
}

/**
 * Optional authentication middleware that extracts userId if token is present
 * 
 * Unlike authenticateToken, this middleware does not return an error if the token
 * is missing or invalid. It simply attaches the userId to the request if a valid
 * token is provided, allowing routes to work for both authenticated and anonymous users.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function optionalAuthenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract Authorization header
  const authHeader = req.headers['authorization'];
  
  // If no auth header, continue without userId
  if (!authHeader) {
    next();
    return;
  }

  // Extract token from Bearer scheme
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Invalid format, continue without userId
    next();
    return;
  }

  const token = parts[1];

  // If token is empty, continue without userId
  if (!token) {
    next();
    return;
  }

  // Try to verify token and extract userId
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
  } catch (error) {
    // Token verification failed, but we don't return an error
    // Just continue without userId
  }
  
  next();
}
