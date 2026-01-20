import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

/**
 * Payload structure for JWT tokens
 */
export interface TokenPayload {
  userId: string;
  jti?: string; // JWT ID for uniqueness
}

/**
 * Result of token generation including the token and expiration
 */
export interface TokenResult {
  token: string;
  expiresAt: Date;
}

/**
 * Generate an Access Token with 15-minute expiration
 * @param userId - The user ID to encode in the token
 * @returns Token string and expiration date
 * @throws Error if JWT_SECRET is not configured
 */
export function generateAccessToken(userId: string): TokenResult {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const expiresIn = '15m'; // 15 minutes
  const expiresInMs = 15 * 60 * 1000; // 15 minutes in milliseconds

  // Add unique identifier to prevent duplicate tokens
  const payload: TokenPayload = { 
    userId,
    jti: randomBytes(16).toString('hex') // JWT ID for uniqueness
  };
  
  const token = jwt.sign(payload, secret, {
    expiresIn,
  });

  const expiresAt = new Date(Date.now() + expiresInMs);

  return { token, expiresAt };
}

/**
 * Generate a Refresh Token with 7-day expiration
 * @param userId - The user ID to encode in the token
 * @returns Token string and expiration date
 * @throws Error if REFRESH_TOKEN_SECRET is not configured
 */
export function generateRefreshToken(userId: string): TokenResult {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  
  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET is not configured');
  }

  const expiresIn = '7d'; // 7 days
  const expiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  // Add unique identifier to prevent duplicate tokens
  const payload: TokenPayload = { 
    userId,
    jti: randomBytes(16).toString('hex') // JWT ID for uniqueness
  };
  
  const token = jwt.sign(payload, secret, {
    expiresIn,
  });

  const expiresAt = new Date(Date.now() + expiresInMs);

  return { token, expiresAt };
}

/**
 * Verify an Access Token and extract the payload
 * @param token - The JWT token to verify
 * @returns The decoded token payload
 * @throws Error if token is invalid, expired, or JWT_SECRET is not configured
 */
export function verifyAccessToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Verify a Refresh Token and extract the payload
 * @param token - The JWT token to verify
 * @returns The decoded token payload
 * @throws Error if token is invalid, expired, or REFRESH_TOKEN_SECRET is not configured
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  
  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}
