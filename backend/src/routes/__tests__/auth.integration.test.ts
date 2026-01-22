import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../auth';
import { User } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';
import { verifyAccessToken } from '../../utils/jwt';
import { errorHandler } from '../../middleware/errorHandler';

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

  // Set up Express app with auth routes and cookie parser
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
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
      expect(signupResponse.body.user.username).toBe('testuser');
      expect(signupResponse.body.user.email).toBe('test@example.com');
      
      // Verify cookies are set
      const signupCookies = signupResponse.headers['set-cookie'];
      expect(signupCookies).toBeDefined();
      expect(signupCookies.some((c: string) => c.includes('access_token'))).toBe(true);
      expect(signupCookies.some((c: string) => c.includes('refresh_token'))).toBe(true);

      // Extract refresh token from cookies for next steps
      const refreshTokenCookie = signupCookies.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshTokenCookie).toBeDefined();

      // Step 2: Login with same credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('user');
      const loginCookies = loginResponse.headers['set-cookie'];
      expect(loginCookies).toBeDefined();
      
      const loginRefreshTokenCookie = loginCookies.find((c: string) => c.startsWith('refresh_token='));
      expect(loginRefreshTokenCookie).toBeDefined();

      // Step 3: Refresh access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [loginRefreshTokenCookie])
        .send({})
        .expect(200);

      expect(refreshResponse.body.message).toBe('Token refreshed');
      
      const refreshCookies = refreshResponse.headers['set-cookie'];
      expect(refreshCookies).toBeDefined();
      expect(refreshCookies.some((c: string) => c.includes('access_token'))).toBe(true);
      
      const newRefreshTokenCookie = refreshCookies.find((c: string) => c.startsWith('refresh_token='));
      expect(newRefreshTokenCookie).toBeDefined();

      // Step 4: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [newRefreshTokenCookie])
        .send({})
        .expect(200);

      expect(logoutResponse.body.message).toBe('Logged out successfully');
      
      // Verify cookies are cleared
      const logoutCookies = logoutResponse.headers['set-cookie'];
      expect(logoutCookies.some((c: string) => c.includes('access_token=;'))).toBe(true);
      expect(logoutCookies.some((c: string) => c.includes('refresh_token=;'))).toBe(true);

      // Step 5: Verify refresh token is invalidated after logout
      // Note: We need to send the token we just logged out with to verify it fails
      // Even though the client would have cleared it, we simulate a replay attack
      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [newRefreshTokenCookie]) // Send the token that was just logged out
        .send({})
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
  });

  describe('POST /api/auth/refresh', () => {
    let validRefreshTokenCookie: string;

    beforeEach(async () => {
      // Create user and get tokens
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      const cookies = signupResponse.headers['set-cookie'];
      validRefreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [validRefreshTokenCookie])
        .send({})
        .expect(200);

      expect(response.body.message).toBe('Token refreshed');
      
      const newCookies = response.headers['set-cookie'];
      expect(newCookies.some((c: string) => c.includes('access_token'))).toBe(true);
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    let validRefreshTokenCookie: string;

    beforeEach(async () => {
      // Create user and get tokens
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      const cookies = signupResponse.headers['set-cookie'];
      validRefreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
    });

    it('should invalidate refresh token on logout', async () => {
      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [validRefreshTokenCookie])
        .send({})
        .expect(200);

      expect(logoutResponse.body.message).toBe('Logged out successfully');

      // Verify token is invalidated by trying to use it
      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [validRefreshTokenCookie])
        .send({})
        .expect(401);
    });
  });
});