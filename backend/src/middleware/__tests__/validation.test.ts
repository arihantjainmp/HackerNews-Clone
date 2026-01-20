import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import {
  validateRequest,
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../validation';

describe('Validation Middleware', () => {
  describe('validateRequest', () => {
    it('should call next() when validation passes', () => {
      const req = {
        body: { email: 'test@example.com', password: 'password123' },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = validateRequest(loginSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', () => {
      const req = {
        body: { email: 'invalid-email' },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      const middleware = validateRequest(loginSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
          }),
        ]),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should strip unknown fields from request body', () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          unknownField: 'should be removed',
        },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = validateRequest(loginSchema);
      middleware(req, res, next);

      expect(req.body).not.toHaveProperty('unknownField');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('signupSchema', () => {
    it('should validate valid signup data', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = signupSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject username shorter than 3 characters', () => {
      const data = {
        username: 'ab',
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = signupSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('username');
    });

    it('should reject username longer than 20 characters', () => {
      const data = {
        username: 'a'.repeat(21),
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = signupSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('username');
    });

    it('should reject invalid email format', () => {
      const data = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
      };

      const { error } = signupSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('email');
    });

    it('should reject password shorter than 8 characters', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'short',
      };

      const { error } = signupSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('password');
    });

    it('should accept username with underscores and hyphens', () => {
      const data = {
        username: 'test_user-123',
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = signupSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should require all fields', () => {
      const data = {};

      const { error } = signupSchema.validate(data, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error?.details.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = loginSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
      };

      const { error } = loginSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('email');
    });

    it('should require both fields', () => {
      const data = {};

      const { error } = loginSchema.validate(data, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error?.details.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token data', () => {
      const data = {
        refreshToken: 'valid-token-string',
      };

      const { error } = refreshTokenSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should require refreshToken field', () => {
      const data = {};

      const { error } = refreshTokenSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('refreshToken');
    });
  });

  describe('logoutSchema', () => {
    it('should validate valid logout data', () => {
      const data = {
        refreshToken: 'valid-token-string',
      };

      const { error } = logoutSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should require refreshToken field', () => {
      const data = {};

      const { error } = logoutSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('refreshToken');
    });
  });
});
