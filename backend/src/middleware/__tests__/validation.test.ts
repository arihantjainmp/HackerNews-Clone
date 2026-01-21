import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import {
  validateRequest,
  validateQuery,
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  voteSchema,
  createPostSchema,
  getPostsQuerySchema,
  createCommentSchema,
  editCommentSchema,
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

  describe('voteSchema', () => {
    it('should validate upvote (direction 1)', () => {
      const data = { direction: 1 };
      const { error } = voteSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should validate downvote (direction -1)', () => {
      const data = { direction: -1 };
      const { error } = voteSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject invalid direction values', () => {
      const data = { direction: 0 };
      const { error } = voteSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('direction');
    });

    it('should require direction field', () => {
      const data = {};
      const { error } = voteSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('direction');
    });
  });

  describe('createPostSchema', () => {
    it('should validate post with URL', () => {
      const data = {
        title: 'Test Post',
        url: 'https://example.com',
      };
      const { error } = createPostSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should validate post with text', () => {
      const data = {
        title: 'Test Post',
        text: 'This is the post content',
      };
      const { error } = createPostSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject post with both URL and text', () => {
      const data = {
        title: 'Test Post',
        url: 'https://example.com',
        text: 'This is the post content',
      };
      const { error } = createPostSchema.validate(data);
      expect(error).toBeDefined();
    });

    it('should reject post with neither URL nor text', () => {
      const data = {
        title: 'Test Post',
      };
      const { error } = createPostSchema.validate(data);
      expect(error).toBeDefined();
    });

    it('should reject empty title', () => {
      const data = {
        title: '',
        url: 'https://example.com',
      };
      const { error } = createPostSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('title');
    });

    it('should reject title exceeding 300 characters', () => {
      const data = {
        title: 'a'.repeat(301),
        url: 'https://example.com',
      };
      const { error } = createPostSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('title');
    });

    it('should reject invalid URL format', () => {
      const data = {
        title: 'Test Post',
        url: 'not-a-valid-url',
      };
      const { error } = createPostSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('url');
    });

    it('should trim whitespace from title', () => {
      const data = {
        title: '  Test Post  ',
        url: 'https://example.com',
      };
      const { error, value } = createPostSchema.validate(data);
      expect(error).toBeUndefined();
      expect(value.title).toBe('Test Post');
    });
  });

  describe('getPostsQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const data = {
        page: 1,
        limit: 25,
        sort: 'new',
        q: 'search term',
      };
      const { error } = getPostsQuerySchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should allow missing optional parameters', () => {
      const data = {};
      const { error } = getPostsQuerySchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject page less than 1', () => {
      const data = { page: 0 };
      const { error } = getPostsQuerySchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('page');
    });

    it('should reject limit exceeding 100', () => {
      const data = { limit: 101 };
      const { error } = getPostsQuerySchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('limit');
    });

    it('should reject invalid sort value', () => {
      const data = { sort: 'invalid' };
      const { error } = getPostsQuerySchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('sort');
    });

    it('should accept valid sort values', () => {
      const validSorts = ['new', 'top', 'best'];
      validSorts.forEach((sort) => {
        const data = { sort };
        const { error } = getPostsQuerySchema.validate(data);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('createCommentSchema', () => {
    it('should validate valid comment content', () => {
      const data = {
        content: 'This is a valid comment',
      };
      const { error } = createCommentSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject empty content', () => {
      const data = {
        content: '',
      };
      const { error } = createCommentSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('content');
    });

    it('should reject content exceeding 10000 characters', () => {
      const data = {
        content: 'a'.repeat(10001),
      };
      const { error } = createCommentSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('content');
    });

    it('should require content field', () => {
      const data = {};
      const { error } = createCommentSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('content');
    });

    it('should trim whitespace from content', () => {
      const data = {
        content: '  Valid comment  ',
      };
      const { error, value } = createCommentSchema.validate(data);
      expect(error).toBeUndefined();
      expect(value.content).toBe('Valid comment');
    });
  });

  describe('editCommentSchema', () => {
    it('should validate valid comment content', () => {
      const data = {
        content: 'This is edited content',
      };
      const { error } = editCommentSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should reject empty content', () => {
      const data = {
        content: '',
      };
      const { error } = editCommentSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('content');
    });

    it('should reject content exceeding 10000 characters', () => {
      const data = {
        content: 'a'.repeat(10001),
      };
      const { error } = editCommentSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('content');
    });

    it('should require content field', () => {
      const data = {};
      const { error } = editCommentSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('content');
    });
  });

  describe('validateQuery', () => {
    it('should call next() when query validation passes', () => {
      const req = {
        query: { page: '1', limit: '25' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = validateQuery(getPostsQuerySchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 with errors when query validation fails', () => {
      const req = {
        query: { page: '0' },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      const middleware = validateQuery(getPostsQuerySchema);
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

    it('should strip unknown fields from query', () => {
      const req = {
        query: { page: '1', unknownField: 'should be removed' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = validateQuery(getPostsQuerySchema);
      middleware(req, res, next);

      expect(req.query).not.toHaveProperty('unknownField');
      expect(next).toHaveBeenCalled();
    });
  });
});
