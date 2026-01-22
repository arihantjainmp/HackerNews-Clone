import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getPosts, createPost } from '../postService';
import { cache } from '../../utils/cache';
import { Post } from '../../models/Post';
import { User } from '../../models/User';

describe('Post Service - Caching', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;

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
  });

  afterEach(async () => {
    // Clean up test data
    await Post.deleteMany({});
    await User.deleteMany({});
    cache.clear();
  });

  describe('getPosts caching', () => {
    it('should cache post list responses', async () => {
      // Create test posts
      await Post.create({
        title: 'Test Post 1',
        url: 'https://example.com/1',
        type: 'link',
        author_id: testUser._id,
        points: 10,
        comment_count: 0
      });

      // First call - should hit database
      const result1 = await getPosts({ page: 1, limit: 25, sort: 'new' });
      expect(result1.posts).toHaveLength(1);

      // Check cache was populated
      const cacheKey = cache.generateKey('posts', { page: 1, limit: 25, sort: 'new', search: '', userId: 'anonymous' });
      const cachedResult = cache.get(cacheKey);
      expect(cachedResult).not.toBeNull();
      expect(cachedResult).toEqual(result1);

      // Second call - should hit cache (verify by checking same object reference)
      const result2 = await getPosts({ page: 1, limit: 25, sort: 'new' });
      expect(result2).toEqual(result1);
    });

    it('should use different cache keys for different query parameters', async () => {
      await Post.create({
        title: 'Test Post',
        url: 'https://example.com',
        type: 'link',
        author_id: testUser._id,
        points: 10,
        comment_count: 0
      });

      // Different page
      await getPosts({ page: 1, limit: 25, sort: 'new' });
      await getPosts({ page: 2, limit: 25, sort: 'new' });

      // Different sort
      await getPosts({ page: 1, limit: 25, sort: 'top' });

      // Check cache has different keys
      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThanOrEqual(3);
    });

    it('should cache search results separately', async () => {
      await Post.create({
        title: 'JavaScript Tutorial',
        url: 'https://example.com',
        type: 'link',
        author_id: testUser._id,
        points: 10,
        comment_count: 0
      });

      // Query without search
      await getPosts({ page: 1, limit: 25, sort: 'new' });

      // Query with search
      await getPosts({ page: 1, limit: 25, sort: 'new', search: 'JavaScript' });

      // Should have different cache entries
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('createPost cache invalidation', () => {
    it('should invalidate post list caches when new post is created', async () => {
      // Create initial post and cache the list
      await Post.create({
        title: 'Initial Post',
        url: 'https://example.com/initial',
        type: 'link',
        author_id: testUser._id,
        points: 0,
        comment_count: 0
      });

      await getPosts({ page: 1, limit: 25, sort: 'new' });
      
      // Verify cache is populated
      let stats = cache.getStats();
      expect(stats.size).toBeGreaterThan(0);

      // Create new post - should invalidate cache
      await createPost({
        title: 'New Post',
        url: 'https://example.com/new',
        authorId: testUser._id.toString()
      });

      // Verify cache was invalidated
      stats = cache.getStats();
      const postsCacheKeys = stats.keys.filter(key => key.startsWith('posts'));
      expect(postsCacheKeys).toHaveLength(0);
    });

    it('should invalidate all post list variations', async () => {
      // Cache multiple variations
      await getPosts({ page: 1, limit: 25, sort: 'new' });
      await getPosts({ page: 1, limit: 25, sort: 'top' });
      await getPosts({ page: 2, limit: 25, sort: 'new' });

      const statsBefore = cache.getStats();
      expect(statsBefore.size).toBeGreaterThanOrEqual(3);

      // Create new post
      await createPost({
        title: 'New Post',
        text: 'This is a text post',
        authorId: testUser._id.toString()
      });

      // All post caches should be invalidated
      const statsAfter = cache.getStats();
      const postsCacheKeys = statsAfter.keys.filter(key => key.startsWith('posts'));
      expect(postsCacheKeys).toHaveLength(0);
    });
  });
});
