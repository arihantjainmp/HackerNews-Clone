import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { register, login, refreshAccessToken, AuthenticationError } from '../authService';
import { User } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';
import { verifyAccessToken, verifyRefreshToken } from '../../utils/jwt';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Set up environment variables for JWT
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

afterEach(async () => {
  // Ensure cleanup after each test
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

/**
 * Property 2: Token Generation Completeness
 * 
 * For any successful login with valid credentials, both an Access_Token 
 * and Refresh_Token should be generated and returned.
 * 
 * **Validates: Requirements 1.3**
 */
describe('Property 2: Token Generation Completeness', () => {
  it('should generate both Access_Token and Refresh_Token for any valid login', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid password
        fc.string({ minLength: 8, maxLength: 50 })
          .filter(p => 
            /[A-Z]/.test(p) && 
            /[a-z]/.test(p) && 
            /[0-9]/.test(p) && 
            /[!@#$%^&*(),.?":{}|<>]/.test(p)
          ),
        fc.uuid(),
        async (password, uniqueId) => {
          // Create unique username and email using UUID
          const uniqueUsername = `u${uniqueId.replace(/-/g, '').substring(0, 18)}`;
          const uniqueEmail = `${uniqueId}@example.com`;
          
          // Register the user
          await register(uniqueUsername, uniqueEmail, password);
          
          // Login with the credentials
          const result = await login(uniqueEmail, password);
          
          // Property: Both tokens must be present
          expect(result.accessToken).toBeDefined();
          expect(result.refreshToken).toBeDefined();
          expect(typeof result.accessToken).toBe('string');
          expect(typeof result.refreshToken).toBe('string');
          expect(result.accessToken.length).toBeGreaterThan(0);
          expect(result.refreshToken.length).toBeGreaterThan(0);
          
          // Property: Both tokens must be valid JWTs
          const accessPayload = verifyAccessToken(result.accessToken);
          const refreshPayload = verifyRefreshToken(result.refreshToken);
          
          expect(accessPayload).toBeDefined();
          expect(refreshPayload).toBeDefined();
          expect(accessPayload.userId).toBe(result.user._id);
          expect(refreshPayload.userId).toBe(result.user._id);
          
          // Property: Refresh token must be stored in database
          const storedToken = await RefreshToken.findOne({ token: result.refreshToken });
          expect(storedToken).toBeDefined();
          expect(storedToken!.user_id.toString()).toBe(result.user._id);
          
          // Cleanup after each property test run
          await User.deleteMany({ email: uniqueEmail });
          await RefreshToken.deleteMany({ token: result.refreshToken });
        }
      ),
      { numRuns: 50 }
    );
  }, 60000); // 60 second timeout for property-based test with database operations
});

/**
 * Property 4: Token Refresh Correctness
 * 
 * For any expired Access_Token paired with a valid Refresh_Token, 
 * requesting a token refresh should return a new valid Access_Token.
 * 
 * **Validates: Requirements 2.3**
 */
describe('Property 4: Token Refresh Correctness', () => {
  it('should generate new valid tokens for any valid refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid password
        fc.string({ minLength: 8, maxLength: 50 })
          .filter(p => 
            /[A-Z]/.test(p) && 
            /[a-z]/.test(p) && 
            /[0-9]/.test(p) && 
            /[!@#$%^&*(),.?":{}|<>]/.test(p)
          ),
        fc.uuid(),
        fc.integer({ min: 1, max: 9999 }), // Add random number for uniqueness (4 digits max)
        async (password, uniqueId, randomNum) => {
          // Create unique username and email using UUID and random number
          // Username: u + 15 chars from UUID + 4 digit number = max 20 chars
          const uniqueUsername = `u${uniqueId.replace(/-/g, '').substring(0, 15)}${randomNum}`;
          const uniqueEmail = `${uniqueId}${randomNum}@example.com`;
          
          // Register and login to get initial tokens
          await register(uniqueUsername, uniqueEmail, password);
          const loginResult = await login(uniqueEmail, password);
          
          // Refresh the access token using valid refresh token
          const refreshResult = await refreshAccessToken(loginResult.refreshToken);
          
          // Property: New tokens must be generated
          expect(refreshResult.accessToken).toBeDefined();
          expect(refreshResult.refreshToken).toBeDefined();
          expect(typeof refreshResult.accessToken).toBe('string');
          expect(typeof refreshResult.refreshToken).toBe('string');
          expect(refreshResult.accessToken.length).toBeGreaterThan(0);
          expect(refreshResult.refreshToken.length).toBeGreaterThan(0);
          
          // Property: New tokens must be different from old tokens
          expect(refreshResult.accessToken).not.toBe(loginResult.accessToken);
          expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken);
          
          // Property: New access token must be valid and contain correct userId
          const newAccessPayload = verifyAccessToken(refreshResult.accessToken);
          expect(newAccessPayload).toBeDefined();
          expect(newAccessPayload.userId).toBe(loginResult.user._id);
          
          // Property: New refresh token must be valid and contain correct userId
          const newRefreshPayload = verifyRefreshToken(refreshResult.refreshToken);
          expect(newRefreshPayload).toBeDefined();
          expect(newRefreshPayload.userId).toBe(loginResult.user._id);
          
          // Property: Old refresh token must be marked as used
          const oldTokenDoc = await RefreshToken.findOne({ token: loginResult.refreshToken });
          expect(oldTokenDoc).toBeDefined();
          expect(oldTokenDoc!.is_used).toBe(true);
          expect(oldTokenDoc!.used_at).toBeInstanceOf(Date);
          
          // Property: New refresh token must be stored in database and not used
          const newTokenDoc = await RefreshToken.findOne({ token: refreshResult.refreshToken });
          expect(newTokenDoc).toBeDefined();
          expect(newTokenDoc!.is_used).toBe(false);
          expect(newTokenDoc!.user_id.toString()).toBe(loginResult.user._id);
          expect(newTokenDoc!.expires_at).toBeInstanceOf(Date);
          expect(newTokenDoc!.expires_at.getTime()).toBeGreaterThan(Date.now());
          
          // Cleanup after each property test run
          await User.deleteMany({ email: uniqueEmail });
          await RefreshToken.deleteMany({ user_id: oldTokenDoc!.user_id });
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 5: Invalid Token Rejection
 * 
 * For any invalid or expired Refresh_Token, attempting to use it 
 * should result in authentication failure requiring re-login.
 * 
 * **Validates: Requirements 2.4**
 */
describe('Property 5: Invalid Token Rejection', () => {
  it('should reject any invalid refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary invalid token strings
        fc.string({ minLength: 10, maxLength: 200 }),
        async (invalidToken) => {
          // Property: Invalid token must be rejected with AuthenticationError
          await expect(refreshAccessToken(invalidToken)).rejects.toThrow(AuthenticationError);
          await expect(refreshAccessToken(invalidToken)).rejects.toThrow('Invalid or expired refresh token');
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('should reject any already used refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid password
        fc.string({ minLength: 8, maxLength: 50 })
          .filter(p => 
            /[A-Z]/.test(p) && 
            /[a-z]/.test(p) && 
            /[0-9]/.test(p) && 
            /[!@#$%^&*(),.?":{}|<>]/.test(p)
          ),
        fc.uuid(),
        fc.integer({ min: 1, max: 9999 }), // Add random number for uniqueness (4 digits max)
        async (password, uniqueId, randomNum) => {
          // Create unique username and email using UUID and random number
          // Username: u + 15 chars from UUID + 4 digit number = max 20 chars
          const uniqueUsername = `u${uniqueId.replace(/-/g, '').substring(0, 15)}${randomNum}`;
          const uniqueEmail = `${uniqueId}${randomNum}@example.com`;
          
          // Register and login to get initial tokens
          await register(uniqueUsername, uniqueEmail, password);
          const loginResult = await login(uniqueEmail, password);
          
          // Use the refresh token once
          await refreshAccessToken(loginResult.refreshToken);
          
          // Property: Already used token must be rejected with AuthenticationError
          await expect(refreshAccessToken(loginResult.refreshToken)).rejects.toThrow(AuthenticationError);
          await expect(refreshAccessToken(loginResult.refreshToken)).rejects.toThrow('Invalid or expired refresh token');
          
          // Cleanup after each property test run
          await User.deleteMany({ email: uniqueEmail });
          await RefreshToken.deleteMany({});
        }
      ),
      { numRuns: 50 }
    );
  }, 60000); // 60 second timeout for property-based test with database operations
  
  it('should reject any expired refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid password
        fc.string({ minLength: 8, maxLength: 50 })
          .filter(p => 
            /[A-Z]/.test(p) && 
            /[a-z]/.test(p) && 
            /[0-9]/.test(p) && 
            /[!@#$%^&*(),.?":{}|<>]/.test(p)
          ),
        fc.uuid(),
        fc.integer({ min: 1, max: 9999 }), // Add random number for uniqueness (4 digits max)
        async (password, uniqueId, randomNum) => {
          // Create unique username and email using UUID and random number
          // Username: u + 15 chars from UUID + 4 digit number = max 20 chars
          const uniqueUsername = `u${uniqueId.replace(/-/g, '').substring(0, 15)}${randomNum}`;
          const uniqueEmail = `${uniqueId}${randomNum}@example.com`;
          
          // Register and login to get initial tokens
          await register(uniqueUsername, uniqueEmail, password);
          const loginResult = await login(uniqueEmail, password);
          
          // Manually expire the token in database
          await RefreshToken.updateOne(
            { token: loginResult.refreshToken },
            { $set: { expires_at: new Date(Date.now() - 1000) } }
          );
          
          // Property: Expired token must be rejected with AuthenticationError
          await expect(refreshAccessToken(loginResult.refreshToken)).rejects.toThrow(AuthenticationError);
          await expect(refreshAccessToken(loginResult.refreshToken)).rejects.toThrow('Invalid or expired refresh token');
          
          // Cleanup after each property test run
          await User.deleteMany({ email: uniqueEmail });
          await RefreshToken.deleteMany({});
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 6: Logout Token Invalidation
 * 
 * For any user session, after logout is called with the Refresh_Token, 
 * that token should no longer be usable for generating new Access_Tokens.
 * 
 * **Validates: Requirements 1.4**
 */
describe('Property 6: Logout Token Invalidation', () => {
  it('should invalidate any refresh token after logout', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid password
        fc.string({ minLength: 8, maxLength: 50 })
          .filter(p => 
            /[A-Z]/.test(p) && 
            /[a-z]/.test(p) && 
            /[0-9]/.test(p) && 
            /[!@#$%^&*(),.?":{}|<>]/.test(p)
          ),
        fc.uuid(),
        fc.integer({ min: 1, max: 9999 }), // Add random number for uniqueness (4 digits max)
        async (password, uniqueId, randomNum) => {
          // Create unique username and email using UUID and random number
          // Username: u + 15 chars from UUID + 4 digit number = max 20 chars
          const uniqueUsername = `u${uniqueId.replace(/-/g, '').substring(0, 15)}${randomNum}`;
          const uniqueEmail = `${uniqueId}${randomNum}@example.com`;
          
          // Register and login to get initial tokens
          await register(uniqueUsername, uniqueEmail, password);
          const loginResult = await login(uniqueEmail, password);
          
          // Import logout function
          const { logout } = await import('../authService');
          
          // Logout with the refresh token
          await logout(loginResult.refreshToken);
          
          // Property: Token must be marked as used in database
          const tokenDoc = await RefreshToken.findOne({ token: loginResult.refreshToken });
          expect(tokenDoc).toBeDefined();
          expect(tokenDoc!.is_used).toBe(true);
          expect(tokenDoc!.used_at).toBeInstanceOf(Date);
          expect(tokenDoc!.used_at!.getTime()).toBeLessThanOrEqual(Date.now());
          
          // Property: Token must not be usable for generating new Access_Tokens
          await expect(refreshAccessToken(loginResult.refreshToken)).rejects.toThrow(AuthenticationError);
          await expect(refreshAccessToken(loginResult.refreshToken)).rejects.toThrow('Invalid or expired refresh token');
          
          // Cleanup after each property test run
          await User.deleteMany({ email: uniqueEmail });
          await RefreshToken.deleteMany({});
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('should prevent any subsequent use of logged out token', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid password
        fc.string({ minLength: 8, maxLength: 50 })
          .filter(p => 
            /[A-Z]/.test(p) && 
            /[a-z]/.test(p) && 
            /[0-9]/.test(p) && 
            /[!@#$%^&*(),.?":{}|<>]/.test(p)
          ),
        fc.uuid(),
        fc.integer({ min: 1, max: 9999 }), // Add random number for uniqueness (4 digits max)
        fc.integer({ min: 2, max: 5 }), // Number of attempts to use the token
        async (password, uniqueId, randomNum, attempts) => {
          // Create unique username and email using UUID and random number
          // Username: u + 15 chars from UUID + 4 digit number = max 20 chars
          const uniqueUsername = `u${uniqueId.replace(/-/g, '').substring(0, 15)}${randomNum}`;
          const uniqueEmail = `${uniqueId}${randomNum}@example.com`;
          
          // Register and login to get initial tokens
          await register(uniqueUsername, uniqueEmail, password);
          const loginResult = await login(uniqueEmail, password);
          
          // Import logout function
          const { logout } = await import('../authService');
          
          // Logout with the refresh token
          await logout(loginResult.refreshToken);
          
          // Property: Multiple attempts to use the token should all fail
          for (let i = 0; i < attempts; i++) {
            await expect(refreshAccessToken(loginResult.refreshToken)).rejects.toThrow(AuthenticationError);
            await expect(refreshAccessToken(loginResult.refreshToken)).rejects.toThrow('Invalid or expired refresh token');
          }
          
          // Property: Token should still be marked as used after all attempts
          const tokenDoc = await RefreshToken.findOne({ token: loginResult.refreshToken });
          expect(tokenDoc).toBeDefined();
          expect(tokenDoc!.is_used).toBe(true);
          
          // Cleanup after each property test run
          await User.deleteMany({ email: uniqueEmail });
          await RefreshToken.deleteMany({});
        }
      ),
      { numRuns: 50 }
    );
  });
});

