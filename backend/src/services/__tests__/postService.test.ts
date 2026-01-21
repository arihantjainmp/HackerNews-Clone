import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { 
  createPost, 
  getPosts,
  getPostById,
  ValidationError,
  NotFoundError,
  calculateBestScore, 
  sortByNew, 
  sortByTop, 
  sortByBest 
} from '../postService';
import { Post, IPost } from '../../models/Post';
import { User } from '../../models/User';
import { cache } from '../../utils/cache';

let mongoServer: MongoMemoryServer;
let testUserId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Create a test user for post creation
  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashed_password'
  });
  testUserId = user._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear posts before each test
  await Post.deleteMany({});
  // Clear cache before each test
  cache.clear();
});

describe('createPost', () => {
  it('should create a link post with valid URL', async () => {
    const result = await createPost({
      title: 'Test Link Post',
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result).toMatchObject({
      title: 'Test Link Post',
      url: 'https://example.com',
      type: 'link',
      author_id: testUserId,
      points: 0,
      comment_count: 0
    });
    expect(result._id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.text).toBeUndefined();
  });

  it('should create a text post with valid text content', async () => {
    const result = await createPost({
      title: 'Test Text Post',
      text: 'This is the text content of the post.',
      authorId: testUserId
    });

    expect(result).toMatchObject({
      title: 'Test Text Post',
      text: 'This is the text content of the post.',
      type: 'text',
      author_id: testUserId,
      points: 0,
      comment_count: 0
    });
    expect(result._id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.url).toBeUndefined();
  });

  it('should initialize points to 0', async () => {
    const result = await createPost({
      title: 'Test Post',
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result.points).toBe(0);
  });

  it('should initialize comment_count to 0', async () => {
    const result = await createPost({
      title: 'Test Post',
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result.comment_count).toBe(0);
  });

  it('should record author_id', async () => {
    const result = await createPost({
      title: 'Test Post',
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result.author_id).toBe(testUserId);
  });

  it('should record created_at timestamp', async () => {
    const beforeCreate = new Date();
    const result = await createPost({
      title: 'Test Post',
      url: 'https://example.com',
      authorId: testUserId
    });
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  it('should reject post with both url and text', async () => {
    await expect(
      createPost({
        title: 'Test Post',
        url: 'https://example.com',
        text: 'Some text content',
        authorId: testUserId
      })
    ).rejects.toThrow(ValidationError);

    await expect(
      createPost({
        title: 'Test Post',
        url: 'https://example.com',
        text: 'Some text content',
        authorId: testUserId
      })
    ).rejects.toThrow('Post must have either url or text, but not both');
  });

  it('should reject post with neither url nor text', async () => {
    await expect(
      createPost({
        title: 'Test Post',
        authorId: testUserId
      })
    ).rejects.toThrow(ValidationError);

    await expect(
      createPost({
        title: 'Test Post',
        authorId: testUserId
      })
    ).rejects.toThrow('Post must have either url or text');
  });

  it('should reject post with empty title', async () => {
    await expect(
      createPost({
        title: '',
        url: 'https://example.com',
        authorId: testUserId
      })
    ).rejects.toThrow(ValidationError);

    await expect(
      createPost({
        title: '',
        url: 'https://example.com',
        authorId: testUserId
      })
    ).rejects.toThrow('Title cannot be empty or contain only whitespace');
  });

  it('should reject post with whitespace-only title', async () => {
    await expect(
      createPost({
        title: '   ',
        url: 'https://example.com',
        authorId: testUserId
      })
    ).rejects.toThrow(ValidationError);

    await expect(
      createPost({
        title: '   ',
        url: 'https://example.com',
        authorId: testUserId
      })
    ).rejects.toThrow('Title cannot be empty or contain only whitespace');
  });

  it('should reject post with title exceeding 300 characters', async () => {
    const longTitle = 'a'.repeat(301);

    await expect(
      createPost({
        title: longTitle,
        url: 'https://example.com',
        authorId: testUserId
      })
    ).rejects.toThrow(ValidationError);

    await expect(
      createPost({
        title: longTitle,
        url: 'https://example.com',
        authorId: testUserId
      })
    ).rejects.toThrow('Title must be between 1 and 300 characters');
  });

  it('should accept post with title at 300 character limit', async () => {
    const maxTitle = 'a'.repeat(300);

    const result = await createPost({
      title: maxTitle,
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result.title).toBe(maxTitle);
    expect(result.title.length).toBe(300);
  });

  it('should accept post with title at 1 character minimum', async () => {
    const result = await createPost({
      title: 'a',
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result.title).toBe('a');
    expect(result.title.length).toBe(1);
  });

  it('should trim whitespace from title', async () => {
    const result = await createPost({
      title: '  Test Post  ',
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result.title).toBe('Test Post');
  });

  it('should trim whitespace from url', async () => {
    const result = await createPost({
      title: 'Test Post',
      url: '  https://example.com  ',
      authorId: testUserId
    });

    expect(result.url).toBe('https://example.com');
  });

  it('should trim whitespace from text', async () => {
    const result = await createPost({
      title: 'Test Post',
      text: '  Some text content  ',
      authorId: testUserId
    });

    expect(result.text).toBe('Some text content');
  });

  it('should reject post with invalid URL format', async () => {
    await expect(
      createPost({
        title: 'Test Post',
        url: 'not-a-valid-url',
        authorId: testUserId
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should accept post with http URL', async () => {
    const result = await createPost({
      title: 'Test Post',
      url: 'http://example.com',
      authorId: testUserId
    });

    expect(result.url).toBe('http://example.com');
    expect(result.type).toBe('link');
  });

  it('should accept post with https URL', async () => {
    const result = await createPost({
      title: 'Test Post',
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result.url).toBe('https://example.com');
    expect(result.type).toBe('link');
  });

  it('should set type to "link" for URL posts', async () => {
    const result = await createPost({
      title: 'Test Post',
      url: 'https://example.com',
      authorId: testUserId
    });

    expect(result.type).toBe('link');
  });

  it('should set type to "text" for text posts', async () => {
    const result = await createPost({
      title: 'Test Post',
      text: 'Some text content',
      authorId: testUserId
    });

    expect(result.type).toBe('text');
  });

  it('should persist post to database', async () => {
    const result = await createPost({
      title: 'Test Post',
      url: 'https://example.com',
      authorId: testUserId
    });

    const savedPost = await Post.findById(result._id);
    expect(savedPost).toBeDefined();
    expect(savedPost!.title).toBe('Test Post');
    expect(savedPost!.url).toBe('https://example.com');
  });

  it('should allow multiple posts from same author', async () => {
    const post1 = await createPost({
      title: 'First Post',
      url: 'https://example.com/1',
      authorId: testUserId
    });

    const post2 = await createPost({
      title: 'Second Post',
      url: 'https://example.com/2',
      authorId: testUserId
    });

    expect(post1._id).not.toBe(post2._id);
    expect(post1.author_id).toBe(testUserId);
    expect(post2.author_id).toBe(testUserId);
  });
});

describe('calculateBestScore', () => {
  it('should calculate score using formula: points / ((hours + 2) ^ 1.8)', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const post = {
      points: 10,
      created_at: oneHourAgo
    } as IPost;

    const score = calculateBestScore(post);
    const expectedScore = 10 / Math.pow(1 + 2, 1.8);
    
    expect(score).toBeCloseTo(expectedScore, 5);
  });

  it('should return higher score for newer posts with same points', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    const newerPost = { points: 10, created_at: oneHourAgo } as IPost;
    const olderPost = { points: 10, created_at: twoHoursAgo } as IPost;

    const newerScore = calculateBestScore(newerPost);
    const olderScore = calculateBestScore(olderPost);
    
    expect(newerScore).toBeGreaterThan(olderScore);
  });

  it('should return higher score for posts with more points', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const highPointsPost = { points: 20, created_at: oneHourAgo } as IPost;
    const lowPointsPost = { points: 10, created_at: oneHourAgo } as IPost;

    const highScore = calculateBestScore(highPointsPost);
    const lowScore = calculateBestScore(lowPointsPost);
    
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('should handle posts with 0 points', () => {
    const now = new Date();
    const post = { points: 0, created_at: now } as IPost;

    const score = calculateBestScore(post);
    
    expect(score).toBe(0);
  });

  it('should handle very new posts (just created)', () => {
    const now = new Date();
    const post = { points: 10, created_at: now } as IPost;

    const score = calculateBestScore(post);
    const expectedScore = 10 / Math.pow(2, 1.8); // hours = 0, so (0 + 2) ^ 1.8
    
    expect(score).toBeCloseTo(expectedScore, 5);
  });
});

describe('sortByNew', () => {
  it('should sort posts by created_at in descending order', async () => {
    const now = new Date();
    const post1 = await Post.create({
      title: 'Oldest Post',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000) // 3 hours ago
    });
    const post2 = await Post.create({
      title: 'Middle Post',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
    });
    const post3 = await Post.create({
      title: 'Newest Post',
      url: 'https://example.com/3',
      author_id: new mongoose.Types.ObjectId(testUserId),
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
    });

    const posts = [post1, post2, post3];
    const sorted = sortByNew(posts);

    expect(sorted[0]._id.toString()).toBe(post3._id.toString());
    expect(sorted[1]._id.toString()).toBe(post2._id.toString());
    expect(sorted[2]._id.toString()).toBe(post1._id.toString());
  });

  it('should not mutate the original array', async () => {
    const post1 = await Post.create({
      title: 'Post 1',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      created_at: new Date('2024-01-01')
    });
    const post2 = await Post.create({
      title: 'Post 2',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      created_at: new Date('2024-01-02')
    });

    const posts = [post1, post2];
    const originalFirstId = posts[0]._id.toString();
    
    sortByNew(posts);

    expect(posts[0]._id.toString()).toBe(originalFirstId);
  });

  it('should handle empty array', () => {
    const sorted = sortByNew([]);
    expect(sorted).toEqual([]);
  });

  it('should handle single post', async () => {
    const post = await Post.create({
      title: 'Single Post',
      url: 'https://example.com',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const sorted = sortByNew([post]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]._id.toString()).toBe(post._id.toString());
  });
});

describe('sortByTop', () => {
  it('should sort posts by points in descending order', async () => {
    const post1 = await Post.create({
      title: 'Low Points',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 5
    });
    const post2 = await Post.create({
      title: 'High Points',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 50
    });
    const post3 = await Post.create({
      title: 'Medium Points',
      url: 'https://example.com/3',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 25
    });

    const posts = [post1, post2, post3];
    const sorted = sortByTop(posts);

    expect(sorted[0]._id.toString()).toBe(post2._id.toString());
    expect(sorted[0].points).toBe(50);
    expect(sorted[1]._id.toString()).toBe(post3._id.toString());
    expect(sorted[1].points).toBe(25);
    expect(sorted[2]._id.toString()).toBe(post1._id.toString());
    expect(sorted[2].points).toBe(5);
  });

  it('should not mutate the original array', async () => {
    const post1 = await Post.create({
      title: 'Post 1',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10
    });
    const post2 = await Post.create({
      title: 'Post 2',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 20
    });

    const posts = [post1, post2];
    const originalFirstId = posts[0]._id.toString();
    
    sortByTop(posts);

    expect(posts[0]._id.toString()).toBe(originalFirstId);
  });

  it('should handle posts with same points', async () => {
    const post1 = await Post.create({
      title: 'Post 1',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10
    });
    const post2 = await Post.create({
      title: 'Post 2',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10
    });

    const posts = [post1, post2];
    const sorted = sortByTop(posts);

    expect(sorted).toHaveLength(2);
    expect(sorted[0].points).toBe(10);
    expect(sorted[1].points).toBe(10);
  });

  it('should handle empty array', () => {
    const sorted = sortByTop([]);
    expect(sorted).toEqual([]);
  });

  it('should handle negative points', async () => {
    const post1 = await Post.create({
      title: 'Negative Points',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: -5
    });
    const post2 = await Post.create({
      title: 'Positive Points',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10
    });

    const posts = [post1, post2];
    const sorted = sortByTop(posts);

    expect(sorted[0]._id.toString()).toBe(post2._id.toString());
    expect(sorted[1]._id.toString()).toBe(post1._id.toString());
  });
});

describe('sortByBest', () => {
  it('should sort posts by best score in descending order', async () => {
    const now = new Date();
    
    // Newer post with fewer points
    const post1 = await Post.create({
      title: 'Newer Post',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10,
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
    });
    
    // Older post with more points
    const post2 = await Post.create({
      title: 'Older Post',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 50,
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
    });

    const posts = [post1, post2];
    const sorted = sortByBest(posts);

    // Calculate expected scores
    const score1 = calculateBestScore(post1);
    const score2 = calculateBestScore(post2);

    // Verify sorting is correct
    expect(sorted[0]._id.toString()).toBe(
      score1 > score2 ? post1._id.toString() : post2._id.toString()
    );
  });

  it('should not mutate the original array', async () => {
    const post1 = await Post.create({
      title: 'Post 1',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10,
      created_at: new Date()
    });
    const post2 = await Post.create({
      title: 'Post 2',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 20,
      created_at: new Date()
    });

    const posts = [post1, post2];
    const originalFirstId = posts[0]._id.toString();
    
    sortByBest(posts);

    expect(posts[0]._id.toString()).toBe(originalFirstId);
  });

  it('should rank newer posts with equal points higher', async () => {
    const now = new Date();
    
    const newerPost = await Post.create({
      title: 'Newer Post',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10,
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
    });
    
    const olderPost = await Post.create({
      title: 'Older Post',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10,
      created_at: new Date(now.getTime() - 10 * 60 * 60 * 1000) // 10 hours ago
    });

    const posts = [olderPost, newerPost];
    const sorted = sortByBest(posts);

    expect(sorted[0]._id.toString()).toBe(newerPost._id.toString());
    expect(sorted[1]._id.toString()).toBe(olderPost._id.toString());
  });

  it('should handle empty array', () => {
    const sorted = sortByBest([]);
    expect(sorted).toEqual([]);
  });

  it('should handle posts with 0 points', async () => {
    const post1 = await Post.create({
      title: 'Zero Points',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 0,
      created_at: new Date()
    });
    const post2 = await Post.create({
      title: 'Some Points',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10,
      created_at: new Date()
    });

    const posts = [post1, post2];
    const sorted = sortByBest(posts);

    expect(sorted[0]._id.toString()).toBe(post2._id.toString());
    expect(sorted[1]._id.toString()).toBe(post1._id.toString());
  });

  it('should balance recency and popularity', async () => {
    const now = new Date();
    
    // Very new post with moderate points
    const veryNewPost = await Post.create({
      title: 'Very New',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 15,
      created_at: new Date(now.getTime() - 0.5 * 60 * 60 * 1000) // 30 min ago
    });
    
    // Older post with high points
    const oldHighPost = await Post.create({
      title: 'Old High',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 100,
      created_at: new Date(now.getTime() - 48 * 60 * 60 * 1000) // 48 hours ago
    });
    
    // Medium age with medium points
    const mediumPost = await Post.create({
      title: 'Medium',
      url: 'https://example.com/3',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 30,
      created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000) // 6 hours ago
    });

    const posts = [veryNewPost, oldHighPost, mediumPost];
    const sorted = sortByBest(posts);

    // Verify all posts are present
    expect(sorted).toHaveLength(3);
    
    // Verify scores are in descending order
    const scores = sorted.map(p => calculateBestScore(p));
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });
});

describe('getPosts', () => {
  it('should return paginated posts with default parameters', async () => {
    // Create 30 posts
    for (let i = 0; i < 30; i++) {
      await Post.create({
        title: `Post ${i}`,
        url: `https://example.com/${i}`,
        author_id: new mongoose.Types.ObjectId(testUserId)
      });
    }

    const result = await getPosts();

    expect(result.posts).toHaveLength(25); // Default limit
    expect(result.total).toBe(30);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(2); // 30 posts / 25 per page = 2 pages
  });

  it('should return second page of posts', async () => {
    // Create 30 posts
    for (let i = 0; i < 30; i++) {
      await Post.create({
        title: `Post ${i}`,
        url: `https://example.com/${i}`,
        author_id: new mongoose.Types.ObjectId(testUserId)
      });
    }

    const result = await getPosts({ page: 2, limit: 25 });

    expect(result.posts).toHaveLength(5); // Remaining posts
    expect(result.total).toBe(30);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it('should respect custom limit parameter', async () => {
    // Create 20 posts
    for (let i = 0; i < 20; i++) {
      await Post.create({
        title: `Post ${i}`,
        url: `https://example.com/${i}`,
        author_id: new mongoose.Types.ObjectId(testUserId)
      });
    }

    const result = await getPosts({ limit: 10 });

    expect(result.posts).toHaveLength(10);
    expect(result.total).toBe(20);
    expect(result.totalPages).toBe(2);
  });

  it('should sort by "new" by default', async () => {
    const now = new Date();
    const post1 = await Post.create({
      title: 'Oldest',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    });
    const post2 = await Post.create({
      title: 'Middle',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    });
    const post3 = await Post.create({
      title: 'Newest',
      url: 'https://example.com/3',
      author_id: new mongoose.Types.ObjectId(testUserId),
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000)
    });

    const result = await getPosts();

    expect(result.posts[0].title).toBe('Newest');
    expect(result.posts[1].title).toBe('Middle');
    expect(result.posts[2].title).toBe('Oldest');
  });

  it('should sort by "top" when specified', async () => {
    await Post.create({
      title: 'Low Points',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 5
    });
    await Post.create({
      title: 'High Points',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 50
    });
    await Post.create({
      title: 'Medium Points',
      url: 'https://example.com/3',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 25
    });

    const result = await getPosts({ sort: 'top' });

    expect(result.posts[0].title).toBe('High Points');
    expect(result.posts[0].points).toBe(50);
    expect(result.posts[1].title).toBe('Medium Points');
    expect(result.posts[1].points).toBe(25);
    expect(result.posts[2].title).toBe('Low Points');
    expect(result.posts[2].points).toBe(5);
  });

  it('should sort by "best" when specified', async () => {
    const now = new Date();
    
    const newerPost = await Post.create({
      title: 'Newer Post',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10,
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000)
    });
    
    const olderPost = await Post.create({
      title: 'Older Post',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10,
      created_at: new Date(now.getTime() - 10 * 60 * 60 * 1000)
    });

    const result = await getPosts({ sort: 'best' });

    // Newer post should rank higher with same points
    expect(result.posts[0].title).toBe('Newer Post');
    expect(result.posts[1].title).toBe('Older Post');
  });

  it('should filter posts by search query (case-insensitive)', async () => {
    await Post.create({
      title: 'JavaScript Tutorial',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });
    await Post.create({
      title: 'Python Guide',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });
    await Post.create({
      title: 'Advanced JavaScript',
      url: 'https://example.com/3',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts({ search: 'javascript' });

    expect(result.posts).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.posts[0].title).toContain('JavaScript');
    expect(result.posts[1].title).toContain('JavaScript');
  });

  it('should handle search with uppercase query', async () => {
    await Post.create({
      title: 'javascript tutorial',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });
    await Post.create({
      title: 'Python Guide',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts({ search: 'JAVASCRIPT' });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe('javascript tutorial');
  });

  it('should handle search with partial match', async () => {
    await Post.create({
      title: 'Understanding TypeScript',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });
    await Post.create({
      title: 'Python Guide',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts({ search: 'script' });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toContain('Script');
  });

  it('should return empty array when no posts match search', async () => {
    await Post.create({
      title: 'JavaScript Tutorial',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts({ search: 'nonexistent' });

    expect(result.posts).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('should populate author data', async () => {
    await Post.create({
      title: 'Test Post',
      url: 'https://example.com',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts();

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].author_id).toBe(testUserId);
  });

  it('should handle empty database', async () => {
    const result = await getPosts();

    expect(result.posts).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(0);
  });

  it('should handle page beyond total pages', async () => {
    await Post.create({
      title: 'Test Post',
      url: 'https://example.com',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts({ page: 10 });

    expect(result.posts).toHaveLength(0);
    expect(result.total).toBe(1);
    expect(result.page).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  it('should default to page 1 when page is 0 or negative', async () => {
    await Post.create({
      title: 'Test Post',
      url: 'https://example.com',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts({ page: 0 });

    expect(result.page).toBe(1);
  });

  it('should default to limit 25 when limit is 0 or negative', async () => {
    // Create 30 posts
    for (let i = 0; i < 30; i++) {
      await Post.create({
        title: `Post ${i}`,
        url: `https://example.com/${i}`,
        author_id: new mongoose.Types.ObjectId(testUserId)
      });
    }

    const result = await getPosts({ limit: 0 });

    expect(result.posts).toHaveLength(25);
  });

  it('should combine search and sorting', async () => {
    await Post.create({
      title: 'JavaScript Basics',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 10
    });
    await Post.create({
      title: 'Advanced JavaScript',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 50
    });
    await Post.create({
      title: 'Python Guide',
      url: 'https://example.com/3',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 100
    });

    const result = await getPosts({ search: 'javascript', sort: 'top' });

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].title).toBe('Advanced JavaScript');
    expect(result.posts[0].points).toBe(50);
    expect(result.posts[1].title).toBe('JavaScript Basics');
    expect(result.posts[1].points).toBe(10);
  });

  it('should combine search and pagination', async () => {
    // Create 30 posts with "test" in title
    for (let i = 0; i < 30; i++) {
      await Post.create({
        title: `Test Post ${i}`,
        url: `https://example.com/${i}`,
        author_id: new mongoose.Types.ObjectId(testUserId)
      });
    }

    const result = await getPosts({ search: 'test', page: 2, limit: 10 });

    expect(result.posts).toHaveLength(10);
    expect(result.total).toBe(30);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
  });

  it('should trim whitespace from search query', async () => {
    await Post.create({
      title: 'JavaScript Tutorial',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts({ search: '  javascript  ' });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe('JavaScript Tutorial');
  });

  it('should ignore empty search query', async () => {
    await Post.create({
      title: 'Test Post 1',
      url: 'https://example.com/1',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });
    await Post.create({
      title: 'Test Post 2',
      url: 'https://example.com/2',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPosts({ search: '   ' });

    expect(result.posts).toHaveLength(2);
    expect(result.total).toBe(2);
  });
});

describe('getPostById', () => {
  it('should return post by ID with populated author data', async () => {
    const post = await Post.create({
      title: 'Test Post',
      url: 'https://example.com',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPostById(post._id.toString());

    expect(result).toMatchObject({
      _id: post._id.toString(),
      title: 'Test Post',
      url: 'https://example.com',
      type: 'link',
      author_id: testUserId,
      points: 0,
      comment_count: 0
    });
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should return post with all fields', async () => {
    const post = await Post.create({
      title: 'Test Text Post',
      text: 'This is the content',
      author_id: new mongoose.Types.ObjectId(testUserId),
      points: 42,
      comment_count: 10
    });

    const result = await getPostById(post._id.toString());

    expect(result).toMatchObject({
      _id: post._id.toString(),
      title: 'Test Text Post',
      text: 'This is the content',
      type: 'text',
      author_id: testUserId,
      points: 42,
      comment_count: 10
    });
    expect(result.url).toBeUndefined();
  });

  it('should throw NotFoundError if post does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();

    await expect(
      getPostById(nonExistentId)
    ).rejects.toThrow(NotFoundError);

    await expect(
      getPostById(nonExistentId)
    ).rejects.toThrow('Post not found');
  });

  it('should throw NotFoundError for invalid ObjectId format', async () => {
    await expect(
      getPostById('invalid-id')
    ).rejects.toThrow(NotFoundError);

    await expect(
      getPostById('invalid-id')
    ).rejects.toThrow('Post not found');
  });

  it('should return link post correctly', async () => {
    const post = await Post.create({
      title: 'Link Post',
      url: 'https://example.com/article',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPostById(post._id.toString());

    expect(result.type).toBe('link');
    expect(result.url).toBe('https://example.com/article');
    expect(result.text).toBeUndefined();
  });

  it('should return text post correctly', async () => {
    const post = await Post.create({
      title: 'Text Post',
      text: 'This is a discussion post',
      author_id: new mongoose.Types.ObjectId(testUserId)
    });

    const result = await getPostById(post._id.toString());

    expect(result.type).toBe('text');
    expect(result.text).toBe('This is a discussion post');
    expect(result.url).toBeUndefined();
  });
});
