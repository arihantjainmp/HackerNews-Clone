import { Router, Request, Response } from 'express';
import {
  register,
  login,
  refreshAccessToken,
  logout
} from '../services/authService';
import {
  validateRequest,
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user account
 * 
 * Request body:
 * - username: string (3-20 characters, alphanumeric with underscores/hyphens)
 * - email: string (valid email format)
 * - password: string (min 8 chars, must meet strength requirements)
 * 
 * Response:
 * - 201: { user: IUserResponse, accessToken: string, refreshToken: string }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 409: { error: string } - Username or email already exists
 * 
 * Requirements: 1.9
 */
router.post('/signup', validateRequest(signupSchema), asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  // Register user (includes password strength validation)
  await register(username, email, password);

  // Automatically log in the user after registration
  const loginResult = await login(email, password);

  res.status(201).json(loginResult);
}));

/**
 * POST /api/auth/login
 * Authenticate user and generate tokens
 * 
 * Request body:
 * - email: string (valid email format)
 * - password: string
 * 
 * Response:
 * - 200: { user: IUserResponse, accessToken: string, refreshToken: string }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Invalid credentials
 * 
 * Requirements: 1.10
 */
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Authenticate user and generate tokens
  const result = await login(email, password);

  res.status(200).json(result);
}));

/**
 * POST /api/auth/refresh
 * Refresh access token using a valid refresh token
 * Implements token rotation for enhanced security
 * 
 * Request body:
 * - refreshToken: string
 * 
 * Response:
 * - 200: { accessToken: string, refreshToken: string }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Invalid or expired refresh token
 * 
 * Requirements: 2.6
 */
router.post('/refresh', validateRequest(refreshTokenSchema), asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  // Generate new tokens (token rotation)
  const result = await refreshAccessToken(refreshToken);

  res.status(200).json(result);
}));

/**
 * POST /api/auth/logout
 * Invalidate refresh token to log out user
 * 
 * Request body:
 * - refreshToken: string
 * 
 * Response:
 * - 200: { message: string }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Invalid or already used refresh token
 * 
 * Requirements: 1.11
 */
router.post('/logout', validateRequest(logoutSchema), asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  // Invalidate refresh token
  await logout(refreshToken);

  res.status(200).json({ message: 'Logged out successfully' });
}));

export default router;
