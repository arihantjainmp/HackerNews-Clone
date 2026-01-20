import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt';

describe('JWT Token Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token with 15-minute expiration', () => {
      const userId = 'user123';
      const result = generateAccessToken(userId);

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);

      const now = Date.now();
      const expectedExpiration = now + 15 * 60 * 1000;
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiration);
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;
      expect(() => generateAccessToken('user123')).toThrow('JWT_SECRET is not configured');
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateAccessToken('user1');
      const token2 = generateAccessToken('user2');
      expect(token1.token).not.toBe(token2.token);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token with 7-day expiration', () => {
      const userId = 'user123';
      const result = generateRefreshToken(userId);

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);

      const now = Date.now();
      const expectedExpiration = now + 7 * 24 * 60 * 60 * 1000;
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiration);
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should throw error if REFRESH_TOKEN_SECRET is not configured', () => {
      delete process.env.REFRESH_TOKEN_SECRET;
      expect(() => generateRefreshToken('user123')).toThrow('REFRESH_TOKEN_SECRET is not configured');
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateRefreshToken('user1');
      const token2 = generateRefreshToken('user2');
      expect(token1.token).not.toBe(token2.token);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode a valid access token', () => {
      const userId = 'user123';
      const { token } = generateAccessToken(userId);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(userId);
    });

    it('should throw error for invalid access token', () => {
      const invalidToken = 'invalid.token.here';
      expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid access token');
    });

    it('should throw error if JWT_SECRET is not configured', () => {
      const { token } = generateAccessToken('user123');
      delete process.env.JWT_SECRET;
      expect(() => verifyAccessToken(token)).toThrow('JWT_SECRET is not configured');
    });

    it('should throw error for token signed with wrong secret', () => {
      const { token } = generateAccessToken('user123');
      process.env.JWT_SECRET = 'different-secret';
      expect(() => verifyAccessToken(token)).toThrow('Invalid access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const userId = 'user123';
      const { token } = generateRefreshToken(userId);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(userId);
    });

    it('should throw error for invalid refresh token', () => {
      const invalidToken = 'invalid.token.here';
      expect(() => verifyRefreshToken(invalidToken)).toThrow('Invalid refresh token');
    });

    it('should throw error if REFRESH_TOKEN_SECRET is not configured', () => {
      const { token } = generateRefreshToken('user123');
      delete process.env.REFRESH_TOKEN_SECRET;
      expect(() => verifyRefreshToken(token)).toThrow('REFRESH_TOKEN_SECRET is not configured');
    });

    it('should throw error for token signed with wrong secret', () => {
      const { token } = generateRefreshToken('user123');
      process.env.REFRESH_TOKEN_SECRET = 'different-secret';
      expect(() => verifyRefreshToken(token)).toThrow('Invalid refresh token');
    });
  });

  describe('Property 3: Token Expiration Configuration', () => {
    /**
     * Feature: hacker-news-clone, Property 3: Token Expiration Configuration
     * For any generated Access_Token, the expiration time should be exactly 15 minutes from creation,
     * and for any generated Refresh_Token, the expiration time should be exactly 7 days from creation.
     * Validates: Requirements 2.1, 2.2
     */
    it('should generate access tokens with exactly 15-minute expiration', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // Generate random user IDs
          (userId) => {
            const beforeGeneration = Date.now();
            const result = generateAccessToken(userId);
            const afterGeneration = Date.now();

            // Verify token is valid
            expect(result.token).toBeDefined();
            expect(typeof result.token).toBe('string');
            expect(result.expiresAt).toBeInstanceOf(Date);

            // Verify expiration is exactly 15 minutes (900,000 ms) from generation time
            const expectedExpirationMin = beforeGeneration + 15 * 60 * 1000;
            const expectedExpirationMax = afterGeneration + 15 * 60 * 1000;
            const actualExpiration = result.expiresAt.getTime();

            // Allow small tolerance for execution time
            expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpirationMin);
            expect(actualExpiration).toBeLessThanOrEqual(expectedExpirationMax);

            // Verify the JWT itself has the correct expiration
            const decoded = jwt.decode(result.token) as any;
            expect(decoded).toBeDefined();
            expect(decoded.exp).toBeDefined();

            // JWT exp is in seconds, convert to milliseconds
            const jwtExpiration = decoded.exp * 1000;
            const timeDiff = Math.abs(jwtExpiration - actualExpiration);
            
            // Should be within 1 second tolerance
            expect(timeDiff).toBeLessThan(1000);

            // Verify expiration is approximately 15 minutes (900 seconds)
            const expirationDuration = decoded.exp - decoded.iat;
            expect(expirationDuration).toBe(900); // 15 minutes in seconds
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate refresh tokens with exactly 7-day expiration', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // Generate random user IDs
          (userId) => {
            const beforeGeneration = Date.now();
            const result = generateRefreshToken(userId);
            const afterGeneration = Date.now();

            // Verify token is valid
            expect(result.token).toBeDefined();
            expect(typeof result.token).toBe('string');
            expect(result.expiresAt).toBeInstanceOf(Date);

            // Verify expiration is exactly 7 days (604,800,000 ms) from generation time
            const expectedExpirationMin = beforeGeneration + 7 * 24 * 60 * 60 * 1000;
            const expectedExpirationMax = afterGeneration + 7 * 24 * 60 * 60 * 1000;
            const actualExpiration = result.expiresAt.getTime();

            // Allow small tolerance for execution time
            expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpirationMin);
            expect(actualExpiration).toBeLessThanOrEqual(expectedExpirationMax);

            // Verify the JWT itself has the correct expiration
            const decoded = jwt.decode(result.token) as any;
            expect(decoded).toBeDefined();
            expect(decoded.exp).toBeDefined();

            // JWT exp is in seconds, convert to milliseconds
            const jwtExpiration = decoded.exp * 1000;
            const timeDiff = Math.abs(jwtExpiration - actualExpiration);
            
            // Should be within 1 second tolerance
            expect(timeDiff).toBeLessThan(1000);

            // Verify expiration is approximately 7 days (604,800 seconds)
            const expirationDuration = decoded.exp - decoded.iat;
            expect(expirationDuration).toBe(604800); // 7 days in seconds
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
