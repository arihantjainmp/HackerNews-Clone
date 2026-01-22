import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import authRoutes from '../auth';
import voteRoutes from '../vote';
import { User } from '../../models/User';
import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';
import { Vote } from '../../models/Vote';
import { RefreshToken } from '../../models/RefreshToken';
import { errorHandler } from '../../middleware/errorHandler';

let mongoServer: MongoMemoryServer;
let app: Application;

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
  app.use('/api', voteRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await Vote.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('Vote Endpoints Integration Tests', () => {
  describe('POST /api/posts/:id/vote', () => {
    let accessToken: string;
    let userId: string;
    let postId: string;

    beforeEach(async () => {
      // Create and authenticate a user
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      accessToken = signupResponse.body.accessToken;
      userId = signupResponse.body.user._id;

      // Create a test post
      const post = await Post.create({
        title: 'Test Post',
        url: 'https://example.com',
        type: 'link',
        author_id: userId,
        points: 0,
        comment_count: 0
      });

      postId = post._id.toString();
    });

    it('should upvote a post successfully', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', 1);
      expect(response.body).toHaveProperty('userVote', 1);

      // Verify vote was recorded in database
      const vote = await Vote.findOne({ user_id: userId, target_id: postId });
      expect(vote).toBeDefined();
      expect(vote?.direction).toBe(1);

      // Verify post points were updated
      const post = await Post.findById(postId);
      expect(post?.points).toBe(1);
    });

    it('should downvote a post successfully', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: -1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', -1);
      expect(response.body).toHaveProperty('userVote', -1);

      // Verify vote was recorded in database
      const vote = await Vote.findOne({ user_id: userId, target_id: postId });
      expect(vote).toBeDefined();
      expect(vote?.direction).toBe(-1);

      // Verify post points were updated
      const post = await Post.findById(postId);
      expect(post?.points).toBe(-1);
    });

    it('should be idempotent when voting same direction twice', async () => {
      // First upvote
      await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      // Second upvote (should toggle off - remove vote)
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', 0);
      expect(response.body).toHaveProperty('userVote', 0);

      // Verify post points are back to 0 (vote removed)
      const post = await Post.findById(postId);
      expect(post?.points).toBe(0);
    });

    it('should change vote from upvote to downvote', async () => {
      // First upvote
      await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      // Change to downvote
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: -1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', -1);
      expect(response.body).toHaveProperty('userVote', -1);

      // Verify post points changed by -2 (from +1 to -1)
      const post = await Post.findById(postId);
      expect(post?.points).toBe(-1);
    });

    it('should change vote from downvote to upvote', async () => {
      // First downvote
      await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: -1 })
        .expect(200);

      // Change to upvote
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', 1);
      expect(response.body).toHaveProperty('userVote', 1);

      // Verify post points changed by +2 (from -1 to +1)
      const post = await Post.findById(postId);
      expect(post?.points).toBe(1);
    });

    it('should reject vote without authentication', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .send({ direction: 1 })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access token required');
    });

    it('should reject vote with invalid token', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ direction: 1 })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject vote with invalid direction', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 2 })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it('should reject vote without direction', async () => {
      const response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent post', async () => {
      const fakePostId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .post(`/api/posts/${fakePostId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Post not found');
    });
  });

  describe('POST /api/comments/:id/vote', () => {
    let accessToken: string;
    let userId: string;
    let postId: string;
    let commentId: string;

    beforeEach(async () => {
      // Create and authenticate a user
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      accessToken = signupResponse.body.accessToken;
      userId = signupResponse.body.user._id;

      // Create a test post
      const post = await Post.create({
        title: 'Test Post',
        url: 'https://example.com',
        type: 'link',
        author_id: userId,
        points: 0,
        comment_count: 0
      });

      postId = post._id.toString();

      // Create a test comment
      const comment = await Comment.create({
        content: 'Test comment',
        post_id: postId,
        parent_id: null,
        author_id: userId,
        points: 0
      });

      commentId = comment._id.toString();
    });

    it('should upvote a comment successfully', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', 1);
      expect(response.body).toHaveProperty('userVote', 1);

      // Verify vote was recorded in database
      const vote = await Vote.findOne({ user_id: userId, target_id: commentId });
      expect(vote).toBeDefined();
      expect(vote?.direction).toBe(1);

      // Verify comment points were updated
      const comment = await Comment.findById(commentId);
      expect(comment?.points).toBe(1);
    });

    it('should downvote a comment successfully', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: -1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', -1);
      expect(response.body).toHaveProperty('userVote', -1);

      // Verify vote was recorded in database
      const vote = await Vote.findOne({ user_id: userId, target_id: commentId });
      expect(vote).toBeDefined();
      expect(vote?.direction).toBe(-1);

      // Verify comment points were updated
      const comment = await Comment.findById(commentId);
      expect(comment?.points).toBe(-1);
    });

    it('should be idempotent when voting same direction twice', async () => {
      // First upvote
      await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      // Second upvote (should toggle off - remove vote)
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', 0);
      expect(response.body).toHaveProperty('userVote', 0);

      // Verify comment points are back to 0 (vote removed)
      const comment = await Comment.findById(commentId);
      expect(comment?.points).toBe(0);
    });

    it('should change vote from upvote to downvote', async () => {
      // First upvote
      await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      // Change to downvote
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: -1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', -1);
      expect(response.body).toHaveProperty('userVote', -1);

      // Verify comment points changed by -2 (from +1 to -1)
      const comment = await Comment.findById(commentId);
      expect(comment?.points).toBe(-1);
    });

    it('should change vote from downvote to upvote', async () => {
      // First downvote
      await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: -1 })
        .expect(200);

      // Change to upvote
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('points', 1);
      expect(response.body).toHaveProperty('userVote', 1);

      // Verify comment points changed by +2 (from -1 to +1)
      const comment = await Comment.findById(commentId);
      expect(comment?.points).toBe(1);
    });

    it('should reject vote without authentication', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .send({ direction: 1 })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access token required');
    });

    it('should reject vote with invalid token', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ direction: 1 })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject vote with invalid direction', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 0 })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it('should reject vote without direction', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .post(`/api/comments/${fakeCommentId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ direction: 1 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Comment not found');
    });
  });

  describe('Multiple Users Voting', () => {
    let user1Token: string;
    let user1Id: string;
    let user2Token: string;
    let user2Id: string;
    let postId: string;

    beforeEach(async () => {
      // Create first user
      const user1Response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'user1',
          email: 'user1@example.com',
          password: 'Password123!'
        });

      user1Token = user1Response.body.accessToken;
      user1Id = user1Response.body.user._id;

      // Create second user
      const user2Response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'Password123!'
        });

      user2Token = user2Response.body.accessToken;
      user2Id = user2Response.body.user._id;

      // Create a test post
      const post = await Post.create({
        title: 'Test Post',
        url: 'https://example.com',
        type: 'link',
        author_id: user1Id,
        points: 0,
        comment_count: 0
      });

      postId = post._id.toString();
    });

    it('should allow multiple users to vote on same post', async () => {
      // User 1 upvotes
      const vote1Response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ direction: 1 })
        .expect(200);

      expect(vote1Response.body.points).toBe(1);

      // User 2 upvotes
      const vote2Response = await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: 1 })
        .expect(200);

      expect(vote2Response.body.points).toBe(2);

      // Verify final post points
      const post = await Post.findById(postId);
      expect(post?.points).toBe(2);

      // Verify both votes exist
      const votes = await Vote.find({ target_id: postId });
      expect(votes).toHaveLength(2);
    });

    it('should track votes independently for each user', async () => {
      // User 1 upvotes
      await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ direction: 1 })
        .expect(200);

      // User 2 downvotes
      await request(app)
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: -1 })
        .expect(200);

      // Verify final post points (1 + (-1) = 0)
      const post = await Post.findById(postId);
      expect(post?.points).toBe(0);

      // Verify both votes exist with correct directions
      const user1Vote = await Vote.findOne({ user_id: user1Id, target_id: postId });
      expect(user1Vote?.direction).toBe(1);

      const user2Vote = await Vote.findOne({ user_id: user2Id, target_id: postId });
      expect(user2Vote?.direction).toBe(-1);
    });
  });
});
