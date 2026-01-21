import request from 'supertest';
import express from 'express';
import authRouter from '../auth';
import { User } from '../../models/User';
import { generateAccessToken } from '../../utils/jwt';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/jwt');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('GET /api/auth/me', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    created_at: new Date('2024-01-01'),
    toISOString: jest.fn().mockReturnValue('2024-01-01T00:00:00.000Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return current user data when authenticated', async () => {
    // Mock JWT verification
    (require('../../utils/jwt').verifyAccessToken as jest.Mock).mockReturnValue({
      userId: mockUser._id
    });

    // Mock User.findById
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });

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
    (require('../../utils/jwt').verifyAccessToken as jest.Mock).mockReturnValue({
      userId: 'nonexistent-id'
    });

    // Mock User.findById returning null
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });

    const token = 'valid-token';

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });
});
