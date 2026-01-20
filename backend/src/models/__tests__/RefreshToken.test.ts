import { RefreshToken } from '../RefreshToken';
import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';

describe('RefreshToken Model', () => {

  describe('Schema Validation', () => {
    it('should create a valid refresh token with all required fields', async () => {
      const tokenData = {
        user_id: new Types.ObjectId(),
        token: 'valid.jwt.token',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const refreshToken = new RefreshToken(tokenData);
      await expect(refreshToken.validate()).resolves.not.toThrow();

      expect(refreshToken.user_id).toEqual(tokenData.user_id);
      expect(refreshToken.token).toBe('valid.jwt.token');
      expect(refreshToken.expires_at).toEqual(tokenData.expires_at);
      expect(refreshToken.is_used).toBe(false);
      expect(refreshToken.created_at).toBeInstanceOf(Date);
    });

    it('should automatically set created_at timestamp', () => {
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        token: 'valid.jwt.token',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      expect(refreshToken.created_at).toBeInstanceOf(Date);
      expect(refreshToken.created_at.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should default is_used to false', () => {
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        token: 'valid.jwt.token',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      expect(refreshToken.is_used).toBe(false);
    });

    it('should allow setting is_used to true', () => {
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        token: 'valid.jwt.token',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        is_used: true
      });

      expect(refreshToken.is_used).toBe(true);
    });

    it('should allow setting used_at timestamp', () => {
      const usedAt = new Date();
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        token: 'valid.jwt.token',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        is_used: true,
        used_at: usedAt
      });

      expect(refreshToken.used_at).toEqual(usedAt);
    });
  });

  describe('Required Fields Validation', () => {
    it('should require user_id field', () => {
      const refreshToken = new RefreshToken({
        token: 'valid.jwt.token',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const error = refreshToken.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.user_id).toBeDefined();
      expect(error?.errors?.user_id.message).toMatch(/User ID is required/);
    });

    it('should require token field', () => {
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const error = refreshToken.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.token).toBeDefined();
      expect(error?.errors?.token.message).toMatch(/Token is required/);
    });

    it('should require expires_at field', () => {
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        token: 'valid.jwt.token'
      });

      const error = refreshToken.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.expires_at).toBeDefined();
      expect(error?.errors?.expires_at.message).toMatch(/Expiration date is required/);
    });
  });

  describe('Token Field', () => {
    it('should store token as provided', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIn0.signature';
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const error = refreshToken.validateSync();
      expect(error).toBeUndefined();
      expect(refreshToken.token).toBe(token);
    });
  });

  describe('Expiration Date', () => {
    it('should accept future expiration dates', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        token: 'valid.jwt.token',
        expires_at: futureDate
      });

      const error = refreshToken.validateSync();
      expect(error).toBeUndefined();
      expect(refreshToken.expires_at).toEqual(futureDate);
    });

    it('should accept past expiration dates (for expired tokens)', () => {
      const pastDate = new Date(Date.now() - 1000);
      const refreshToken = new RefreshToken({
        user_id: new Types.ObjectId(),
        token: 'expired.jwt.token',
        expires_at: pastDate
      });

      const error = refreshToken.validateSync();
      expect(error).toBeUndefined();
      expect(refreshToken.expires_at).toEqual(pastDate);
    });
  });

  describe('Indexes', () => {
    it('should have unique index on token', () => {
      const indexes = RefreshToken.schema.indexes();
      const tokenIndex = indexes.find(idx => 
        idx[0].token !== undefined && idx[1]?.unique === true
      );
      expect(tokenIndex).toBeDefined();
    });

    it('should have index on expires_at for cleanup queries', () => {
      const indexes = RefreshToken.schema.indexes();
      const expiresAtIndex = indexes.find(idx => 
        idx[0].expires_at !== undefined
      );
      expect(expiresAtIndex).toBeDefined();
    });
  });
});
