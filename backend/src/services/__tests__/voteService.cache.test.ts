import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { voteOnPost, getUserVote } from '../voteService';
import { cache } from '../../utils/cache';
import { Post } from '../../models/Post';
import { User } from '../../models/User';
import { Vote } from '../../models/Vote';

describe('Vote Service - Caching', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testPost: any;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Cleanup
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear cache before each test
    cache.clear();

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword'
    });

    // Create test post
    testPost = await Post.create({
      title: 'Test Post',
      url: 'https://example.com',
      type: 'link',
      author_id: testUser._id,
      points: 0,
      comment_count: 0
    });
  });

  afterEach(async () => {
    // Clean up test data
    await Vote.deleteMany({});
    await Post.deleteMany({});
    await User.deleteMany({});
    cache.clear();
  });

  describe('getUserVote caching', () => {
    it('should cache user vote states', async () => {
      // Create a vote
      await voteOnPost(testUser._id.toString(), testPost._id.toString(), 1);

      // First call - should hit database
      const vote1 = await getUserVote(testUser._id.toString(), testPost._id.toString());
      expect(vote1).toBe(1);

      // Check cache was populated
      const cacheKey = cache.generateKey('vote', {
        userId: testUser._id.toString(),
        targetId: testPost._id.toString()
      });
      const cachedVote = cache.get(cacheKey);
      expect(cachedVote).toBe(1);

      // Second call - should hit cache
      const vote2 = await getUserVote(testUser._id.toString(), testPost._id.toString());
      expect(vote2).toBe(1);
    });

    it('should cache no-vote state (0)', async () => {
      // Get vote for user who hasn't voted
      const vote = await getUserVote(testUser._id.toString(), testPost._id.toString());
      expect(vote).toBe(0);

      // Check cache was populated with 0
      const cacheKey = cache.generateKey('vote', {
        userId: testUser._id.toString(),
        targetId: testPost._id.toString()
      });
      const cachedVote = cache.get(cacheKey);
      expect(cachedVote).toBe(0);
    });
  });

  describe('voteOnPost cache invalidation', () => {
    it('should invalidate user vote cache when voting', async () => {
      // Get initial vote state (no vote)
      await getUserVote(testUser._id.toString(), testPost._id.toString());

      // Verify cache is populated
      const cacheKey = cache.generateKey('vote', {
        userId: testUser._id.toString(),
        targetId: testPost._id.toString()
      });
      expect(cache.get(cacheKey)).toBe(0);

      // Vote on post - should invalidate cache
      await voteOnPost(testUser._id.toString(), testPost._id.toString(), 1);

      // Verify cache was invalidated
      expect(cache.get(cacheKey)).toBeNull();

      // Get vote again - should fetch fresh data
      const newVote = await getUserVote(testUser._id.toString(), testPost._id.toString());
      expect(newVote).toBe(1);
    });

    it('should invalidate post list caches when voting on post', async () => {
      // Import getPosts to cache post lists
      const { getPosts } = await import('../postService');
      
      // Cache a post list
      await getPosts({ page: 1, limit: 25, sort: 'new' });

      const statsBefore = cache.getStats();
      const postsKeysBefore = statsBefore.keys.filter(key => key.startsWith('posts'));
      expect(postsKeysBefore.length).toBeGreaterThan(0);

      // Vote on post - should invalidate post caches
      await voteOnPost(testUser._id.toString(), testPost._id.toString(), 1);

      // Verify post caches were invalidated
      const statsAfter = cache.getStats();
      const postsKeysAfter = statsAfter.keys.filter(key => key.startsWith('posts'));
      expect(postsKeysAfter).toHaveLength(0);
    });

    it('should invalidate cache when changing vote direction', async () => {
      // Initial upvote
      await voteOnPost(testUser._id.toString(), testPost._id.toString(), 1);
      
      // Cache the vote
      await getUserVote(testUser._id.toString(), testPost._id.toString());

      const cacheKey = cache.generateKey('vote', {
        userId: testUser._id.toString(),
        targetId: testPost._id.toString()
      });
      expect(cache.get(cacheKey)).toBe(1);

      // Change to downvote - should invalidate cache
      await voteOnPost(testUser._id.toString(), testPost._id.toString(), -1);

      // Verify cache was invalidated
      expect(cache.get(cacheKey)).toBeNull();

      // Get vote again - should be -1
      const newVote = await getUserVote(testUser._id.toString(), testPost._id.toString());
      expect(newVote).toBe(-1);
    });
  });
});
