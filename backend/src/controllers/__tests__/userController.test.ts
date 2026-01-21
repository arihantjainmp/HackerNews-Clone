import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { getUserProfile } from '../userController';
import { User } from '../../models/User';
import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';
import { NotFoundError } from '../../utils/errors';

// Mock the models
vi.mock('../../models/User');
vi.mock('../../models/Post');
vi.mock('../../models/Comment');

describe('userController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      query: {}
    };
    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile with posts and comments', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date('2024-01-01')
      };

      const mockPosts = [
        {
          _id: 'post1',
          title: 'Test Post',
          type: 'text',
          text: 'Content',
          author_id: { _id: 'user123', username: 'testuser', email: 'test@example.com', created_at: new Date() },
          points: 10,
          comment_count: 5,
          created_at: new Date()
        }
      ];

      const mockComments = [
        {
          _id: 'comment1',
          content: 'Test comment',
          post_id: { _id: 'post1', title: 'Test Post' },
          author_id: { _id: 'user123', username: 'testuser', email: 'test@example.com', created_at: new Date() },
          points: 3,
          is_deleted: false,
          created_at: new Date()
        }
      ];

      mockRequest.params = { username: 'testuser' };

      (User.findOne as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      });

      (Post.find as any) = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockPosts)
      });

      (Post.countDocuments as any) = vi.fn().mockResolvedValue(1);

      (Comment.find as any) = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockComments)
      });

      (Comment.countDocuments as any) = vi.fn().mockResolvedValue(1);

      await getUserProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            username: 'testuser',
            email: 'test@example.com'
          }),
          posts: expect.arrayContaining([
            expect.objectContaining({
              title: 'Test Post'
            })
          ]),
          comments: expect.arrayContaining([
            expect.objectContaining({
              content: 'Test comment'
            })
          ]),
          totalPosts: 1,
          totalComments: 1
        })
      );
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockRequest.params = { username: 'nonexistent' };

      (User.findOne as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(null)
      });

      await getUserProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should handle pagination parameters', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date()
      };

      mockRequest.params = { username: 'testuser' };
      mockRequest.query = { page: '2', limit: '10' };

      (User.findOne as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      });

      const mockSkip = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();

      (Post.find as any) = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: mockLimit,
        skip: mockSkip,
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([])
      });

      (Post.countDocuments as any) = vi.fn().mockResolvedValue(0);

      (Comment.find as any) = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([])
      });

      (Comment.countDocuments as any) = vi.fn().mockResolvedValue(0);

      await getUserProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockSkip).toHaveBeenCalledWith(10); // (page 2 - 1) * limit 10
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should exclude deleted comments', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date()
      };

      mockRequest.params = { username: 'testuser' };

      (User.findOne as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser)
      });

      (Post.find as any) = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([])
      });

      (Post.countDocuments as any) = vi.fn().mockResolvedValue(0);

      const mockCommentFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([])
      });

      (Comment.find as any) = mockCommentFind;
      (Comment.countDocuments as any) = vi.fn().mockResolvedValue(0);

      await getUserProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCommentFind).toHaveBeenCalledWith(
        expect.objectContaining({
          author_id: 'user123',
          is_deleted: false
        })
      );
    });
  });
});
