import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware configuration
 *
 * Requirements:
 * - 14.1: Limit requests from a single IP address to 100 requests per 15-minute window
 * - 14.2: Return 429 status with Retry-After header when limit exceeded
 * - 14.3: Apply rate limiting to all API endpoints
 * - 14.4: Use express-rate-limit middleware for implementation
 * - 14.5: Allow configuring rate limits through environment variables in development
 */

/**
 * Create rate limiter with configurable limits
 * Default: 100 requests per 15 minutes per IP
 */
export const rateLimiter = rateLimit({
  // 15 minutes in milliseconds (configurable via environment variable)
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),

  // Maximum number of requests per window (configurable via environment variable)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Return 429 status when limit is exceeded
  statusCode: 429,

  // Error message when limit is exceeded
  message: 'Too many requests from this IP, please try again later',

  // Use standard headers (RateLimit-* headers)
  standardHeaders: true,

  // Disable legacy X-RateLimit-* headers
  legacyHeaders: false,

  // Skip successful requests (only count failed requests)
  skipSuccessfulRequests: false,

  // Skip failed requests
  skipFailedRequests: false,

  // Handler for when limit is exceeded (adds Retry-After header)
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});
