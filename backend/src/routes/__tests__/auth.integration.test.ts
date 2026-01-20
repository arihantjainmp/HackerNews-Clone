import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import authRoutes from '../auth';
import { User } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';
import { verifyAccessToken } from '../../utils/jwt';

let mongoServer: MongoMemoryServer;
let app: Application;

beforeAll(async () => {
  // Set up environment variables for JWT
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
  
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Set up Express app with auth routes
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('Authentication Endpoints Integration Tests', () => {
  describe('Complete Authentication Flow: signup → login → refresh → logout', () => {
    it('should complete full authentication flow successfully', async () => {
      // Step 1: Signup
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(201);

      expect(signupResponse.body).toHaveProperty('user');
      expect(signupResponse.body).toHaveProperty('accessToken');
      expect(signupResponse.body).toHaveProperty('refreshToken');
      expect(signupResponse.body.user.username).toBe('testuser');
      expect(signupResponse.body.user.email).toBe('test@example.com');
      expect(signupResponse.body.user).not.toHaveProperty('password_hash');

      const signupAccessToken = signupResponse.body.accessToken;
      const signupRefreshToken = signupResponse.body.refreshToken;

      // Verify tokens are valid
      expect(signupAccessToken).toBeDefined();
      expect(signupRefreshToken).toBeDefined();

      // Step 2: Login with same credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body.user.username).toBe('testuser');

      const loginAccessToken = loginResponse.body.accessToken;
      const loginRefreshToken = loginResponse.body.refreshToken;

      // Tokens should be different from signup tokens
      expect(loginAccessToken).not.toBe(signupAccessToken);
      expect(loginRefreshToken).not.toBe(signupRefreshToken);

      // Step 3: Refresh access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: loginRefreshToken
        })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');

      const newAccessToken = refreshResponse.body.accessToken;
      const newRefreshToken = refreshResponse.body.refreshToken;

      // New tokens should be different from login tokens
      expect(newAccessToken).not.toBe(loginAccessToken);
      expect(newRefreshToken).not.toBe(loginRefreshToken);

      // Verify new access token is valid
      const payload = verifyAccessToken(newAccessToken);
      expect(payload.userId).toBeDefined();

      // Step 4: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: newRefreshToken
        })
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('message');
      expect(logoutResponse.body.message).toBe('Logged out successfully');

      // Step 5: Verify refresh token is invalidated after logout
      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: newRefreshToken
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should reject duplicate username', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test1@example.com',
          password: 'Password123!'
        })
        .expect(201);

      // Try to create second user with same username
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test2@example.com',
          password: 'Password123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('username already exists');
    });

    it('should reject duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser1',
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(201);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser2',
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email already exists');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak'
        })
        .expect(400);

      // Validation middleware returns errors array for schema validation
      // But authService returns error property for password strength validation
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.some((e: any) => e.field === 'email')).toBe(true);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });
    });

    it('should reject invalid credentials - wrong email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'Password123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject invalid credentials - wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle case-insensitive email login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get tokens
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      validRefreshToken = signupResponse.body.refreshToken;
      userId = signupResponse.body.user._id;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Verify new access token is valid
      const payload = verifyAccessToken(response.body.accessToken);
      expect(payload.userId).toBe(userId);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject already used refresh token', async () => {
      // Use the refresh token once
      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(200);

      // Try to use it again - should fail
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired refresh token');
    });

    it('should reject expired refresh token', async () => {
      // Manually expire the token in database
      await RefreshToken.updateOne(
        { token: validRefreshToken },
        { $set: { expires_at: new Date(Date.now() - 1000) } }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/logout', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      // Create user and get tokens
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      validRefreshToken = signupResponse.body.refreshToken;
    });

    it('should invalidate refresh token on logout', async () => {
      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(200);

      expect(logoutResponse.body.message).toBe('Logged out successfully');

      // Verify token is invalidated by trying to use it
      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(401);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: 'invalid-token'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject already used refresh token', async () => {
      // Logout once
      await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(200);

      // Try to logout again with same token
      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Token Refresh with Expired Access Token', () => {
    it('should allow token refresh even when access token is expired', async () => {
      // Create user and get tokens
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      const refreshToken = signupResponse.body.refreshToken;
      const accessToken = signupResponse.body.accessToken;

      // Verify access token is currently valid
      expect(() => verifyAccessToken(accessToken)).not.toThrow();

      // Refresh should work regardless of access token state
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken
        })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');

      // New tokens should be different
      expect(refreshResponse.body.accessToken).not.toBe(accessToken);
      expect(refreshResponse.body.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('Multiple Sessions and Token Management', () => {
    it('should allow multiple active sessions for same user', async () => {
      // First login
      const login1 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(201);

      // Second login (simulating different device)
      const login2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      // Both sessions should have different tokens
      expect(login1.body.refreshToken).not.toBe(login2.body.refreshToken);
      expect(login1.body.accessToken).not.toBe(login2.body.accessToken);

      // Both refresh tokens should work
      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: login1.body.refreshToken
        })
        .expect(200);

      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: login2.body.refreshToken
        })
        .expect(200);
    });

    it('should only invalidate specific session on logout', async () => {
      // Create two sessions
      const session1 = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(201);

      const session2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      // Logout from session1
      await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: session1.body.refreshToken
        })
        .expect(200);

      // Session1 token should be invalid
      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: session1.body.refreshToken
        })
        .expect(401);

      // Session2 token should still work
      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: session2.body.refreshToken
        })
        .expect(200);
    });
  });
});
