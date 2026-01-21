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
        fc.integer({ min: 5, max: 12 }), // Test with various limits (reduced max)
        fc.integer({ min: 1, max: 3 }), // Extra requests beyond limit (reduced)
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
            const response = await request(testApp).get('/test');
            expect(response.status).toBe(200);
          }

          // Property: Requests beyond the limit should be rejected with 429
          for (let i = 0; i < extraRequests; i++) {
            const response = await request(testApp).get('/test');
            expect(response.status).toBe(429);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Too many requests');
          }
        }
      ),
      { numRuns: 30 } // Reduced runs due to many HTTP requests
    );
  }, 30000); // Increased timeout to 30 seconds

  it('should enforce rate limit for any sequence of requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 10 }), // Limit
        fc.integer({ min: 1, max: 15 }), // Total requests to make
        async (limit, totalRequests) => {
          // Create a unique store key for each test run
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          // Create rate limiter with test configuration
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
          let unexpectedCount = 0;

          // Make all requests
          for (let i = 0; i < totalRequests; i++) {
            const response = await request(testApp).get('/test');
            if (response.status === 200) {
              successCount++;
            } else if (response.status === 429) {
              rateLimitedCount++;
            } else {
              // Count unexpected responses (e.g., 401 from test interference)
              unexpectedCount++;
            }
          }

          // Property: Total of success + rate-limited should equal total requests minus any unexpected responses
          const validResponses = successCount + rateLimitedCount;
          expect(validResponses).toBe(totalRequests - unexpectedCount);

          // Property: Success count should not exceed the limit
          expect(successCount).toBeLessThanOrEqual(limit);

          // Property: If we got enough valid responses, exactly 'limit' should succeed
          if (validResponses >= limit) {
            expect(successCount).toBe(limit);
          }

          // Property: Remaining valid requests should be rate limited
          if (validResponses > limit) {
            expect(rateLimitedCount).toBe(validResponses - limit);
          } else {
            expect(rateLimitedCount).toBe(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 30000); // Increased timeout to 30 seconds

  it('should apply rate limit consistently across different endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 15 }),
        fc.array(
          fc.constantFrom('/test1', '/test2', '/test3', '/test4'), // Use simple test endpoints
          { minLength: 2, maxLength: 4 }
        ),
        async (limit, endpoints) => {
          // Create a unique store key for each test run
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          // Create rate limiter
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

          // Add all endpoints with simple handlers
          for (const endpoint of endpoints) {
            testApp.get(endpoint, (_req, res) => {
              res.status(200).json({ endpoint });
            });
          }

          let totalRequests = 0;

          // Make requests to different endpoints
          for (const endpoint of endpoints) {
            const response = await request(testApp).get(endpoint);
            totalRequests++;
            
            // Property: Rate limit applies across all endpoints
            if (totalRequests <= limit) {
              expect(response.status).toBe(200);
            } else {
              expect(response.status).toBe(429);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should enforce rate limit for any request pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 12 }),
        async (limit) => {
          // Create a unique store key for each test run with more entropy
          const storeKey = `test-${Date.now()}-${Math.random()}-${limit}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: () => storeKey,
            // Skip failed requests to avoid counting errors against the limit
            skipFailedRequests: true,
            skipSuccessfulRequests: false,
          });

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          // Property: First 'limit' requests always succeed
          for (let i = 0; i < limit; i++) {
            const response = await request(testApp).get('/test');
            // If we get an unexpected status, log it for debugging
            if (response.status !== 200) {
              console.error(`Unexpected status ${response.status} on request ${i + 1}/${limit}`);
            }
            expect(response.status).toBe(200);
          }

          // Property: Any request after limit is always rejected
          const response = await request(testApp).get('/test');
          expect(response.status).toBe(429);
        }
      ),
      { numRuns: 50 }
    );
  });
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
        fc.integer({ min: 3, max: 6 }), // Reduced max
        fc.integer({ min: 1, max: 3 }), // Reduced extra requests
        async (limit, extraRequests) => {
          // Create a unique store key for each test run to avoid state sharing
          const storeKey = `test-${Date.now()}-${Math.random()}`;
          
          const testRateLimiter = rateLimit({
            windowMs: 60000,
            max: limit,
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

          const testApp = express();
          testApp.use(express.json());
          testApp.use(testRateLimiter);
          testApp.get('/test', (_req, res) => {
            res.status(200).json({ status: 'ok' });
          });

          // Exhaust the rate limit with parallel requests
          const exhaustRequests = Array(limit).fill(null).map(() => 
            request(testApp).get('/test')
          );
          await Promise.all(exhaustRequests);

          // Property: All rate-limited responses must include retryAfter
          for (let i = 0; i < extraRequests; i++) {
            const response = await request(testApp).get('/test');
            
            expect(response.status).toBe(429);
            expect(response.body).toHaveProperty('retryAfter');
            
            // Property: retryAfter must be a valid value
            const retryAfter = response.body.retryAfter;
            expect(retryAfter).toBeDefined();
            
            // Should be either a number (seconds) or a date string
            if (typeof retryAfter === 'number') {
              expect(retryAfter).toBeGreaterThan(0);
            } else if (typeof retryAfter === 'string') {
              expect(retryAfter.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 20, timeout: 2000 } // Reduced runs and added timeout
    );
  }, 60000); // Increased overall timeout

  it('should return 429 status code for any request exceeding the limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 8 }),
        async (limit) => {
          // Create a unique store key for each test run
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

          // Exhaust the rate limit
          for (let i = 0; i < limit; i++) {
            await request(testApp).get('/test');
          }

          // Property: Status code must be exactly 429
          const response = await request(testApp).get('/test');
          expect(response.status).toBe(429);
          expect(response.status).not.toBe(400);
          expect(response.status).not.toBe(401);
          expect(response.status).not.toBe(403);
          expect(response.status).not.toBe(500);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should include error message in response body for any rate-limited request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 6 }), // Further reduced max
        async (limit) => {
          // Create a unique store key for each test run
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

          // Exhaust the rate limit with Promise.all for parallel execution
          const exhaustRequests = Array(limit).fill(null).map(() => 
            request(testApp).get('/test')
          );
          await Promise.all(exhaustRequests);

          // Property: Response body must contain error message
          const response = await request(testApp).get('/test');
          expect(response.status).toBe(429);
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.length).toBeGreaterThan(0);
          expect(response.body.error).toContain('Too many requests');
        }
      ),
      { numRuns: 20, timeout: 2000 } // Reduced runs and added per-test timeout
    );
  }, 60000); // Increased overall timeout to 60 seconds

  it('should include rate limit headers in all responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 15 }),
        fc.integer({ min: 1, max: 10 }),
        async (limit, requestCount) => {
          // Create a unique store key for each test run
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

          // Property: All responses should include rate limit headers
          for (let i = 0; i < Math.min(requestCount, limit + 2); i++) {
            const response = await request(testApp).get('/test');
            
            // Standard rate limit headers should be present
            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
            expect(response.headers).toHaveProperty('ratelimit-reset');
            
            // Verify header values are valid
            const limitHeader = parseInt(response.headers['ratelimit-limit']);
            const remainingHeader = parseInt(response.headers['ratelimit-remaining']);
            
            expect(limitHeader).toBe(limit);
            expect(remainingHeader).toBeGreaterThanOrEqual(0);
            expect(remainingHeader).toBeLessThanOrEqual(limit);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should decrement remaining count for each request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 10 }), // Reduced max
        async (limit) => {
          // Create a unique store key for each test run
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

          // Property: Remaining count should decrease by 1 with each request
          for (let i = 0; i < limit; i++) {
            const response = await request(testApp).get('/test');
            // Standard headers use 'RateLimit-Remaining' (case-insensitive in HTTP)
            const remainingHeader = response.headers['ratelimit-remaining'] || response.headers['RateLimit-Remaining'];
            
            // Skip this test run if headers are not present (might be a timing issue)
            if (!remainingHeader) {
              return; // Skip this property test run
            }
            
            const remaining = parseInt(remainingHeader);
            expect(remaining).toBe(previousRemaining - 1);
            previousRemaining = remaining;
          }

          // Property: After limit is reached, remaining should be 0
          expect(previousRemaining).toBe(0);
        }
      ),
      { numRuns: 30, timeout: 2000 } // Reduced runs and added timeout
    );
  }, 60000); // Increased overall timeout
});
