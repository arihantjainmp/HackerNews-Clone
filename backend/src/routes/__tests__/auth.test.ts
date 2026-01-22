import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../auth';
import * as authService from '../../services/authService';
import { errorHandler } from '../../middleware/errorHandler';

// Mock authService
vi.mock('../../services/authService');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('POST /api/auth/signup', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register a new user and return tokens in cookies', async () => {
    const mockUser = {
      _id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      created_at: new Date()
    };

    vi.spyOn(authService, 'register').mockResolvedValue({
      user: mockUser as any,
      accessToken: 'accessToken',
      refreshToken: 'refreshToken'
    });

    vi.spyOn(authService, 'login').mockResolvedValue({
      user: mockUser as any,
      accessToken: 'accessToken',
      refreshToken: 'refreshToken'
    });

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    
    // Check cookies
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('access_token=accessToken'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('refresh_token=refreshToken'))).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should login with valid credentials and set cookies', async () => {
    const mockUser = {
      _id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      created_at: new Date()
    };

    vi.spyOn(authService, 'login').mockResolvedValue({
      user: mockUser as any,
      accessToken: 'accessToken',
      refreshToken: 'refreshToken'
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    
    // Check cookies
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('access_token=accessToken'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('refresh_token=refreshToken'))).toBe(true);
  });
});

describe('POST /api/auth/refresh', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should refresh access token with valid refresh token cookie', async () => {
    vi.spyOn(authService, 'refreshAccessToken').mockResolvedValue({
      accessToken: 'newAccessToken',
      refreshToken: 'newRefreshToken'
    });

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refresh_token=validRefreshToken'])
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Token refreshed');
    
    // Check new cookies
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('access_token=newAccessToken'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('refresh_token=newRefreshToken'))).toBe(true);
  });

  it('should reject missing refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/logout', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should logout successfully with valid refresh token cookie', async () => {
    vi.spyOn(authService, 'logout').mockResolvedValue();

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['refresh_token=validRefreshToken'])
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logged out successfully');
    
    // Check cookies are cleared
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('access_token=;'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('refresh_token=;'))).toBe(true);
  });
});