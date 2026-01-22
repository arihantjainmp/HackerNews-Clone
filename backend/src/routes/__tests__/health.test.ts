import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import healthRoutes from '../health';

describe('Health Check Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', healthRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /health', () => {
    it('should return healthy status when database is connected', async () => {
      // Mock mongoose connection
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
      
      const mockAdmin = vi.fn().mockReturnValue({
        ping: vi.fn().mockResolvedValue({}),
      });
      
      Object.defineProperty(mongoose.connection, 'db', {
        value: { admin: mockAdmin },
        writable: true,
        configurable: true,
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body.checks.database.status).toBe('up');
      expect(response.body.checks.database).toHaveProperty('responseTime');
      expect(response.body.checks.memory).toHaveProperty('usage');
      expect(response.body.checks.memory).toHaveProperty('percentage');
    });

    it('should return unhealthy status when database is not connected', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database.status).toBe('down');
      expect(response.body.checks.database).toHaveProperty('error');
    });

    it('should return unhealthy status when database ping fails', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
      
      const mockAdmin = vi.fn().mockReturnValue({
        ping: vi.fn().mockRejectedValue(new Error('Connection timeout')),
      });
      
      Object.defineProperty(mongoose.connection, 'db', {
        value: { admin: mockAdmin },
        writable: true,
        configurable: true,
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database.status).toBe('down');
      expect(response.body.checks.database.error).toBe('Connection timeout');
    });

    it('should include memory usage information', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
      
      const mockAdmin = vi.fn().mockReturnValue({
        ping: vi.fn().mockResolvedValue({}),
      });
      
      Object.defineProperty(mongoose.connection, 'db', {
        value: { admin: mockAdmin },
        writable: true,
        configurable: true,
      });

      const response = await request(app).get('/health');

      expect(response.body.checks.memory.usage).toHaveProperty('heapUsed');
      expect(response.body.checks.memory.usage).toHaveProperty('heapTotal');
      expect(response.body.checks.memory.usage).toHaveProperty('external');
      expect(response.body.checks.memory.usage).toHaveProperty('rss');
      expect(typeof response.body.checks.memory.percentage).toBe('number');
    });

    it('should return degraded status when memory usage is high', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
      
      const mockAdmin = vi.fn().mockReturnValue({
        ping: vi.fn().mockResolvedValue({}),
      });
      
      Object.defineProperty(mongoose.connection, 'db', {
        value: { admin: mockAdmin },
        writable: true,
        configurable: true,
      });

      // Mock high memory usage
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 800 * 1024 * 1024, // 800 MB
        heapTotal: 1000 * 1024 * 1024, // 1000 MB (80% usage)
        external: 10 * 1024 * 1024,
        rss: 900 * 1024 * 1024,
        arrayBuffers: 0,
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.memory.status).toBe('warning');
    });
  });

  describe('GET /ready', () => {
    it('should return ready when database is connected', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
      
      const mockAdmin = vi.fn().mockReturnValue({
        ping: vi.fn().mockResolvedValue({}),
      });
      
      Object.defineProperty(mongoose.connection, 'db', {
        value: { admin: mockAdmin },
        writable: true,
        configurable: true,
      });

      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ready' });
    });

    it('should return not ready when database is not connected', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const response = await request(app).get('/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not ready');
      expect(response.body).toHaveProperty('reason');
    });

    it('should return not ready when database ping fails', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
      
      const mockAdmin = vi.fn().mockReturnValue({
        ping: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      
      Object.defineProperty(mongoose.connection, 'db', {
        value: { admin: mockAdmin },
        writable: true,
        configurable: true,
      });

      const response = await request(app).get('/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not ready');
      expect(response.body.reason).toBe('Network error');
    });
  });

  describe('GET /live', () => {
    it('should always return alive status', async () => {
      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return alive even when database is down', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('alive');
    });
  });
});
