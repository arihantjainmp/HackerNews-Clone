import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import authRoutes from '../auth';
import { User } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';

let mongoServer: MongoMemoryServer;
let app: Application;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Set up test environment variables
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';

  // Create Express app for testing
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear database before each test
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('POST /api/auth/signup', () => {
  it('should register a new user and return tokens', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user.username).toBe('testuser');
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('should reject signup with weak password', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('should reject signup with duplicate email', async () => {
    // Create first user
    await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser1',
        email: 'test@example.com',
        password: 'Test123!@#'
      });

    // Try to create second user with same email
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser2',
        email: 'test@example.com',
        password: 'Test123!@#'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('email already exists');
  });

  it('should reject signup with duplicate username', async () => {
    // Create first user
    await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test1@example.com',
        password: 'Test123!@#'
      });

    // Try to create second user with same username
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test2@example.com',
        password: 'Test123!@#'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('username already exists');
  });

  it('should reject signup with invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Test123!@#'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Create a test user
    await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      });
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user.email).toBe('test@example.com');
  });

  it('should reject login with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'Test123!@#'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Invalid email or password');
  });

  it('should reject login with invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword123!@#'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Invalid email or password');
  });

  it('should reject login with missing fields', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeEach(async () => {
    // Create a test user and get tokens
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      });

    refreshToken = signupResponse.body.refreshToken;
  });

  it('should refresh access token with valid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    // New refresh token should be different (token rotation)
    expect(response.body.refreshToken).not.toBe(refreshToken);
  });

  it('should reject refresh with invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'invalid-token'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject refresh with already used token', async () => {
    // Use the refresh token once
    await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken
      });

    // Try to use it again
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Invalid or expired refresh token');
  });
});

describe('POST /api/auth/logout', () => {
  let refreshToken: string;

  beforeEach(async () => {
    // Create a test user and get tokens
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      });

    refreshToken = signupResponse.body.refreshToken;
  });

  it('should logout successfully with valid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .send({
        refreshToken
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logged out successfully');
  });

  it('should reject logout with invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .send({
        refreshToken: 'invalid-token'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject logout with already used token', async () => {
    // Logout once
    await request(app)
      .post('/api/auth/logout')
      .send({
        refreshToken
      });

    // Try to logout again with same token
    const response = await request(app)
      .post('/api/auth/logout')
      .send({
        refreshToken
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Invalid or already used refresh token');
  });

  it('should invalidate refresh token after logout', async () => {
    // Logout
    await request(app)
      .post('/api/auth/logout')
      .send({
        refreshToken
      });

    // Try to use the token for refresh
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken
      });

    expect(response.status).toBe(401);
  });
});

describe('Complete authentication flow', () => {
  it('should complete signup → login → refresh → logout flow', async () => {
    // 1. Signup
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      });

    expect(signupResponse.status).toBe(201);
    const { accessToken: signupAccessToken, refreshToken: signupRefreshToken } = signupResponse.body;

    // 2. Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

    expect(loginResponse.status).toBe(200);
    const { refreshToken: loginRefreshToken } = loginResponse.body;

    // 3. Refresh token
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: loginRefreshToken
      });

    expect(refreshResponse.status).toBe(200);
    const { refreshToken: newRefreshToken } = refreshResponse.body;

    // 4. Logout
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .send({
        refreshToken: newRefreshToken
      });

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.message).toBe('Logged out successfully');
  });
});
