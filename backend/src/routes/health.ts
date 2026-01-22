import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import logger from '../utils/logger';

const router = Router();

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'critical';
      usage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
      };
      percentage: number;
    };
  };
}

/**
 * Health check endpoint that verifies:
 * - Database connectivity
 * - Memory usage
 * - System uptime
 */
router.get('/health', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const healthCheck: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {
        status: 'down',
      },
      memory: {
        status: 'ok',
        usage: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          rss: 0,
        },
        percentage: 0,
      },
    },
  };

  // Check database connectivity
  try {
    const dbStartTime = Date.now();
    
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      // Ping the database to verify connectivity
      await mongoose.connection.db.admin().ping();
      healthCheck.checks.database.status = 'up';
      healthCheck.checks.database.responseTime = Date.now() - dbStartTime;
    } else {
      healthCheck.checks.database.status = 'down';
      healthCheck.checks.database.error = 'Database not connected';
      healthCheck.status = 'unhealthy';
    }
  } catch (error) {
    healthCheck.checks.database.status = 'down';
    healthCheck.checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    healthCheck.status = 'unhealthy';
    logger.error('Health check database error', { error });
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  healthCheck.checks.memory.usage = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    external: Math.round(memUsage.external / 1024 / 1024), // MB
    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
  };
  healthCheck.checks.memory.percentage = Math.round(memPercentage);

  if (memPercentage > 90) {
    healthCheck.checks.memory.status = 'critical';
    healthCheck.status = healthCheck.status === 'unhealthy' ? 'unhealthy' : 'degraded';
  } else if (memPercentage > 75) {
    healthCheck.checks.memory.status = 'warning';
    healthCheck.status = healthCheck.status === 'unhealthy' ? 'unhealthy' : 'degraded';
  }

  // Set appropriate HTTP status code
  const statusCode = healthCheck.status === 'healthy' ? 200 : healthCheck.status === 'degraded' ? 200 : 503;

  const totalTime = Date.now() - startTime;
  logger.info('Health check completed', {
    status: healthCheck.status,
    responseTime: totalTime,
    dbStatus: healthCheck.checks.database.status,
  });

  res.status(statusCode).json(healthCheck);
});

/**
 * Readiness check endpoint for Kubernetes/container orchestration
 * Returns 200 only when the service is ready to accept traffic
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'database not connected' });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({ 
      status: 'not ready', 
      reason: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Liveness check endpoint for Kubernetes/container orchestration
 * Returns 200 if the service is alive (even if not ready)
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', uptime: process.uptime() });
});

export default router;
