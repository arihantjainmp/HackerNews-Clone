import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import authRoutes from '../auth';
import commentRoutes from '../comment';
import { User } from '../../models/User';
import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';
import { RefreshToken } from '../../models/RefreshToken';

/**
 * Comment Endpoints Integration Tests
 * Tests the complete request-response cycle for comment operations
 * 
 * Requirements: 6.8, 6.9, 7.7, 7.8
 */

let mongoServer: MongoMemoryServer;
let app: Application;

describe('Comment Endpoints Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let postId: string;
  let commentId: string;
  let anotherUserId: string;
  let anotherAuthToken: string;

  beforeAll(async () => {
    // Set up environment variables for JWT
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';

    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Set up Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api', commentRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await RefreshToken.deleteMany({});

    // Create and authenticate first user
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test1234!'
      });
    authToken = signupResponse.body.accessToken;
    userId = signupResponse.body.user._id;

    // Create and authenticate second user
    const anotherSignupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'Test1234!'
      });
    anotherAuthToken = anotherSignupResponse.body.accessToken;
    anotherUserId = anotherSignupResponse.body.user._id;

    // Create a test post
    const post = await Post.create({
      title: 'Test Post',
      url: 'https://example.com',
      type: 'link',
      author_id: new mongoose.Types.ObjectId(userId),
      points: 0,
      comment_count: 0
    });
    postId = post._id.toString();
  });

  describe('POST /api/posts/:postId/comments', () => {
    it('should create a top-level comment successfully', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test comment'
        })
        .expect(201);

      expect(response.body).toHaveProperty('comment');
      expect(response.body.comment.content).toBe('This is a test comment');
      expect(response.body.comment.post_id).toBe(postId);
      expect(response.body.comment.parent_id).toBeNull();
      expect(response.body.comment.author_id).toBe(userId);
      expect(response.body.comment.points).toBe(0);
      expect(response.body.comment.is_deleted).toBe(false);

      // Verify post comment_count was incremented
      const updatedPost = await Post.findById(postId);
      expect(updatedPost?.comment_count).toBe(1);
    });

    it('should reject comment creation without authentication', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .send({
          content: 'This is a test comment'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject comment with empty content', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '   '
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject comment exceeding max length', async () => {
      const longContent = 'a'.repeat(10001);
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: longContent
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent post', async () => {
      const fakePostId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/posts/${fakePostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test comment'
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/comments/:commentId/replies', () => {
    beforeEach(async () => {
      // Create a parent comment for reply tests
      const comment = await Comment.create({
        content: 'Parent comment',
        post_id: new mongoose.Types.ObjectId(postId),
        parent_id: null,
        author_id: new mongoose.Types.ObjectId(userId),
        points: 0,
        is_deleted: false
      });
      commentId = comment._id.toString();

      // Increment post comment count
      await Post.findByIdAndUpdate(postId, { $inc: { comment_count: 1 } });
    });

    it('should create a reply successfully', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/replies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a reply'
        })
        .expect(201);

      expect(response.body).toHaveProperty('comment');
      expect(response.body.comment.content).toBe('This is a reply');
      expect(response.body.comment.post_id).toBe(postId);
      expect(response.body.comment.parent_id).toBe(commentId);
      expect(response.body.comment.author_id).toBe(userId);

      // Verify post comment_count was incremented
      const updatedPost = await Post.findById(postId);
      expect(updatedPost?.comment_count).toBe(2);
    });

    it('should reject reply without authentication', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/replies`)
        .send({
          content: 'This is a reply'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent parent comment', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/comments/${fakeCommentId}/replies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a reply'
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/comments/:id', () => {
    beforeEach(async () => {
      // Create a comment for edit tests
      const comment = await Comment.create({
        content: 'Original content',
        post_id: new mongoose.Types.ObjectId(postId),
        parent_id: null,
        author_id: new mongoose.Types.ObjectId(userId),
        points: 0,
        is_deleted: false
      });
      commentId = comment._id.toString();
    });

    it('should edit own comment successfully', async () => {
      const response = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content'
        })
        .expect(200);

      expect(response.body).toHaveProperty('comment');
      expect(response.body.comment.content).toBe('Updated content');
      expect(response.body.comment.edited_at).toBeDefined();
    });

    it('should reject editing without authentication', async () => {
      const response = await request(app)
        .put(`/api/comments/${commentId}`)
        .send({
          content: 'Updated content'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject editing another user\'s comment', async () => {
      const response = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .send({
          content: 'Updated content'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('only edit your own');
    });

    it('should reject edit with empty content', async () => {
      const response = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '   '
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/comments/${fakeCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content'
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/comments/:id', () => {
    beforeEach(async () => {
      // Create a comment for delete tests
      const comment = await Comment.create({
        content: 'Comment to delete',
        post_id: new mongoose.Types.ObjectId(postId),
        parent_id: null,
        author_id: new mongoose.Types.ObjectId(userId),
        points: 0,
        is_deleted: false
      });
      commentId = comment._id.toString();

      // Increment post comment count
      await Post.findByIdAndUpdate(postId, { $inc: { comment_count: 1 } });
    });

    it('should hard delete comment without replies', async () => {
      const response = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify comment was deleted
      const deletedComment = await Comment.findById(commentId);
      expect(deletedComment).toBeNull();

      // Verify post comment_count was decremented
      const updatedPost = await Post.findById(postId);
      expect(updatedPost?.comment_count).toBe(0);
    });

    it('should soft delete comment with replies', async () => {
      // Create a reply to the comment
      await Comment.create({
        content: 'Reply to comment',
        post_id: new mongoose.Types.ObjectId(postId),
        parent_id: new mongoose.Types.ObjectId(commentId),
        author_id: new mongoose.Types.ObjectId(userId),
        points: 0,
        is_deleted: false
      });

      const response = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify comment was soft deleted
      const softDeletedComment = await Comment.findById(commentId);
      expect(softDeletedComment).not.toBeNull();
      expect(softDeletedComment?.is_deleted).toBe(true);
      expect(softDeletedComment?.content).toBe('[deleted]');

      // Verify post comment_count was NOT decremented (soft delete)
      const updatedPost = await Post.findById(postId);
      expect(updatedPost?.comment_count).toBe(1);
    });

    it('should reject deleting without authentication', async () => {
      const response = await request(app)
        .delete(`/api/comments/${commentId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject deleting another user\'s comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('only delete your own');
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/comments/${fakeCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
