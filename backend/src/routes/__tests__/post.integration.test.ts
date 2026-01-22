import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../auth';
import postRoutes from '../post';
import { User } from '../../models/User';
import { Post } from '../../models/Post';
import { RefreshToken } from '../../models/RefreshToken';
import { errorHandler } from '../../middleware/errorHandler';
import { cache } from '../../utils/cache';

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
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
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
  await RefreshToken.deleteMany({});
  
  // Clear cache before each test
  cache.clear();
});

describe('Post Endpoints Integration Tests', () => {
  describe('GET /api/posts', () => {
    it('should return empty list when no posts exist', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(response.body.posts).toEqual([]);
      expect(response.body).toHaveProperty('total', 0);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('totalPages', 0);
    });

    it('should return paginated posts with default parameters', async () => {
      // Create test user
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      // Create test posts
      await Post.create([
        {
          title: 'Post 1',
          url: 'https://example.com/1',
          type: 'link',
          author_id: user._id,
          points: 10,
          comment_count: 5
        },
        {
          title: 'Post 2',
          text: 'This is a text post',
          type: 'text',
          author_id: user._id,
          points: 20,
          comment_count: 3
        }
      ]);

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.posts).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(1);
    });

    it('should support pagination with page and limit parameters', async () => {
      // Create test user
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      // Create 5 test posts
      for (let i = 1; i <= 5; i++) {
        await Post.create({
          title: `Post ${i}`,
          url: `https://example.com/${i}`,
          type: 'link',
          author_id: user._id,
          points: i,
          comment_count: 0
        });
      }

      // Get first page with limit 2
      const response1 = await request(app)
        .get('/api/posts?page=1&limit=2')
        .expect(200);

      expect(response1.body.posts).toHaveLength(2);
      expect(response1.body.total).toBe(5);
      expect(response1.body.page).toBe(1);
      expect(response1.body.totalPages).toBe(3);

      // Get second page
      const response2 = await request(app)
        .get('/api/posts?page=2&limit=2')
        .expect(200);

      expect(response2.body.posts).toHaveLength(2);
      expect(response2.body.page).toBe(2);
    });

    it('should sort posts by "new" (default)', async () => {
      // Create test user
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      // Create posts with different timestamps
      const post1 = await Post.create({
        title: 'Oldest Post',
        url: 'https://example.com/1',
        type: 'link',
        author_id: user._id,
        points: 10,
        comment_count: 0,
        created_at: new Date('2024-01-01')
      });

      const post2 = await Post.create({
        title: 'Newest Post',
        url: 'https://example.com/2',
        type: 'link',
        author_id: user._id,
        points: 5,
        comment_count: 0,
        created_at: new Date('2024-01-03')
      });

      const post3 = await Post.create({
        title: 'Middle Post',
        url: 'https://example.com/3',
        type: 'link',
        author_id: user._id,
        points: 15,
        comment_count: 0,
        created_at: new Date('2024-01-02')
      });

      const response = await request(app)
        .get('/api/posts?sort=new')
        .expect(200);

      expect(response.body.posts).toHaveLength(3);
      expect(response.body.posts[0].title).toBe('Newest Post');
      expect(response.body.posts[1].title).toBe('Middle Post');
      expect(response.body.posts[2].title).toBe('Oldest Post');
    });

    it('should sort posts by "top" (highest points first)', async () => {
      // Create test user
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      // Create posts with different points
      await Post.create([
        {
          title: 'Low Points',
          url: 'https://example.com/1',
          type: 'link',
          author_id: user._id,
          points: 5,
          comment_count: 0
        },
        {
          title: 'High Points',
          url: 'https://example.com/2',
          type: 'link',
          author_id: user._id,
          points: 50,
          comment_count: 0
        },
        {
          title: 'Medium Points',
          url: 'https://example.com/3',
          type: 'link',
          author_id: user._id,
          points: 20,
          comment_count: 0
        }
      ]);

      const response = await request(app)
        .get('/api/posts?sort=top')
        .expect(200);

      expect(response.body.posts).toHaveLength(3);
      expect(response.body.posts[0].title).toBe('High Points');
      expect(response.body.posts[1].title).toBe('Medium Points');
      expect(response.body.posts[2].title).toBe('Low Points');
    });

    it('should sort posts by "best" (HN algorithm)', async () => {
      // Create test user
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      // Create posts with different points and ages
      // Newer post with fewer points should rank higher than older post with more points
      await Post.create([
        {
          title: 'Old High Points',
          url: 'https://example.com/1',
          type: 'link',
          author_id: user._id,
          points: 100,
          comment_count: 0,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day old
        },
        {
          title: 'New Medium Points',
          url: 'https://example.com/2',
          type: 'link',
          author_id: user._id,
          points: 50,
          comment_count: 0,
          created_at: new Date() // Just created
        }
      ]);

      const response = await request(app)
        .get('/api/posts?sort=best')
        .expect(200);

      expect(response.body.posts).toHaveLength(2);
      // Newer post should rank higher due to best algorithm
      expect(response.body.posts[0].title).toBe('New Medium Points');
    });

    it('should search posts by title (case-insensitive)', async () => {
      // Create test user
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      // Create posts with different titles
      await Post.create([
        {
          title: 'JavaScript Tutorial',
          url: 'https://example.com/1',
          type: 'link',
          author_id: user._id,
          points: 10,
          comment_count: 0
        },
        {
          title: 'Python Guide',
          url: 'https://example.com/2',
          type: 'link',
          author_id: user._id,
          points: 20,
          comment_count: 0
        },
        {
          title: 'Advanced JavaScript',
          url: 'https://example.com/3',
          type: 'link',
          author_id: user._id,
          points: 15,
          comment_count: 0
        }
      ]);

      const response = await request(app)
        .get('/api/posts?q=javascript')
        .expect(200);

      expect(response.body.posts).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.posts[0].title).toContain('JavaScript');
      expect(response.body.posts[1].title).toContain('JavaScript');
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/posts?page=0')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/posts', () => {
    let sessionCookie: string;
    let userId: string;

    beforeEach(async () => {
      // Create and authenticate a user
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      const cookies = signupResponse.headers['set-cookie'];
      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='));
      if (!accessTokenCookie) throw new Error('Access token cookie not found');
      
      sessionCookie = accessTokenCookie;
      userId = signupResponse.body.user._id;
    });

    it('should create a link post successfully', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Test Link Post',
          url: 'https://example.com'
        })
        .expect(201);

      expect(response.body).toHaveProperty('post');
      expect(response.body.post).toHaveProperty('_id');
      expect(response.body.post.title).toBe('Test Link Post');
      expect(response.body.post.url).toBe('https://example.com');
      expect(response.body.post.type).toBe('link');
      expect(response.body.post.points).toBe(0);
      expect(response.body.post.comment_count).toBe(0);
      expect(response.body.post.author_id).toBe(userId);

      // Verify post was created in database
      const post = await Post.findById(response.body.post._id);
      expect(post).toBeDefined();
      expect(post?.title).toBe('Test Link Post');
    });

    it('should create a text post successfully', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Test Text Post',
          text: 'This is the content of my text post'
        })
        .expect(201);

      expect(response.body).toHaveProperty('post');
      expect(response.body.post.title).toBe('Test Text Post');
      expect(response.body.post.text).toBe('This is the content of my text post');
      expect(response.body.post.type).toBe('text');
      expect(response.body.post).not.toHaveProperty('url');
    });

    it('should reject post creation without authentication', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({
          title: 'Test Post',
          url: 'https://example.com'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject post with both url and text', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Test Post',
          url: 'https://example.com',
          text: 'This should not be allowed'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject post with neither url nor text', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Test Post'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject post with empty title', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: '',
          url: 'https://example.com'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject post with title exceeding 300 characters', async () => {
      const longTitle = 'a'.repeat(301);
      
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: longTitle,
          url: 'https://example.com'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject post with invalid URL format', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Test Post',
          url: 'not-a-valid-url'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should trim whitespace from title', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: '  Test Post  ',
          url: 'https://example.com'
        })
        .expect(201);

      expect(response.body.post.title).toBe('Test Post');
    });

    it('should sanitize HTML from post title to prevent XSS', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: '<script>alert("XSS")</script>Test Post',
          url: 'https://example.com'
        })
        .expect(201);

      // HTML tags should be stripped
      expect(response.body.post.title).toBe('Test Post');
      expect(response.body.post.title).not.toContain('<script>');
      expect(response.body.post.title).not.toContain('</script>');
    });

    it('should sanitize HTML from post text content to prevent XSS', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Test Post',
          text: '<img src=x onerror="alert(1)">Safe content'
        })
        .expect(201);

      // HTML tags should be stripped
      expect(response.body.post.text).toBe('Safe content');
      expect(response.body.post.text).not.toContain('<img');
      expect(response.body.post.text).not.toContain('onerror');
    });

    it('should reject dangerous URLs with javascript: protocol', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Test Post',
          url: 'javascript:alert(1)'
        })
        .expect(400);

      // Joi validation catches dangerous protocols
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain('not allowed for security');
    });

    it('should reject dangerous URLs with data: protocol', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Cookie', [sessionCookie])
        .send({
          title: 'Test Post',
          url: 'data:text/html,<script>alert(1)</script>'
        })
        .expect(400);

      // Joi validation catches dangerous protocols
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain('not allowed for security');
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should return a post by ID', async () => {
      // Create test user
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      // Create test post
      const post = await Post.create({
        title: 'Test Post',
        url: 'https://example.com',
        type: 'link',
        author_id: user._id,
        points: 10,
        comment_count: 5
      });

      const response = await request(app)
        .get(`/api/posts/${post._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('post');
      expect(response.body.post._id).toBe(post._id.toString());
      expect(response.body.post.title).toBe('Test Post');
      expect(response.body.post.url).toBe('https://example.com');
      expect(response.body.post.points).toBe(10);
      expect(response.body.post.comment_count).toBe(5);
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/posts/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for invalid post ID format', async () => {
      const response = await request(app)
        .get('/api/posts/invalid-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});