import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { 
  createPost, 
  ValidationError, 
  sortByNew, 
  sortByTop, 
  sortByBest, 
  calculateBestScore,
  getPosts 
} from '../postService';
import { Post } from '../../models/Post';
import { User } from '../../models/User';
import { sanitizeText } from '../../utils/sanitize';

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
});

/**
 * Property 8: Post Type Determination
 * 
 * For any post creation request with a title and URL (but no text), 
 * a post of type "link" should be created, and for any request with 
 * a title and text (but no URL), a post of type "text" should be created.
 * 
 * **Validates: Requirements 3.1, 3.2**
 */
describe('Property 8: Post Type Determination', () => {
  it('should create link type for any post with URL and no text', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid title (1-300 chars), avoiding HTML
        fc.string({ minLength: 1, maxLength: 300 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        // Generate arbitrary valid URL
        fc.webUrl(),
        async (title, url) => {
          const result = await createPost({
            title,
            url,
            authorId: testUserId
          });
          
          // Property: Post with URL should have type "link"
          expect(result.type).toBe('link');
          expect(result.url).toBe(url);
          expect(result.text).toBeUndefined();
          
          // Cleanup
          await Post.deleteOne({ _id: result._id });
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should create text type for any post with text and no URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid title (1-300 chars), avoiding HTML
        fc.string({ minLength: 1, maxLength: 300 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        // Generate arbitrary text content (1-10000 chars), avoiding HTML
        fc.string({ minLength: 1, maxLength: 10000 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        async (title, text) => {
          const result = await createPost({
            title,
            text,
            authorId: testUserId
          });
          
          // Property: Post with text should have type "text"
          expect(result.type).toBe('text');
          // Account for HTML entity encoding in sanitization
          expect(result.text).toBe(sanitizeText(text.trim()));
          expect(result.url).toBeUndefined();
          
          // Cleanup
          await Post.deleteOne({ _id: result._id });
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 9: Post Mutual Exclusivity
 * 
 * For any post creation request that includes both URL and text, 
 * or neither URL nor text, the request should be rejected with 
 * a descriptive error.
 * 
 * **Validates: Requirements 3.3**
 */
describe('Property 9: Post Mutual Exclusivity', () => {
  it('should reject any post with both URL and text', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid title, avoiding HTML
        fc.string({ minLength: 1, maxLength: 300 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        // Generate arbitrary valid URL
        fc.webUrl(),
        // Generate arbitrary text content, avoiding HTML
        fc.string({ minLength: 1, maxLength: 10000 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        async (title, url, text) => {
          // Property: Post with both URL and text should be rejected
          await expect(
            createPost({
              title,
              url,
              text,
              authorId: testUserId
            })
          ).rejects.toThrow(ValidationError);
          
          await expect(
            createPost({
              title,
              url,
              text,
              authorId: testUserId
            })
          ).rejects.toThrow('Post must have either url or text, but not both');
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should reject any post with neither URL nor text', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid title, avoiding HTML
        fc.string({ minLength: 1, maxLength: 300 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        async (title) => {
          // Property: Post with neither URL nor text should be rejected
          await expect(
            createPost({
              title,
              authorId: testUserId
            })
          ).rejects.toThrow(ValidationError);
          
          await expect(
            createPost({
              title,
              authorId: testUserId
            })
          ).rejects.toThrow('Post must have either url or text');
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 10: Post Initialization Invariant
 * 
 * For any newly created post, the points should be initialized to 0, 
 * comment_count should be initialized to 0, author_id should be set 
 * to the creating user's ID, and created_at should be set to the 
 * current timestamp.
 * 
 * **Validates: Requirements 3.5, 3.6**
 */
describe('Property 10: Post Initialization Invariant', () => {
  it('should initialize all fields correctly for any valid post', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary valid title - use simpler generator
        fc.string({ minLength: 1, maxLength: 300 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        // Generate either URL or text (but not both)
        fc.oneof(
          fc.record({ url: fc.webUrl() }),
          fc.record({ 
            text: fc.string({ minLength: 1, maxLength: 1000 })
              .map(s => s.replace(/[<>]/g, ''))
              .filter(s => s.trim().length > 0)
          })
        ),
        async (title, content) => {
          const beforeCreate = new Date();
          
          const result = await createPost({
            title,
            ...content,
            authorId: testUserId
          });
          
          const afterCreate = new Date();
          
          // Property: Points should be initialized to 0
          expect(result.points).toBe(0);
          
          // Property: Comment count should be initialized to 0
          expect(result.comment_count).toBe(0);
          
          // Property: Author ID should be set to the creating user's ID
          expect(result.author_id).toBe(testUserId);
          
          // Property: Created_at should be set to current timestamp
          expect(result.created_at).toBeInstanceOf(Date);
          expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
          expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
          
          // Cleanup
          await Post.deleteOne({ _id: result._id });
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 11: Empty Title Rejection
 * 
 * For any post creation request where the title is empty or contains 
 * only whitespace characters, the request should be rejected with 
 * a descriptive error.
 * 
 * **Validates: Requirements 3.8**
 */
describe('Property 11: Empty Title Rejection', () => {
  it('should reject any post with empty or whitespace-only title', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary whitespace-only strings
        fc.string().filter(s => s.trim().length === 0),
        // Generate either URL or text, avoiding HTML
        fc.oneof(
          fc.record({ url: fc.webUrl() }),
          fc.record({ 
            text: fc.string({ minLength: 1, maxLength: 10000 })
              .map(s => s.replace(/[<>]/g, ''))
              .filter(s => s.trim().length > 0)
          })
        ),
        async (emptyTitle, content) => {
          // Property: Post with empty or whitespace-only title should be rejected
          await expect(
            createPost({
              title: emptyTitle,
              ...content,
              authorId: testUserId
            })
          ).rejects.toThrow(ValidationError);
          
          await expect(
            createPost({
              title: emptyTitle,
              ...content,
              authorId: testUserId
            })
          ).rejects.toThrow('Title cannot be empty or contain only whitespace');
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should reject any post with title exceeding 300 characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary long titles (301-500 chars) - use simpler generator
        fc.string({ minLength: 301, maxLength: 500 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 300),
        // Generate either URL or text
        fc.oneof(
          fc.record({ url: fc.webUrl() }),
          fc.record({ 
            text: fc.string({ minLength: 1, maxLength: 1000 })
              .map(s => s.replace(/[<>]/g, ''))
              .filter(s => s.trim().length > 0)
          })
        ),
        async (longTitle, content) => {
          // Property: Post with title exceeding 300 characters should be rejected
          await expect(
            createPost({
              title: longTitle,
              ...content,
              authorId: testUserId
            })
          ).rejects.toThrow(ValidationError);
          
          await expect(
            createPost({
              title: longTitle,
              ...content,
              authorId: testUserId
            })
          ).rejects.toThrow('Title must be between 1 and 300 characters');
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 13: New Sort Ordering
 * 
 * For any set of posts sorted by "new", each post should have a 
 * created_at timestamp greater than or equal to the next post in 
 * the list (descending order).
 * 
 * **Validates: Requirements 4.4**
 */
describe('Property 13: New Sort Ordering', () => {
  it('should maintain descending created_at order for any set of posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of posts with random timestamps
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.trim().length > 0),
            text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            // Generate random timestamps within a reasonable range (last 30 days)
            created_at: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            }),
            points: fc.integer({ min: -100, max: 1000 })
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (postData) => {
          // Create posts in database with specified timestamps
          const createdPosts = await Promise.all(
            postData.map(async (data) => {
              const post = await Post.create({
                title: data.title,
                text: data.text,
                author_id: testUserId,
                points: data.points,
                created_at: data.created_at
              });
              return post;
            })
          );
          
          // Sort posts using the sortByNew function
          const sortedPosts = sortByNew(createdPosts);
          
          // Property: Each post should have created_at >= next post's created_at
          for (let i = 0; i < sortedPosts.length - 1; i++) {
            expect(sortedPosts[i].created_at.getTime()).toBeGreaterThanOrEqual(
              sortedPosts[i + 1].created_at.getTime()
            );
          }
          
          // Cleanup
          await Post.deleteMany({ _id: { $in: createdPosts.map(p => p._id) } });
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 14: Top Sort Ordering
 * 
 * For any set of posts sorted by "top", each post should have 
 * points greater than or equal to the next post in the list 
 * (descending order).
 * 
 * **Validates: Requirements 4.5**
 */
describe('Property 14: Top Sort Ordering', () => {
  it('should maintain descending points order for any set of posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of posts with random points
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.trim().length > 0),
            text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            points: fc.integer({ min: -100, max: 1000 }),
            created_at: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            })
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (postData) => {
          // Create posts in database with specified points
          const createdPosts = await Promise.all(
            postData.map(async (data) => {
              const post = await Post.create({
                title: data.title,
                text: data.text,
                author_id: testUserId,
                points: data.points,
                created_at: data.created_at
              });
              return post;
            })
          );
          
          // Sort posts using the sortByTop function
          const sortedPosts = sortByTop(createdPosts);
          
          // Property: Each post should have points >= next post's points
          for (let i = 0; i < sortedPosts.length - 1; i++) {
            expect(sortedPosts[i].points).toBeGreaterThanOrEqual(
              sortedPosts[i + 1].points
            );
          }
          
          // Cleanup
          await Post.deleteMany({ _id: { $in: createdPosts.map(p => p._id) } });
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 15: Best Sort Algorithm Correctness
 * 
 * For any set of posts sorted by "best", each post's score 
 * (calculated as points / ((hours_since_creation + 2) ^ 1.8)) 
 * should be greater than or equal to the next post's score in 
 * the list.
 * 
 * **Validates: Requirements 4.6**
 */
describe('Property 15: Best Sort Algorithm Correctness', () => {
  it('should maintain descending best score order for any set of posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of posts with random points and timestamps
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.trim().length > 0),
            text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            points: fc.integer({ min: 0, max: 1000 }), // Use non-negative points for best sort
            // Generate timestamps within last 30 days for realistic scores
            created_at: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            })
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (postData) => {
          // Create posts in database with specified points and timestamps
          const createdPosts = await Promise.all(
            postData.map(async (data) => {
              const post = await Post.create({
                title: data.title,
                text: data.text,
                author_id: testUserId,
                points: data.points,
                created_at: data.created_at
              });
              return post;
            })
          );
          
          // Sort posts using the sortByBest function
          const sortedPosts = sortByBest(createdPosts);
          
          // Property: Each post should have best score >= next post's best score
          for (let i = 0; i < sortedPosts.length - 1; i++) {
            const currentScore = calculateBestScore(sortedPosts[i]);
            const nextScore = calculateBestScore(sortedPosts[i + 1]);
            
            expect(currentScore).toBeGreaterThanOrEqual(nextScore);
          }
          
          // Additional property: Verify the score calculation is correct
          // Score = points / ((hours + 2) ^ 1.8)
          for (const post of sortedPosts) {
            const GRAVITY = 1.8;
            const now = new Date();
            const hoursOld = (now.getTime() - post.created_at.getTime()) / (1000 * 60 * 60);
            const expectedScore = post.points / Math.pow(hoursOld + 2, GRAVITY);
            const actualScore = calculateBestScore(post);
            
            // Allow small floating point differences
            expect(Math.abs(actualScore - expectedScore)).toBeLessThan(0.0001);
          }
          
          // Cleanup
          await Post.deleteMany({ _id: { $in: createdPosts.map(p => p._id) } });
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should rank newer posts higher than older posts with equal points', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a fixed point value
        fc.integer({ min: 10, max: 100 }),
        // Generate two different timestamps (older and newer)
        fc.tuple(
          fc.date({ 
            min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            max: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
          }),
          fc.date({ 
            min: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            max: new Date()
          })
        ),
        async (points, [olderDate, newerDate]) => {
          // Ensure dates are actually different
          if (olderDate.getTime() >= newerDate.getTime()) {
            return; // Skip this iteration
          }
          
          // Create two posts with same points but different ages
          const olderPost = await Post.create({
            title: 'Older Post',
            text: 'Content',
            author_id: testUserId,
            points: points,
            created_at: olderDate
          });
          
          const newerPost = await Post.create({
            title: 'Newer Post',
            text: 'Content',
            author_id: testUserId,
            points: points,
            created_at: newerDate
          });
          
          // Calculate scores
          const olderScore = calculateBestScore(olderPost);
          const newerScore = calculateBestScore(newerPost);
          
          // Property: Newer post with same points should have higher score
          expect(newerScore).toBeGreaterThan(olderScore);
          
          // Verify sorting places newer post first
          const sorted = sortByBest([olderPost, newerPost]);
          expect(sorted[0]._id.toString()).toBe(newerPost._id.toString());
          
          // Cleanup
          await Post.deleteMany({ _id: { $in: [olderPost._id, newerPost._id] } });
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 12: Pagination Consistency
 * 
 * For any set of posts and pagination parameters (page, limit), 
 * each post should appear exactly once across all pages, and the 
 * total number of posts across all pages should equal the total count.
 * 
 * **Validates: Requirements 4.2, 4.3**
 */
describe('Property 12: Pagination Consistency', () => {
  it('should ensure each post appears exactly once across all pages', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of posts (5-50 posts)
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.trim().length > 0),
            text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            points: fc.integer({ min: -100, max: 1000 }),
            created_at: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            })
          }),
          { minLength: 5, maxLength: 50 }
        ),
        // Generate random page size (3-15 posts per page)
        fc.integer({ min: 3, max: 15 }),
        async (postData, limit) => {
          // Create posts in database
          const createdPosts = await Promise.all(
            postData.map(async (data) => {
              const post = await Post.create({
                title: data.title,
                text: data.text,
                author_id: testUserId,
                points: data.points,
                created_at: data.created_at
              });
              return post;
            })
          );
          
          // Collect all post IDs across all pages
          const allPostIds = new Set<string>();
          const totalPosts = createdPosts.length;
          const expectedTotalPages = Math.ceil(totalPosts / limit);
          
          // Fetch all pages
          for (let page = 1; page <= expectedTotalPages; page++) {
            const result = await getPosts({ page, limit, sort: 'new' });
            
            // Property: Response should have correct pagination metadata
            expect(result.page).toBe(page);
            expect(result.total).toBe(totalPosts);
            expect(result.totalPages).toBe(expectedTotalPages);
            
            // Property: Each page should have correct number of posts
            if (page < expectedTotalPages) {
              // All pages except last should have exactly 'limit' posts
              expect(result.posts.length).toBe(limit);
            } else {
              // Last page should have remaining posts
              const expectedOnLastPage = totalPosts - (limit * (expectedTotalPages - 1));
              expect(result.posts.length).toBe(expectedOnLastPage);
            }
            
            // Collect post IDs from this page
            result.posts.forEach(post => {
              // Property: Each post should appear only once
              expect(allPostIds.has(post._id)).toBe(false);
              allPostIds.add(post._id);
            });
          }
          
          // Property: Total number of posts across all pages should equal total count
          expect(allPostIds.size).toBe(totalPosts);
          
          // Property: All created posts should be present in pagination results
          const createdPostIds = new Set(createdPosts.map(p => p._id.toString()));
          expect(allPostIds.size).toBe(createdPostIds.size);
          
          for (const postId of allPostIds) {
            expect(createdPostIds.has(postId)).toBe(true);
          }
          
          // Cleanup
          await Post.deleteMany({ _id: { $in: createdPosts.map(p => p._id) } });
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should maintain pagination consistency across different sort methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of posts
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.trim().length > 0),
            text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            points: fc.integer({ min: 0, max: 1000 }),
            created_at: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            })
          }),
          { minLength: 10, maxLength: 30 }
        ),
        // Generate random page size
        fc.integer({ min: 5, max: 10 }),
        // Generate random sort method
        fc.constantFrom('new', 'top', 'best'),
        async (postData, limit, sort) => {
          // Create posts in database
          const createdPosts = await Promise.all(
            postData.map(async (data) => {
              const post = await Post.create({
                title: data.title,
                text: data.text,
                author_id: testUserId,
                points: data.points,
                created_at: data.created_at
              });
              return post;
            })
          );
          
          // Collect all post IDs across all pages for this sort method
          const allPostIds = new Set<string>();
          const totalPosts = createdPosts.length;
          const expectedTotalPages = Math.ceil(totalPosts / limit);
          
          // Fetch all pages with the specified sort method
          for (let page = 1; page <= expectedTotalPages; page++) {
            const result = await getPosts({ page, limit, sort: sort as 'new' | 'top' | 'best' });
            
            result.posts.forEach(post => {
              // Property: Each post should appear exactly once regardless of sort method
              expect(allPostIds.has(post._id)).toBe(false);
              allPostIds.add(post._id);
            });
          }
          
          // Property: All posts should be present exactly once
          expect(allPostIds.size).toBe(totalPosts);
          
          // Cleanup
          await Post.deleteMany({ _id: { $in: createdPosts.map(p => p._id) } });
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 16: Search Result Containment
 * 
 * For any search query string, all returned posts should have titles 
 * that contain the query string (case-insensitive), and no posts with 
 * matching titles should be excluded.
 * 
 * **Validates: Requirements 4.7**
 */
describe('Property 16: Search Result Containment', () => {
  it('should return only posts with titles containing the search query (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of posts with various titles
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.trim().length > 0),
            text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            points: fc.integer({ min: 0, max: 1000 }),
            created_at: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            })
          }),
          { minLength: 10, maxLength: 30 }
        ),
        // Generate a search query (substring that might appear in titles)
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        async (postData, searchQuery) => {
          // Clear all posts before this iteration to ensure test isolation
          await Post.deleteMany({});
          
          // Trim the search query to match what getPosts does
          const trimmedSearchQuery = searchQuery.trim();
          
          // Skip if search query becomes empty after trimming
          if (trimmedSearchQuery.length === 0) {
            return;
          }
          
          // Create posts in database
          const createdPosts = await Promise.all(
            postData.map(async (data) => {
              const post = await Post.create({
                title: data.title,
                text: data.text,
                author_id: testUserId,
                points: data.points,
                created_at: data.created_at
              });
              return post;
            })
          );
          
          // Perform search
          const result = await getPosts({ 
            page: 1, 
            limit: 100, // Use large limit to get all matching posts
            sort: 'new',
            search: searchQuery 
          });
          
          // Count how many posts should match (case-insensitive)
          // Use trimmed search query since that's what getPosts uses
          const expectedMatches = createdPosts.filter(post => 
            post.title.toLowerCase().includes(trimmedSearchQuery.toLowerCase())
          );
          
          // Property: All returned posts should contain the search query in their title
          for (const post of result.posts) {
            expect(post.title.toLowerCase()).toContain(trimmedSearchQuery.toLowerCase());
          }
          
          // Property: The number of returned posts should match the expected count
          expect(result.posts.length).toBe(expectedMatches.length);
          expect(result.total).toBe(expectedMatches.length);
          
          // Property: No posts with matching titles should be excluded
          // Verify all expected matches are in the results
          const resultIds = new Set(result.posts.map(p => p._id));
          for (const expectedPost of expectedMatches) {
            expect(resultIds.has(expectedPost._id.toString())).toBe(true);
          }
          
          // Cleanup
          await Post.deleteMany({});
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should handle empty search results when no titles match', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate posts with specific title pattern
        fc.array(
          fc.record({
            title: fc.constantFrom('Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'),
            text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            points: fc.integer({ min: 0, max: 1000 }),
            created_at: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            })
          }),
          { minLength: 5, maxLength: 15 }
        ),
        async (postData) => {
          // Clear all posts before this iteration to ensure test isolation
          await Post.deleteMany({});
          
          // Create posts in database
          const createdPosts = await Promise.all(
            postData.map(async (data) => {
              const post = await Post.create({
                title: data.title,
                text: data.text,
                author_id: testUserId,
                points: data.points,
                created_at: data.created_at
              });
              return post;
            })
          );
          
          // Search for something that definitely doesn't match
          const nonMatchingQuery = 'ZZZZZZZZZ_NO_MATCH_POSSIBLE';
          const result = await getPosts({ 
            page: 1, 
            limit: 100,
            sort: 'new',
            search: nonMatchingQuery 
          });
          
          // Property: When no titles match, result should be empty
          expect(result.posts.length).toBe(0);
          expect(result.total).toBe(0);
          expect(result.totalPages).toBe(0);
          
          // Cleanup
          await Post.deleteMany({});
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should perform case-insensitive search correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a base word and create posts with different case variations
        fc.string({ minLength: 3, maxLength: 10 }).filter(s => s.trim().length > 0 && /^[a-zA-Z]+$/.test(s)),
        async (baseWord) => {
          // Clear all posts before this iteration to ensure test isolation
          await Post.deleteMany({});
          
          // Create posts with different case variations of the base word
          const variations = [
            baseWord.toLowerCase(),
            baseWord.toUpperCase(),
            baseWord.charAt(0).toUpperCase() + baseWord.slice(1).toLowerCase(),
            baseWord.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('')
          ];
          
          const createdPosts = await Promise.all(
            variations.map(async (variation) => {
              const post = await Post.create({
                title: `Test ${variation} Post`,
                text: 'Content',
                author_id: testUserId,
                points: 0,
                created_at: new Date()
              });
              return post;
            })
          );
          
          // Search with lowercase version
          const result = await getPosts({ 
            page: 1, 
            limit: 100,
            sort: 'new',
            search: baseWord.toLowerCase() 
          });
          
          // Property: All case variations should be found
          expect(result.posts.length).toBe(variations.length);
          expect(result.total).toBe(variations.length);
          
          // Property: Each variation should be in the results
          const resultTitles = result.posts.map(p => p.title);
          for (const variation of variations) {
            const found = resultTitles.some(title => 
              title.toLowerCase().includes(baseWord.toLowerCase())
            );
            expect(found).toBe(true);
          }
          
          // Cleanup
          await Post.deleteMany({});
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('should maintain search consistency across pagination', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a common search term
        fc.constantFrom('test', 'post', 'news', 'article', 'story'),
        // Generate posts, some with the search term
        fc.array(
          fc.record({
            // Mix of titles with and without the search term
            titlePrefix: fc.constantFrom('test', 'other', 'random', 'sample'),
            text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            points: fc.integer({ min: 0, max: 1000 }),
            created_at: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            })
          }),
          { minLength: 15, maxLength: 40 }
        ),
        // Generate page size
        fc.integer({ min: 3, max: 8 }),
        async (searchTerm, postData, limit) => {
          // Clear all posts before this iteration to ensure test isolation
          await Post.deleteMany({});
          
          // Create posts with titles that may or may not contain search term
          const createdPosts = await Promise.all(
            postData.map(async (data, index) => {
              const post = await Post.create({
                title: `${data.titlePrefix} post ${index}`,
                text: data.text,
                author_id: testUserId,
                points: data.points,
                created_at: data.created_at
              });
              return post;
            })
          );
          
          // Count expected matches
          const expectedMatches = createdPosts.filter(post => 
            post.title.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          if (expectedMatches.length === 0) {
            // Skip if no matches
            await Post.deleteMany({});
            return;
          }
          
          // Collect all post IDs across all pages
          const allPostIds = new Set<string>();
          const expectedTotalPages = Math.ceil(expectedMatches.length / limit);
          
          // Fetch all pages
          for (let page = 1; page <= expectedTotalPages; page++) {
            const result = await getPosts({ 
              page, 
              limit, 
              sort: 'new',
              search: searchTerm 
            });
            
            // Property: All returned posts should match the search
            for (const post of result.posts) {
              expect(post.title.toLowerCase()).toContain(searchTerm.toLowerCase());
            }
            
            // Collect post IDs from this page
            result.posts.forEach(post => {
              // Property: Each post should appear only once across pages
              expect(allPostIds.has(post._id)).toBe(false);
              allPostIds.add(post._id);
            });
          }
          
          // Property: Total posts across all pages should equal expected matches
          expect(allPostIds.size).toBe(expectedMatches.length);
          
          // Property: All expected matches should be present
          const expectedIds = new Set(expectedMatches.map(p => p._id.toString()));
          for (const postId of allPostIds) {
            expect(expectedIds.has(postId)).toBe(true);
          }
          
          // Cleanup
          await Post.deleteMany({});
        }
      ),
      { numRuns: 20 }
    );
  });
});
