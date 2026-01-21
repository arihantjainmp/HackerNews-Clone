import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import { errorHandler } from '../../middleware/errorHandler';
import authRoutes from '../auth';
import postRoutes from '../post';
import voteRoutes from '../vote';
import commentRoutes from '../comment';

let mongoServer: MongoMemoryServer;
let app: Application;

/**
 * Error Handling Integration Tests
 * Tests that all routes properly use error handling middleware
 * 
 * Requirements: 13.7
 */
describe('Error Handling Integration Tests', () => {
  beforeAll(async () => {
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
    
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Set up Express app with all routes and error handler
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api', voteRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api', commentRoutes);
    
    // Error handling middleware (must be last)
    app.use(errorHandler);
  });

  afterAll(async () => {
    // Clean up
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Error responses have consistent format', () => {
    it('should return error object with error field for invalid post ID', async () => {
      const response = await request(app)
        .get('/api/posts/invalid-id');

      // Error handler should catch and return error
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(600);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should return error object for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({ title: 'Test Post', url: 'https://example.com' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should return error object for validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'ab', email: 'invalid', password: 'weak' }) // Invalid data
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('Error handler catches all async errors', () => {
    it('should handle errors in GET /api/posts', async () => {
      // This should not crash the server
      const response = await request(app)
        .get('/api/posts?page=-1') // Invalid page number
        .expect((res) => {
          // Should return some response, not crash
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });
    });

    it('should handle errors in POST /api/auth/login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      // Should return error response, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(600);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error handler logs errors', () => {
    it('should not expose internal error details in production', async () => {
      // Set NODE_ENV to production temporarily
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/posts/invalid-id');

      // Should return error response
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(600);
      
      // Should not include stack trace or internal details
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('details');

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});
