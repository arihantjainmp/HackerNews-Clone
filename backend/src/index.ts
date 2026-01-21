import express, { Application } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { validateEnv } from './utils/validateEnv';
import { errorHandler, rateLimiter, corsMiddleware } from './middleware';
import authRoutes from './routes/auth';
import voteRoutes from './routes/vote';
import postRoutes from './routes/post';
import commentRoutes from './routes/comment';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', voteRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', commentRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware (must be last)
// Requirement 13.7: Use error handling middleware as final middleware
app.use(errorHandler);

// Connect to MongoDB and start server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hacker-news-clone';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

export default app;
