import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Joi schema
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({ errors });
      return;
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

/**
 * Query validation middleware factory
 * Creates middleware that validates request query parameters against a Joi schema
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({ errors });
      return;
    }

    // Replace req.query with validated and sanitized value
    req.query = value;
    next();
  };
};

/**
 * Signup validation schema
 * Requirements: 1.9
 */
export const signupSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 20 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
      'any.required': 'Username is required',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required',
    }),
});

/**
 * Login validation schema
 * Requirements: 1.10
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

/**
 * Refresh token validation schema
 * Requirements: 2.6
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

/**
 * Logout validation schema
 * Requirements: 1.11
 */
export const logoutSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

/**
 * Vote validation schema
 * Requirements: 5.9, 8.8
 */
export const voteSchema = Joi.object({
  direction: Joi.number()
    .valid(1, -1)
    .required()
    .messages({
      'any.only': 'Direction must be 1 (upvote) or -1 (downvote)',
      'any.required': 'Direction is required',
    }),
});

/**
 * Create post validation schema
 * Requirements: 3.9, 12.2 (XSS prevention)
 */
export const createPostSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(300)
    .trim()
    .required()
    .messages({
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title must not exceed 300 characters',
      'string.empty': 'Title cannot be empty',
      'any.required': 'Title is required',
    }),
  url: Joi.string()
    .trim()
    .optional()
    .custom((value, helpers) => {
      // First check for dangerous protocols for XSS prevention
      const lowerValue = value.toLowerCase();
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
      
      for (const protocol of dangerousProtocols) {
        if (lowerValue.startsWith(protocol)) {
          return helpers.error('string.unsafeProtocol');
        }
      }
      
      // Only allow http and https
      if (!lowerValue.startsWith('http://') && !lowerValue.startsWith('https://')) {
        return helpers.error('string.invalidProtocol');
      }
      
      // Basic URL validation
      try {
        new URL(value);
      } catch {
        return helpers.error('string.uri');
      }
      
      return value;
    })
    .messages({
      'string.uri': 'Please provide a valid URL',
      'string.unsafeProtocol': 'URL protocol is not allowed for security reasons',
      'string.invalidProtocol': 'URL must use http:// or https:// protocol',
    }),
  text: Joi.string()
    .max(10000)
    .trim()
    .optional()
    .messages({
      'string.max': 'Text must not exceed 10000 characters',
    }),
}).xor('url', 'text') // Exactly one of url or text must be provided
  .messages({
    'object.xor': 'Post must have either url or text, but not both',
  });

/**
 * Get posts query validation schema
 * Requirements: 4.1
 */
export const getPostsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
    }),
  sort: Joi.string()
    .valid('new', 'top', 'best')
    .optional()
    .messages({
      'any.only': 'Sort must be one of: new, top, best',
    }),
  q: Joi.string()
    .trim()
    .optional()
    .messages({
      'string.base': 'Search query must be a string',
    }),
});

/**
 * Create comment validation schema
 * Requirements: 6.8, 6.9
 */
export const createCommentSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(10000)
    .trim()
    .required()
    .messages({
      'string.min': 'Comment content must be at least 1 character long',
      'string.max': 'Comment content must not exceed 10000 characters',
      'string.empty': 'Comment content cannot be empty',
      'any.required': 'Comment content is required',
    }),
});

/**
 * Edit comment validation schema
 * Requirements: 7.7
 */
export const editCommentSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(10000)
    .trim()
    .required()
    .messages({
      'string.min': 'Comment content must be at least 1 character long',
      'string.max': 'Comment content must not exceed 10000 characters',
      'string.empty': 'Comment content cannot be empty',
      'any.required': 'Comment content is required',
    }),
});
