import request from 'supertest';
import express from 'express';
import authRouter from '../auth';
import { User } from '../../models/User';
import { generateAccessToken, verifyAccessToken } from '../../utils/jwt';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../models/User');
vi.mock('../../utils/jwt');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('GET /api/auth/me', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    created_at: new Date('2024-01-01'),
    toISOString: vi.fn().mockReturnValue('2024-01-01T00:00:00.000Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current user data when authenticated', async () => {
    // Mock JWT verification
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: mockUser._id
    });

    // Mock User.findById
    vi.mocked(User.findById).mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser)
    } as any);

    const token = 'valid-token';

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        _id: mockUser._id,
        username: mockUser.username,
        email: mockUser.email,
        created_at: mockUser.created_at.toISOString()
      }
    });
  });

  it('should return 401 when no token provided', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 when user not found', async () => {
    // Mock JWT verification
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: 'nonexistent-id'
    });

    // Mock User.findById returning null
    vi.mocked(User.findById).mockReturnValue({
      select: vi.fn().mockResolvedValue(null)
    } as any);

    const token = 'valid-token';

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });
});
