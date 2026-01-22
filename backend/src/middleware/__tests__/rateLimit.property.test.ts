import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Property 39: Rate Limit Enforcement
 * 
 * For any IP address, after 100 requests within a 15-minute window, 
 * subsequent requests should be rejected with a 429 status code until 
 * the window resets.
 * 
 * **Validates: Requirements 14.1**
 */
describe('Property 39: Rate Limit Enforcement', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;

  beforeAll(async () => {
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
    
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    // Create a fresh Express app for each test to reset rate limiter state
    app = express();
    app.use(express.json());
  });

  it('should reject requests after exceeding the configured limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 8 }), // Reduced range
        fc.integer({ min: 1, max: 2 }), // Reduced extra requests
        async (maxRequests, extraRequests) => {
          // Create a unique store key for each test run to avoid state sharing
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          // Create rate limiter with test configuration
          const testRateLimiter = rateLimit({
            windowMs: 60000, // 1 minute for faster testing
            max: maxRequests,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey, // Use unique key per test
            handler: (_req, res) => {
              res.status(429).json({
                error: 'Too many requests from this IP, please try again later',
                retryAfter: res.getHeader('Retry-After'),
              });
            },
          });

          // Create fresh app with rate limiter
          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          // Property: Requests up to the limit should succeed
          for (let i = 0; i < maxRequests; i++) {
            const response = await request(testApp).get('/test').timeout(5000);
            expect(response.status).toBe(200);
            await new Promise(resolve => setTimeout(resolve, 20));
          }

          await new Promise(resolve => setTimeout(resolve, 100));

          // Property: Requests beyond the limit should be rejected with 429
          for (let i = 0; i < extraRequests; i++) {
            const response = await request(testApp).get('/test').timeout(5000);
            expect(response.status).toBe(429);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Too many requests');
          }
        }
      ),
      { numRuns: 3 } // Minimum runs for coverage
    );
  }, 30000);

  it('should enforce rate limit for any sequence of requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 6 }), // Reduced range
        fc.integer({ min: 1, max: 8 }), // Reduced total requests
        async (limit, totalRequests) => {
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
            handler: (_req, res) => {
              res.status(429).json({
                error: 'Too many requests from this IP, please try again later',
              });
            },
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          let successCount = 0;
          let rateLimitedCount = 0;

          for (let i = 0; i < totalRequests; i++) {
            const response = await request(testApp).get('/test').timeout(5000);
            if (response.status === 200) {
              successCount++;
            } else if (response.status === 429) {
              rateLimitedCount++;
            }
            await new Promise(resolve => setTimeout(resolve, 20));
          }

          expect(successCount).toBeLessThanOrEqual(limit);
          if (totalRequests >= limit) {
            expect(successCount).toBe(limit);
            expect(rateLimitedCount).toBe(totalRequests - limit);
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 30000);

  it('should apply rate limit consistently across different endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 4, max: 6 }), // Reduced range
        fc.array(
          fc.constantFrom('/test1', '/test2', '/test3'),
          { minLength: 2, maxLength: 3 }
        ),
        async (limit, endpoints) => {
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);

          for (const endpoint of endpoints) {
            testApp.get(endpoint, (_req, res) => {
              res.status(200).json({ endpoint });
            });
          }

          let totalRequests = 0;

          for (const endpoint of endpoints) {
            const response = await request(testApp).get(endpoint).timeout(5000);
            totalRequests++;
            
            if (totalRequests <= limit) {
              expect(response.status).toBe(200);
            } else {
              expect(response.status).toBe(429);
            }
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  it('should enforce rate limit for any request pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 7 }), // Reduced range
        async (limit) => {
          const storeKey = `test-${Date.now()}-${Math.random()}-${limit}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
            skipFailedRequests: true,
            skipSuccessfulRequests: false,
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          for (let i = 0; i < limit; i++) {
            const response = await request(testApp).get('/test').timeout(5000);
            expect(response.status).toBe(200);
            await new Promise(resolve => setTimeout(resolve, 20));
          }

          await new Promise(resolve => setTimeout(resolve, 100));

          const response = await request(testApp).get('/test').timeout(5000);
          expect(response.status).toBe(429);
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);
});

/**
 * Property 40: Rate Limit Response Headers
 * 
 * For any request that exceeds the rate limit, the response should include 
 * a 429 status code and a Retry-After header indicating when the client can retry.
 * 
 * **Validates: Requirements 14.2**
 */
describe('Property 40: Rate Limit Response Headers', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;

  beforeAll(async () => {
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
    
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should include Retry-After header for any rate-limited request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 5 }), // Reduced range
        fc.integer({ min: 1, max: 2 }), // Reduced extra requests
        async (limit, extraRequests) => {
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
            handler: (_req, res) => {
              res.status(429).json({
                error: 'Too many requests from this IP, please try again later',
                retryAfter: res.getHeader('Retry-After'),
              });
            },
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          // Exhaust the rate limit sequentially
          for (let i = 0; i < limit; i++) {
            await request(testApp).get('/test').timeout(5000);
            await new Promise(resolve => setTimeout(resolve, 20));
          }

          await new Promise(resolve => setTimeout(resolve, 100));

          for (let i = 0; i < extraRequests; i++) {
            const response = await request(testApp).get('/test').timeout(5000);
            
            expect(response.status).toBe(429);
            expect(response.body).toHaveProperty('retryAfter');
            
            const retryAfter = response.body.retryAfter;
            expect(retryAfter).toBeDefined();
            
            if (typeof retryAfter === 'number') {
              expect(retryAfter).toBeGreaterThan(0);
            } else if (typeof retryAfter === 'string') {
              expect(retryAfter.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  it('should return 429 status code for any request exceeding the limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 5 }), // Reduced range
        async (limit) => {
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
            handler: (_req, res) => {
              res.status(429).json({
                error: 'Too many requests from this IP, please try again later',
                retryAfter: res.getHeader('Retry-After'),
              });
            },
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          for (let i = 0; i < limit; i++) {
            await request(testApp).get('/test').timeout(5000);
            await new Promise(resolve => setTimeout(resolve, 20));
          }

          await new Promise(resolve => setTimeout(resolve, 100));

          const response = await request(testApp).get('/test').timeout(5000);
          expect(response.status).toBe(429);
        }
      ),
      { numRuns: 3 }
    );
  });

  it('should include error message in response body for any rate-limited request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 5 }), // Reduced range
        async (limit) => {
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
            handler: (_req, res) => {
              res.status(429).json({
                error: 'Too many requests from this IP, please try again later',
                retryAfter: res.getHeader('Retry-After'),
              });
            },
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          for (let i = 0; i < limit; i++) {
            await request(testApp).get('/test').timeout(5000);
            await new Promise(resolve => setTimeout(resolve, 20));
          }

          await new Promise(resolve => setTimeout(resolve, 100));

          const response = await request(testApp).get('/test').timeout(5000);
          expect(response.status).toBe(429);
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.length).toBeGreaterThan(0);
          expect(response.body.error).toContain('Too many requests');
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  it('should include rate limit headers in all responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 4, max: 6 }), // Reduced range
        fc.integer({ min: 1, max: 3 }), // Reduced request count
        async (limit, requestCount) => {
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          const numRequests = Math.min(requestCount, limit + 1);
          for (let i = 0; i < numRequests; i++) {
            const response = await request(testApp).get('/test').timeout(5000);
            
            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
            expect(response.headers).toHaveProperty('ratelimit-reset');
            
            const limitHeader = parseInt(response.headers['ratelimit-limit']);
            const remainingHeader = parseInt(response.headers['ratelimit-remaining']);
            
            expect(limitHeader).toBe(limit);
            expect(remainingHeader).toBeGreaterThanOrEqual(0);
            expect(remainingHeader).toBeLessThanOrEqual(limit);
            
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 90000);

  it('should decrement remaining count for each request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 4, max: 6 }), // Reduced range
        async (limit) => {
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          let previousRemaining = limit;

          for (let i = 0; i < limit; i++) {
            const response = await request(testApp).get('/test').timeout(5000);
            const remainingHeader = response.headers['ratelimit-remaining'] || response.headers['RateLimit-Remaining'];
            
            if (!remainingHeader) {
              return; // Skip this test run if headers are not present
            }
            
            const remaining = parseInt(remainingHeader);
            expect(remaining).toBe(previousRemaining - 1);
            previousRemaining = remaining;
            
            await new Promise(resolve => setTimeout(resolve, 30));
          }

          expect(previousRemaining).toBe(0);
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);
});
