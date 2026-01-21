/**
 * Manual Rate Limiting Test
 * 
 * This test demonstrates rate limiting by making many requests.
 * Run this test manually to verify rate limiting behavior:
 * 
 * npm test -- rateLimit.manual.test.ts --run
 * 
 * Note: This test is marked as skipped by default to avoid slowing down
 * the test suite. Remove .skip to run it.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';

describe.skip('Rate Limiting Manual Test (Skipped by default)', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;

  beforeAll(async () => {
    // Set up environment variables with a lower limit for testing
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
    
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Create a test Express app with a lower rate limit for testing
    app = express();
    app.use(express.json());
    
    // Create rate limiter with lower limits for testing
    const testRateLimiter = rateLimit({
      windowMs: 60000, // 1 minute
      max: 10, // 10 requests per minute
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests from this IP, please try again later',
          retryAfter: res.getHeader('Retry-After'),
        });
      },
    });
    
    app.use(testRateLimiter);
    
    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should return 429 after exceeding rate limit', async () => {
    // Make requests up to the limit
    for (let i = 0; i < 10; i++) {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    }

    // The next request should be rate limited
    const response = await request(app).get('/health');
    expect(response.status).toBe(429);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Too many requests');
    expect(response.body).toHaveProperty('retryAfter');
  }, 30000); // Increase timeout for this test
});
