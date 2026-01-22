import express, { Application } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { validateEnv } from './utils/validateEnv';
import { errorHandler, rateLimiter, corsMiddleware, requestLogger } from './middleware';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import voteRoutes from './routes/vote';
import postRoutes from './routes/post';
import commentRoutes from './routes/comment';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notification';
import healthRoutes from './routes/health';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize());

// Request logging middleware
app.use(requestLogger);

// CORS middleware
// Requirement 15.1: Configure CORS to allow requests from frontend origin
// Requirement 15.2: Enable credentials (cookies, authorization headers)
// Requirement 15.3: Specify allowed HTTP methods
// Requirement 15.4: Specify allowed headers
// Requirement 15.5: Restrict origins in production
app.use(corsMiddleware);

// Rate limiting middleware
// Requirement 14.3: Apply rate limiting to all API endpoints
app.use(rateLimiter);

// Health check routes (before rate limiting for monitoring)
app.use('/', healthRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', voteRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api', notificationRoutes);

// Error handling middleware (must be last)
// Requirement 13.7: Use error handling middleware as final middleware
app.use(errorHandler);

// Connect to MongoDB and start server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hacker-news-clone';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB', { uri: MONGODB_URI.replace(/\/\/.*@/, '//***@') });
    app.listen(PORT, () => {
      logger.info('Server started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error', { error: error.message, stack: error.stack });
    process.exit(1);
  });

export default app;
