import cors from 'cors';

/**
 * CORS Configuration
 * 
 * Requirements:
 * - 15.1: Configure CORS to allow requests from the Frontend origin
 * - 15.2: Allow credentials (cookies, authorization headers) in CORS requests
 * - 15.3: Specify allowed HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
 * - 15.4: Specify allowed headers including Authorization and Content-Type
 * - 15.5: Restrict CORS to specific trusted origins from environment variables in production
 */

/**
 * Get allowed origins based on environment
 * In production, only allow specific trusted origins from environment variables
 * In development, allow localhost origins
 */
function getAllowedOrigins(): string | string[] {
  const frontendUrl = process.env.FRONTEND_URL;
  const nodeEnv = process.env.NODE_ENV;

  // In production, strictly use environment variable
  if (nodeEnv === 'production') {
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL must be set in production environment');
    }
    return frontendUrl;
  }

  // In development, allow configured frontend URL or default to localhost:3000
  return frontendUrl || 'http://localhost:3000';
}

/**
 * CORS origin validation function
 * Requirement 15.5: Restrict origins in production
 */
function corsOriginValidator(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) {
    callback(null, true);
    return;
  }

  // Check if origin is allowed
  if (typeof allowedOrigins === 'string') {
    // Single origin (production)
    if (origin === allowedOrigins) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  } else {
    // Multiple origins (development)
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}

/**
 * CORS middleware configuration
 * 
 * Requirement 15.1: Allow requests from frontend origin
 * Requirement 15.2: Enable credentials (cookies, authorization headers)
 * Requirement 15.3: Specify allowed HTTP methods
 * Requirement 15.4: Specify allowed headers
 * Requirement 15.5: Restrict origins in production
 */
export const corsMiddleware = cors({
  // Requirement 15.1 & 15.5: Allow requests from frontend origin, restrict in production
  origin: corsOriginValidator,
  
  // Requirement 15.2: Enable credentials (cookies, authorization headers)
  credentials: true,
  
  // Requirement 15.3: Specify allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // Requirement 15.4: Specify allowed headers including Authorization and Content-Type
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  
  // Allow preflight requests to be cached for 24 hours
  maxAge: 86400,
  
  // Return 204 for successful OPTIONS requests
  optionsSuccessStatus: 204
});

