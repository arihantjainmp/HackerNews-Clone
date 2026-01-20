import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { handleVote, voteOnPost, voteOnComment, getUserVote } from '../voteService';
import { Vote } from '../../models/Vote';
import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';
import { User } from '../../models/User';

let mongoServer: MongoMemoryServer;
let testUserId: string;
let testPostId: string;
let testCommentId: string;

beforeAll(async () => {
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
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await Vote.deleteMany({});

  // Create test user
  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashedpassword'
  });
  testUserId = user._id.toString();

  // Create test post
  const post = await Post.create({
    title: 'Test Post',
    url: 'https://example.com',
    type: 'link',
    author_id: testUserId,
    points: 0,
    comment_count: 0
  });
  testPostId = post._id.toString();

  // Create test comment
  const comment = await Comment.create({
    content: 'Test comment',
    post_id: testPostId,
    parent_id: null,
    author_id: testUserId,
    points: 0
  });
  testCommentId = comment._id.toString();
});

describe('handleVote - Post Voting', () => {
  it('should increment points by 1 when upvoting from no vote', async () => {
    const result = await handleVote(testUserId, testPostId, 'post', 1);

    expect(result.points).toBe(1);
    expect(result.userVote).toBe(1);

    const post = await Post.findById(testPostId);
    expect(post?.points).toBe(1);

    const vote = await Vote.findOne({ user_id: testUserId, target_id: testPostId });
    expect(vote?.direction).toBe(1);
  });

  it('should decrement points by 1 when downvoting from no vote', async () => {
    const result = await handleVote(testUserId, testPostId, 'post', -1);

    expect(result.points).toBe(-1);
    expect(result.userVote).toBe(-1);

    const post = await Post.findById(testPostId);
    expect(post?.points).toBe(-1);

    const vote = await Vote.findOne({ user_id: testUserId, target_id: testPostId });
    expect(vote?.direction).toBe(-1);
  });

  it('should not change points when upvoting again (idempotent)', async () => {
    // First upvote
    await handleVote(testUserId, testPostId, 'post', 1);

    // Second upvote (should be idempotent)
    const result = await handleVote(testUserId, testPostId, 'post', 1);

    expect(result.points).toBe(1);
    expect(result.userVote).toBe(1);

    const post = await Post.findById(testPostId);
    expect(post?.points).toBe(1);
  });

  it('should not change points when downvoting again (idempotent)', async () => {
    // First downvote
    await handleVote(testUserId, testPostId, 'post', -1);

    // Second downvote (should be idempotent)
    const result = await handleVote(testUserId, testPostId, 'post', -1);

    expect(result.points).toBe(-1);
    expect(result.userVote).toBe(-1);

    const post = await Post.findById(testPostId);
    expect(post?.points).toBe(-1);
  });

  it('should change points by -2 when switching from upvote to downvote', async () => {
    // First upvote
    await handleVote(testUserId, testPostId, 'post', 1);

    // Switch to downvote
    const result = await handleVote(testUserId, testPostId, 'post', -1);

    expect(result.points).toBe(-1);
    expect(result.userVote).toBe(-1);

    const post = await Post.findById(testPostId);
    expect(post?.points).toBe(-1);

    const vote = await Vote.findOne({ user_id: testUserId, target_id: testPostId });
    expect(vote?.direction).toBe(-1);
  });

  it('should change points by +2 when switching from downvote to upvote', async () => {
    // First downvote
    await handleVote(testUserId, testPostId, 'post', -1);

    // Switch to upvote
    const result = await handleVote(testUserId, testPostId, 'post', 1);

    expect(result.points).toBe(1);
    expect(result.userVote).toBe(1);

    const post = await Post.findById(testPostId);
    expect(post?.points).toBe(1);

    const vote = await Vote.findOne({ user_id: testUserId, target_id: testPostId });
    expect(vote?.direction).toBe(1);
  });

  it('should throw error when voting on non-existent post', async () => {
    const fakePostId = new mongoose.Types.ObjectId().toString();

    await expect(
      handleVote(testUserId, fakePostId, 'post', 1)
    ).rejects.toThrow('post not found');
  });
});

describe('handleVote - Comment Voting', () => {
  it('should increment points by 1 when upvoting comment from no vote', async () => {
    const result = await handleVote(testUserId, testCommentId, 'comment', 1);

    expect(result.points).toBe(1);
    expect(result.userVote).toBe(1);

    const comment = await Comment.findById(testCommentId);
    expect(comment?.points).toBe(1);

    const vote = await Vote.findOne({ user_id: testUserId, target_id: testCommentId });
    expect(vote?.direction).toBe(1);
    expect(vote?.target_type).toBe('comment');
  });

  it('should decrement points by 1 when downvoting comment from no vote', async () => {
    const result = await handleVote(testUserId, testCommentId, 'comment', -1);

    expect(result.points).toBe(-1);
    expect(result.userVote).toBe(-1);

    const comment = await Comment.findById(testCommentId);
    expect(comment?.points).toBe(-1);
  });

  it('should change points by -2 when switching from upvote to downvote on comment', async () => {
    // First upvote
    await handleVote(testUserId, testCommentId, 'comment', 1);

    // Switch to downvote
    const result = await handleVote(testUserId, testCommentId, 'comment', -1);

    expect(result.points).toBe(-1);
    expect(result.userVote).toBe(-1);

    const comment = await Comment.findById(testCommentId);
    expect(comment?.points).toBe(-1);
  });

  it('should change points by +2 when switching from downvote to upvote on comment', async () => {
    // First downvote
    await handleVote(testUserId, testCommentId, 'comment', -1);

    // Switch to upvote
    const result = await handleVote(testUserId, testCommentId, 'comment', 1);

    expect(result.points).toBe(1);
    expect(result.userVote).toBe(1);

    const comment = await Comment.findById(testCommentId);
    expect(comment?.points).toBe(1);
  });
});

describe('voteOnPost', () => {
  it('should vote on post using convenience function', async () => {
    const result = await voteOnPost(testUserId, testPostId, 1);

    expect(result.points).toBe(1);
    expect(result.userVote).toBe(1);
  });
});

describe('voteOnComment', () => {
  it('should vote on comment using convenience function', async () => {
    const result = await voteOnComment(testUserId, testCommentId, -1);

    expect(result.points).toBe(-1);
    expect(result.userVote).toBe(-1);
  });
});

describe('getUserVote', () => {
  it('should return 0 when user has not voted', async () => {
    const vote = await getUserVote(testUserId, testPostId);
    expect(vote).toBe(0);
  });

  it('should return 1 when user has upvoted', async () => {
    await handleVote(testUserId, testPostId, 'post', 1);
    const vote = await getUserVote(testUserId, testPostId);
    expect(vote).toBe(1);
  });

  it('should return -1 when user has downvoted', async () => {
    await handleVote(testUserId, testPostId, 'post', -1);
    const vote = await getUserVote(testUserId, testPostId);
    expect(vote).toBe(-1);
  });
});

describe('Concurrent Voting', () => {
  it('should handle concurrent votes correctly using atomic operations', async () => {
    // Create multiple users
    const user1 = await User.create({
      username: 'user1',
      email: 'user1@example.com',
      password_hash: 'hash1'
    });
    const user2 = await User.create({
      username: 'user2',
      email: 'user2@example.com',
      password_hash: 'hash2'
    });
    const user3 = await User.create({
      username: 'user3',
      email: 'user3@example.com',
      password_hash: 'hash3'
    });

    // Simulate concurrent voting
    await Promise.all([
      handleVote(user1._id.toString(), testPostId, 'post', 1),
      handleVote(user2._id.toString(), testPostId, 'post', 1),
      handleVote(user3._id.toString(), testPostId, 'post', -1)
    ]);

    // Verify final points: +1 +1 -1 = 1
    const post = await Post.findById(testPostId);
    expect(post?.points).toBe(1);

    // Verify all votes were recorded
    const votes = await Vote.find({ target_id: testPostId });
    expect(votes).toHaveLength(3);
  });
});
