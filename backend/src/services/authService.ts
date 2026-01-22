import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { hashPassword, validatePasswordStrength, comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/jwt';
import { ValidationError, AuthenticationError } from '../utils/errors';

/**
 * User data returned from registration (without password_hash)
 */
export interface IUserResponse {
  _id: string;
  username: string;
  email: string;
  created_at: Date;
}

/**
 * Login response containing user data and authentication tokens
 */
export interface ILoginResponse {
  user: IUserResponse;
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new user with hashed password
 *
 * @param username - Unique username (3-20 characters)
 * @param email - Unique email address
 * @param password - Password meeting strength requirements
 * @returns Promise resolving to created user (without password_hash)
 * @throws ValidationError if username/email exists or password is weak
 */
export async function register(
  username: string,
  email: string,
  password: string
): Promise<IUserResponse> {
  // Validate password strength before hashing
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    throw new ValidationError(passwordValidation.error);
  }

  try {
    // Hash password using bcrypt
    const password_hash = await hashPassword(password);

    // Create user in database
    const user = await User.create({
      username,
      email,
      password_hash,
    });

    // Return user without password_hash
    return {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      created_at: user.created_at,
    };
  } catch (error: any) {
    // Handle duplicate username/email errors (MongoDB E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new ValidationError(`${field} already exists`);
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Authenticate user and generate tokens
 *
 * @param email - User's email address
 * @param password - User's plaintext password
 * @returns Promise resolving to user data and authentication tokens
 * @throws AuthenticationError if credentials are invalid
 */
export async function login(email: string, password: string): Promise<ILoginResponse> {
  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Compare password with stored hash
  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Generate Access_Token (15 minutes expiration)
  const accessTokenResult = generateAccessToken(user._id.toString());

  // Generate Refresh_Token (7 days expiration)
  const refreshTokenResult = generateRefreshToken(user._id.toString());

  // Store Refresh_Token in database
  await RefreshToken.create({
    user_id: user._id,
    token: refreshTokenResult.token,
    expires_at: refreshTokenResult.expiresAt,
  });

  // Return user (without password_hash) and tokens
  return {
    user: {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      created_at: user.created_at,
    },
    accessToken: accessTokenResult.token,
    refreshToken: refreshTokenResult.token,
  };
}

/**
 * Refresh access token using a valid refresh token
 * Implements token rotation: marks old refresh token as used and generates new tokens
 * Uses atomic findOneAndUpdate to prevent concurrent refresh token reuse
 *
 * @param refreshToken - The refresh token to exchange for new tokens
 * @returns Promise resolving to new access token and refresh token
 * @throws AuthenticationError if refresh token is invalid, expired, or already used
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  // Verify refresh token JWT signature and expiration
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Atomically find and mark token as used to prevent concurrent reuse
  // This prevents race conditions where multiple requests try to use the same refresh token
  const tokenDoc = await RefreshToken.findOneAndUpdate(
    {
      token: refreshToken,
      expires_at: { $gt: new Date() }, // Verify not expired in database
      is_used: false, // Only allow unused tokens
    },
    {
      $set: {
        is_used: true,
        used_at: new Date(),
      },
    },
    {
      new: false, // Return original document before update
    }
  );

  // If token not found, it's either invalid, expired, or already used
  if (!tokenDoc) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Generate new Access_Token (15 minutes expiration)
  const newAccessTokenResult = generateAccessToken(payload.userId);

  // Generate new Refresh_Token (7 days expiration) - token rotation
  const newRefreshTokenResult = generateRefreshToken(payload.userId);

  // Store new Refresh_Token in database
  await RefreshToken.create({
    user_id: tokenDoc.user_id,
    token: newRefreshTokenResult.token,
    expires_at: newRefreshTokenResult.expiresAt,
  });

  return {
    accessToken: newAccessTokenResult.token,
    refreshToken: newRefreshTokenResult.token,
  };
}

/**
 * Logout user by invalidating their refresh token
 * Marks the refresh token as used so it cannot be used again
 *
 * @param refreshToken - The refresh token to invalidate
 * @returns Promise resolving when token is invalidated
 * @throws AuthenticationError if refresh token is not found or already used
 */
export async function logout(refreshToken: string): Promise<void> {
  // Find and mark token as used/invalidated
  const tokenDoc = await RefreshToken.findOneAndUpdate(
    {
      token: refreshToken,
      is_used: false, // Only invalidate tokens that haven't been used
    },
    {
      $set: {
        is_used: true,
        used_at: new Date(),
      },
    },
    {
      new: false, // Return original document before update
    }
  );

  // If token not found or already used, throw error
  if (!tokenDoc) {
    throw new AuthenticationError('Invalid or already used refresh token');
  }
}
