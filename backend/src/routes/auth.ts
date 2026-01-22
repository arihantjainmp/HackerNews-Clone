import { Router, Request, Response } from 'express';
import { register, login, refreshAccessToken, logout } from '../services/authService';
import { validateRequest, signupSchema, loginSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

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
 * - 201: { user: IUserResponse }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 409: { error: string } - Username or email already exists
 *
 * Requirements: 1.9
 */
router.post(
  '/signup',
  validateRequest(signupSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    // Register user (includes password strength validation)
    await register(username, email, password);

    // Automatically log in the user after registration
    const { user, accessToken, refreshToken } = await login(email, password);

    // Set HttpOnly cookies
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ user });
  })
);

/**
 * POST /api/auth/login
 * Authenticate user and generate tokens
 *
 * Request body:
 * - email: string (valid email format)
 * - password: string
 *
 * Response:
 * - 200: { user: IUserResponse }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Invalid credentials
 *
 * Requirements: 1.10
 */
router.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Authenticate user and generate tokens
    const { user, accessToken, refreshToken } = await login(email, password);

    // Set HttpOnly cookies
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({ user });
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using a valid refresh token
 * Implements token rotation for enhanced security
 *
 * Request body (optional if cookie is present):
 * - refreshToken: string
 *
 * Response:
 * - 200: { message: string }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Invalid or expired refresh token
 *
 * Requirements: 2.6
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    // Generate new tokens (token rotation)
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await refreshAccessToken(refreshToken);

    // Set new HttpOnly cookies
    res.cookie('access_token', newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', newRefreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({ message: 'Token refreshed' });
  })
);

/**
 * POST /api/auth/logout
 * Invalidate refresh token to log out user
 *
 * Request body (optional if cookie is present):
 * - refreshToken: string
 *
 * Response:
 * - 200: { message: string }
 * - 400: { errors: Array<{ field: string, message: string }> } - Validation errors
 * - 401: { error: string } - Invalid or already used refresh token
 *
 * Requirements: 1.11
 */
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (refreshToken) {
      try {
        // Invalidate refresh token
        await logout(refreshToken);
      } catch (error) {
        // Ignore errors during logout (e.g. token already invalid)
      }
    }

    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.status(200).json({ message: 'Logged out successfully' });
  })
);

/**
 * GET /api/auth/me
 * Get current authenticated user's information
 *
 * Headers:
 * - Authorization: Bearer <accessToken>
 *
 * Response:
 * - 200: { user: { _id, username, email, created_at } }
 * - 401: { error: string } - Not authenticated or invalid token
 */
router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    // userId is set by authenticateToken middleware
    const user = await User.findById(req.userId).select('-password_hash');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      user: {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        created_at: user.created_at.toISOString(),
      },
    });
  })
);

export default router;
