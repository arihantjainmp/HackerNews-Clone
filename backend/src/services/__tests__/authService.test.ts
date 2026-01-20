import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { register, login, ValidationError, AuthenticationError } from '../authService';
import { User } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';
import { comparePassword } from '../../utils/password';
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

describe('register', () => {
  it('should create a new user with valid credentials', async () => {
    const result = await register('testuser', 'test@example.com', 'Password123!');

    expect(result).toMatchObject({
      username: 'testuser',
      email: 'test@example.com'
    });
    expect(result._id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result).not.toHaveProperty('password_hash');
  });

  it('should hash the password before storing', async () => {
    const password = 'Password123!';
    const result = await register('testuser', 'test@example.com', password);

    const user = await User.findById(result._id);
    expect(user).toBeDefined();
    expect(user!.password_hash).not.toBe(password);
    
    // Verify the hash is valid
    const isValid = await comparePassword(password, user!.password_hash);
    expect(isValid).toBe(true);
  });

  it('should reject weak password (too short)', async () => {
    await expect(
      register('testuser', 'test@example.com', 'Pass1!')
    ).rejects.toThrow(ValidationError);
    
    await expect(
      register('testuser', 'test@example.com', 'Pass1!')
    ).rejects.toThrow('Password must be at least 8 characters long');
  });

  it('should reject weak password (no uppercase)', async () => {
    await expect(
      register('testuser', 'test@example.com', 'password123!')
    ).rejects.toThrow(ValidationError);
    
    await expect(
      register('testuser', 'test@example.com', 'password123!')
    ).rejects.toThrow('Password must contain at least one uppercase letter');
  });

  it('should reject weak password (no lowercase)', async () => {
    await expect(
      register('testuser', 'test@example.com', 'PASSWORD123!')
    ).rejects.toThrow(ValidationError);
    
    await expect(
      register('testuser', 'test@example.com', 'PASSWORD123!')
    ).rejects.toThrow('Password must contain at least one lowercase letter');
  });

  it('should reject weak password (no number)', async () => {
    await expect(
      register('testuser', 'test@example.com', 'Password!')
    ).rejects.toThrow(ValidationError);
    
    await expect(
      register('testuser', 'test@example.com', 'Password!')
    ).rejects.toThrow('Password must contain at least one number');
  });

  it('should reject weak password (no special character)', async () => {
    await expect(
      register('testuser', 'test@example.com', 'Password123')
    ).rejects.toThrow(ValidationError);
    
    await expect(
      register('testuser', 'test@example.com', 'Password123')
    ).rejects.toThrow('Password must contain at least one special character');
  });

  it('should reject duplicate username', async () => {
    await register('testuser', 'test1@example.com', 'Password123!');

    await expect(
      register('testuser', 'test2@example.com', 'Password123!')
    ).rejects.toThrow(ValidationError);
    
    await expect(
      register('testuser', 'test2@example.com', 'Password123!')
    ).rejects.toThrow('username already exists');
  });

  it('should reject duplicate email', async () => {
    await register('testuser1', 'test@example.com', 'Password123!');

    await expect(
      register('testuser2', 'test@example.com', 'Password123!')
    ).rejects.toThrow(ValidationError);
    
    await expect(
      register('testuser2', 'test@example.com', 'Password123!')
    ).rejects.toThrow('email already exists');
  });

  it('should allow multiple users with different credentials', async () => {
    const user1 = await register('user1', 'user1@example.com', 'Password123!');
    const user2 = await register('user2', 'user2@example.com', 'Password456!');

    expect(user1.username).toBe('user1');
    expect(user2.username).toBe('user2');
    expect(user1._id).not.toBe(user2._id);
  });
});

describe('login', () => {
  it('should authenticate user with valid credentials', async () => {
    // First register a user
    await register('testuser', 'test@example.com', 'Password123!');

    // Then login
    const result = await login('test@example.com', 'Password123!');

    expect(result.user).toMatchObject({
      username: 'testuser',
      email: 'test@example.com'
    });
    expect(result.user._id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user).not.toHaveProperty('password_hash');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('should generate valid Access_Token', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const result = await login('test@example.com', 'Password123!');

    // Verify the access token is valid
    const payload = verifyAccessToken(result.accessToken);
    expect(payload.userId).toBe(result.user._id);
  });

  it('should generate valid Refresh_Token', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const result = await login('test@example.com', 'Password123!');

    // Verify the refresh token is valid
    const payload = verifyRefreshToken(result.refreshToken);
    expect(payload.userId).toBe(result.user._id);
  });

  it('should store Refresh_Token in database', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const result = await login('test@example.com', 'Password123!');

    // Check that refresh token was stored
    const storedToken = await RefreshToken.findOne({ token: result.refreshToken });
    expect(storedToken).toBeDefined();
    expect(storedToken!.user_id.toString()).toBe(result.user._id);
    expect(storedToken!.expires_at).toBeInstanceOf(Date);
    expect(storedToken!.expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it('should reject login with non-existent email', async () => {
    await expect(
      login('nonexistent@example.com', 'Password123!')
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      login('nonexistent@example.com', 'Password123!')
    ).rejects.toThrow('Invalid email or password');
  });

  it('should reject login with incorrect password', async () => {
    await register('testuser', 'test@example.com', 'Password123!');

    await expect(
      login('test@example.com', 'WrongPassword123!')
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      login('test@example.com', 'WrongPassword123!')
    ).rejects.toThrow('Invalid email or password');
  });

  it('should handle case-insensitive email lookup', async () => {
    await register('testuser', 'test@example.com', 'Password123!');

    // Login with uppercase email
    const result = await login('TEST@EXAMPLE.COM', 'Password123!');
    expect(result.user.email).toBe('test@example.com');
  });

  it('should allow multiple logins for the same user', async () => {
    await register('testuser', 'test@example.com', 'Password123!');

    const login1 = await login('test@example.com', 'Password123!');
    
    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const login2 = await login('test@example.com', 'Password123!');

    // Both logins should succeed with different tokens
    expect(login1.accessToken).not.toBe(login2.accessToken);
    expect(login1.refreshToken).not.toBe(login2.refreshToken);

    // Both refresh tokens should be stored
    const tokenCount = await RefreshToken.countDocuments();
    expect(tokenCount).toBe(2);
  });
});

describe('refreshAccessToken', () => {
  it('should generate new tokens with valid refresh token', async () => {
    // Register and login to get initial tokens
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    // Import refreshAccessToken
    const { refreshAccessToken } = await import('../authService');

    // Refresh the access token
    const refreshResult = await refreshAccessToken(loginResult.refreshToken);

    expect(refreshResult.accessToken).toBeDefined();
    expect(refreshResult.refreshToken).toBeDefined();
    expect(refreshResult.accessToken).not.toBe(loginResult.accessToken);
    expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken);
  });

  it('should mark old refresh token as used', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { refreshAccessToken } = await import('../authService');
    await refreshAccessToken(loginResult.refreshToken);

    // Check that old token is marked as used
    const oldToken = await RefreshToken.findOne({ token: loginResult.refreshToken });
    expect(oldToken).toBeDefined();
    expect(oldToken!.is_used).toBe(true);
    expect(oldToken!.used_at).toBeInstanceOf(Date);
  });

  it('should store new refresh token in database', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { refreshAccessToken } = await import('../authService');
    const refreshResult = await refreshAccessToken(loginResult.refreshToken);

    // Check that new token is stored
    const newToken = await RefreshToken.findOne({ token: refreshResult.refreshToken });
    expect(newToken).toBeDefined();
    expect(newToken!.is_used).toBe(false);
    expect(newToken!.expires_at).toBeInstanceOf(Date);
    expect(newToken!.expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it('should reject already used refresh token', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { refreshAccessToken } = await import('../authService');
    
    // Use the refresh token once
    await refreshAccessToken(loginResult.refreshToken);

    // Try to use it again - should fail
    await expect(
      refreshAccessToken(loginResult.refreshToken)
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      refreshAccessToken(loginResult.refreshToken)
    ).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should reject expired refresh token', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    // Manually expire the token in database
    await RefreshToken.updateOne(
      { token: loginResult.refreshToken },
      { $set: { expires_at: new Date(Date.now() - 1000) } }
    );

    const { refreshAccessToken } = await import('../authService');

    await expect(
      refreshAccessToken(loginResult.refreshToken)
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      refreshAccessToken(loginResult.refreshToken)
    ).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should reject invalid refresh token', async () => {
    const { refreshAccessToken } = await import('../authService');

    await expect(
      refreshAccessToken('invalid-token')
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      refreshAccessToken('invalid-token')
    ).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should reject non-existent refresh token', async () => {
    // Generate a valid JWT but don't store it in database
    const { generateRefreshToken } = await import('../../utils/jwt');
    const fakeToken = generateRefreshToken('fake-user-id');

    const { refreshAccessToken } = await import('../authService');

    await expect(
      refreshAccessToken(fakeToken.token)
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      refreshAccessToken(fakeToken.token)
    ).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should prevent concurrent refresh token reuse', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { refreshAccessToken } = await import('../authService');

    // Simulate concurrent requests trying to use the same refresh token
    const results = await Promise.allSettled([
      refreshAccessToken(loginResult.refreshToken),
      refreshAccessToken(loginResult.refreshToken),
      refreshAccessToken(loginResult.refreshToken)
    ]);

    // Only one should succeed
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(2);

    // Verify the token is marked as used
    const tokenDoc = await RefreshToken.findOne({ token: loginResult.refreshToken });
    expect(tokenDoc!.is_used).toBe(true);
  });

  it('should generate valid new access token', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { refreshAccessToken } = await import('../authService');
    const refreshResult = await refreshAccessToken(loginResult.refreshToken);

    // Verify the new access token is valid
    const payload = verifyAccessToken(refreshResult.accessToken);
    expect(payload.userId).toBe(loginResult.user._id);
  });

  it('should generate valid new refresh token', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { refreshAccessToken } = await import('../authService');
    const refreshResult = await refreshAccessToken(loginResult.refreshToken);

    // Verify the new refresh token is valid
    const payload = verifyRefreshToken(refreshResult.refreshToken);
    expect(payload.userId).toBe(loginResult.user._id);
  });
});

describe('logout', () => {
  it('should invalidate refresh token on logout', async () => {
    // Register and login to get tokens
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { logout } = await import('../authService');

    // Logout
    await logout(loginResult.refreshToken);

    // Check that token is marked as used
    const tokenDoc = await RefreshToken.findOne({ token: loginResult.refreshToken });
    expect(tokenDoc).toBeDefined();
    expect(tokenDoc!.is_used).toBe(true);
    expect(tokenDoc!.used_at).toBeInstanceOf(Date);
  });

  it('should reject using invalidated token after logout', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { logout, refreshAccessToken } = await import('../authService');

    // Logout
    await logout(loginResult.refreshToken);

    // Try to use the token - should fail
    await expect(
      refreshAccessToken(loginResult.refreshToken)
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      refreshAccessToken(loginResult.refreshToken)
    ).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should reject logout with invalid token', async () => {
    const { logout } = await import('../authService');

    await expect(
      logout('invalid-token')
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      logout('invalid-token')
    ).rejects.toThrow('Invalid or already used refresh token');
  });

  it('should reject logout with already used token', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { logout } = await import('../authService');

    // Logout once
    await logout(loginResult.refreshToken);

    // Try to logout again with same token - should fail
    await expect(
      logout(loginResult.refreshToken)
    ).rejects.toThrow(AuthenticationError);
    
    await expect(
      logout(loginResult.refreshToken)
    ).rejects.toThrow('Invalid or already used refresh token');
  });

  it('should allow logout after token refresh', async () => {
    await register('testuser', 'test@example.com', 'Password123!');
    const loginResult = await login('test@example.com', 'Password123!');

    const { logout, refreshAccessToken } = await import('../authService');

    // Refresh to get new tokens
    const refreshResult = await refreshAccessToken(loginResult.refreshToken);

    // Logout with new refresh token should succeed
    await logout(refreshResult.refreshToken);

    // Verify new token is invalidated
    const tokenDoc = await RefreshToken.findOne({ token: refreshResult.refreshToken });
    expect(tokenDoc).toBeDefined();
    expect(tokenDoc!.is_used).toBe(true);
  });
});

