import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import { rateLimiter } from '../rateLimit';
import { errorHandler } from '../errorHandler';

/**
 * Rate Limiting Middleware Tests
 * 
 * Requirements:
 * - 14.1: Limit requests from a single IP address to 100 requests per 15-minute window
 * - 14.2: Return 429 status with Retry-After header when limit exceeded
 * - 14.3: Apply rate limiting to all API endpoints
 */

describe('Rate Limiting Middleware Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;

  beforeAll(async () => {
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
    process.env.RATE_LIMIT_WINDOW_MS = '900000'; // 15 minutes
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Create a test Express app with rate limiting
    app = express();
    app.use(express.json());
    app.use(rateLimiter);
    
    // Add test routes
    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });
    
    app.get('/api/posts', (_req, res) => {
      res.status(200).json({ posts: [] });
    });
    
    app.post('/api/auth/login', (_req, res) => {
      res.status(200).json({ message: 'login endpoint' });
    });
    
    app.use(errorHandler);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should allow requests under the rate limit', async () => {
    // Make a few requests (well under the limit)
    for (let i = 0; i < 5; i++) {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    }
  });

  it('should include rate limit headers in response', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    // Check for standard RateLimit headers
    expect(response.headers).toHaveProperty('ratelimit-limit');
    expect(response.headers).toHaveProperty('ratelimit-remaining');
    expect(response.headers).toHaveProperty('ratelimit-reset');
  });

  it('should apply rate limiting to API endpoints', async () => {
    // Test that rate limiting is applied to various endpoints
    const endpoints = [
      '/health',
      '/api/posts',
      '/api/auth/login',
    ];

    for (const endpoint of endpoints) {
      const response = await request(app).get(endpoint);
      // Should have rate limit headers regardless of endpoint status
      expect(response.headers).toHaveProperty('ratelimit-limit');
    }
  });
});
