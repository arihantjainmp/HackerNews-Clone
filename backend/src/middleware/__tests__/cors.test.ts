import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Application } from 'express';
import request from 'supertest';
import { corsMiddleware } from '../cors';

describe('CORS Middleware', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(corsMiddleware);
    
    // Add a test route
    app.get('/test', (_req, res) => {
      res.json({ message: 'test' });
    });
    
    app.post('/test', (_req, res) => {
      res.json({ message: 'test' });
    });
  });

  describe('Requirement 15.1: Allow requests from frontend origin', () => {
    it('should allow requests from configured frontend origin', async () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      const response = await request(app)
        .get('/test')
        .set('Origin', frontendUrl);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(frontendUrl);
    });
  });

  describe('Requirement 15.2: Enable credentials', () => {
    it('should allow credentials in CORS requests', async () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      const response = await request(app)
        .get('/test')
        .set('Origin', frontendUrl);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Requirement 15.3: Specify allowed HTTP methods', () => {
    it('should allow GET, POST, PUT, DELETE, OPTIONS methods', async () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      const response = await request(app)
        .options('/test')
        .set('Origin', frontendUrl)
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
      expect(allowedMethods).toContain('OPTIONS');
    });
  });

  describe('Requirement 15.4: Specify allowed headers', () => {
    it('should allow Authorization and Content-Type headers', async () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      const response = await request(app)
        .options('/test')
        .set('Origin', frontendUrl)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Authorization, Content-Type');

      expect(response.status).toBe(204);
      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toContain('Authorization');
      expect(allowedHeaders).toContain('Content-Type');
    });
  });

  describe('Requirement 15.5: Restrict origins in production', () => {
    it('should block requests from unauthorized origins', async () => {
      const unauthorizedOrigin = 'http://malicious-site.com';
      
      const response = await request(app)
        .get('/test')
        .set('Origin', unauthorizedOrigin);

      // CORS middleware blocks unauthorized origins with an error
      // This is the correct security behavior
      expect(response.status).toBe(500);
    });
    
    it('should allow requests from configured frontend origin', async () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      const response = await request(app)
        .get('/test')
        .set('Origin', frontendUrl);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(frontendUrl);
    });
  });
});
