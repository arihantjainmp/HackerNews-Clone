import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Comment, IComment } from '../../models/Comment';
import { Post } from '../../models/Post';
import { User } from '../../models/User';
import { buildCommentTree, ICommentNode } from '../commentService';

/**
 * Property-Based Tests for Comment Service
 * Uses fast-check to verify universal properties across many generated inputs
 */

let mongoServer: MongoMemoryServer;

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
  // Clear all collections before each test and wait for completion
  await Promise.all([
    Comment.deleteMany({}),
    Post.deleteMany({}),
    User.deleteMany({})
  ]);
  
  // Ensure indexes are ready
  await Promise.all([
    Comment.syncIndexes(),
    Post.syncIndexes(),
    User.syncIndexes()
  ]);
});

/**
 * Helper function to recursively collect all comments from a tree
 */
function collectAllCommentsFromTree(nodes: ICommentNode[]): IComment[] {
  const comments: IComment[] = [];
  
  function traverse(node: ICommentNode) {
    comments.push(node.comment);
    for (const reply of node.replies) {
      traverse(reply);
    }
  }
  
  for (const node of nodes) {
    traverse(node);
  }
  
  return comments;
}

/**
 * Helper function to verify a comment is reachable in the tree
 */
function isCommentReachable(commentId: string, tree: ICommentNode[]): boolean {
  function search(nodes: ICommentNode[]): boolean {
    for (const node of nodes) {
      if (node.comment._id.toString() === commentId) {
        return true;
      }
      if (search(node.replies)) {
        return true;
      }
    }
    return false;
  }
  
  return search(tree);
}

describe('Comment Service - Property Tests', () => {
  /**
   * Feature: hacker-news-clone, Property 23: Top-Level Comment Parent
   * For any comment created directly on a post (not as a reply), 
   * the parent_id should be null.
   * 
   * Validates: Requirements 6.1
   */
  it('Property 23: top-level comments should have parent_id = null', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate alphanumeric strings to avoid HTML that would be sanitized
        fc.string({ minLength: 1, maxLength: 100 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0), // Filter after removing HTML
        async (content) => {
          let user, post, comment;
          
          try {
            // Generate unique identifiers using ObjectId and timestamp
            const uniqueId = new mongoose.Types.ObjectId().toString();
            const timestamp = Date.now();
            
            // Create test user and post with unique identifiers
            user = await User.create({
              username: `u${uniqueId.substring(0, 10)}${timestamp}`.substring(0, 20),
              email: `test${uniqueId}${timestamp}@ex.com`,
              password_hash: 'hashedpassword'
            });

            post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });

            // Import createComment function
            const { createComment } = await import('../commentService');

            // Create top-level comment
            comment = await createComment({
              content,
              postId: post._id.toString(),
              authorId: user._id.toString()
            });

            // Property: Top-level comment must have parent_id = null
            expect(comment.parent_id).toBeNull();
          } finally {
            // Cleanup - always runs even if test fails
            if (comment) await Comment.deleteMany({ _id: comment._id });
            if (post) await Post.deleteMany({ _id: post._id });
            if (user) await User.deleteMany({ _id: user._id });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 24: Reply Parent Reference
   * For any comment created as a reply to another comment, 
   * the parent_id should equal the parent comment's ID.
   * 
   * Validates: Requirements 6.2
   */
  it('Property 24: replies should have parent_id equal to parent comment ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        async (parentContent, replyContent) => {
          let user, post, parentComment, reply;
          
          try {
            // Generate unique identifiers using ObjectId and timestamp
            const uniqueId = new mongoose.Types.ObjectId().toString();
            const timestamp = Date.now();
            
            // Create test user and post with unique identifiers
            user = await User.create({
              username: `u${uniqueId.substring(0, 10)}${timestamp}`.substring(0, 20),
              email: `test${uniqueId}${timestamp}@ex.com`,
              password_hash: 'hashedpassword'
            });

            post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });

            // Import comment functions
            const { createComment, createReply } = await import('../commentService');

            // Create parent comment
            parentComment = await createComment({
              content: parentContent,
              postId: post._id.toString(),
              authorId: user._id.toString()
            });

            // Create reply
            reply = await createReply({
              content: replyContent,
              parentId: parentComment._id.toString(),
              postId: post._id.toString(),
              authorId: user._id.toString()
            });

            // Property: Reply must have parent_id equal to parent comment's ID
            expect(reply.parent_id).toBeDefined();
            expect(reply.parent_id!.toString()).toBe(parentComment._id.toString());
          } finally {
            // Cleanup - always runs even if test fails
            if (parentComment || reply) {
              await Comment.deleteMany({ _id: { $in: [parentComment?._id, reply?._id].filter(Boolean) } });
            }
            if (post) await Post.deleteMany({ _id: post._id });
            if (user) await User.deleteMany({ _id: user._id });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 25: Comment Initialization Invariant
   * For any newly created comment, the points should be initialized to 0, 
   * author_id should be set to the creating user's ID, created_at should be 
   * set to the current timestamp, and is_deleted should be false.
   * 
   * Validates: Requirements 6.3
   */
  it('Property 25: comments should be initialized with correct default values', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate strings that won't be empty after sanitization
        // Use alphanumeric strings to avoid HTML that would be sanitized away
        fc.string({ minLength: 1, maxLength: 100 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        fc.boolean(), // Whether to create a reply or top-level comment
        async (content, isReply) => {
          let user, post, comment, parentComment;
          
          try {
            const beforeCreation = Date.now();

            // Generate unique identifiers using ObjectId and timestamp
            const uniqueId = new mongoose.Types.ObjectId().toString();
            const timestamp = Date.now();
            
            // Create test user and post with unique identifiers
            user = await User.create({
              username: `u${uniqueId.substring(0, 10)}${timestamp}`.substring(0, 20),
              email: `test${uniqueId}${timestamp}@ex.com`,
              password_hash: 'hashedpassword'
            });

            post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });

            // Import comment functions
            const { createComment, createReply } = await import('../commentService');

            if (isReply) {
              // Create parent comment first
              parentComment = await createComment({
                content: 'Parent',
                postId: post._id.toString(),
                authorId: user._id.toString()
              });

              // Create reply
              comment = await createReply({
                content,
                parentId: parentComment._id.toString(),
                postId: post._id.toString(),
                authorId: user._id.toString()
              });
            } else {
              // Create top-level comment
              comment = await createComment({
                content,
                postId: post._id.toString(),
                authorId: user._id.toString()
              });
            }

            const afterCreation = Date.now();

            // Property: Points must be initialized to 0
            expect(comment.points).toBe(0);

            // Property: author_id must be set to creating user's ID
            expect(comment.author_id.toString()).toBe(user._id.toString());

            // Property: created_at must be set to current timestamp (within reasonable range)
            expect(comment.created_at).toBeInstanceOf(Date);
            expect(comment.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation);
            expect(comment.created_at.getTime()).toBeLessThanOrEqual(afterCreation);

            // Property: is_deleted must be false
            expect(comment.is_deleted).toBe(false);
          } finally {
            // Cleanup - always runs even if test fails
            if (comment || parentComment) {
              await Comment.deleteMany({ _id: { $in: [comment?._id, parentComment?._id].filter(Boolean) } });
            }
            if (post) await Post.deleteMany({ _id: post._id });
            if (user) await User.deleteMany({ _id: user._id });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 26: Comment Count Increment
   * For any post, when a new comment is created on that post (either top-level 
   * or nested), the post's comment_count should increase by exactly 1.
   * 
   * Validates: Requirements 6.4
   */
  it('Property 26: post comment_count should increment by 1 for each comment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 100 })
              .map(s => s.replace(/[<>]/g, ''))
              .filter(s => s.trim().length > 0), // Filter after removing HTML
            isReply: fc.boolean()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (comments) => {
          let user, post, parentComment;
          const createdComments: any[] = [];
          
          try {
            // Generate unique identifiers using ObjectId and timestamp
            const uniqueId = new mongoose.Types.ObjectId().toString();
            const timestamp = Date.now();
            
            // Create test user and post with unique identifiers
            user = await User.create({
              username: `u${uniqueId.substring(0, 10)}${timestamp}`.substring(0, 20),
              email: `test${uniqueId}${timestamp}@ex.com`,
              password_hash: 'hashedpassword'
            });

            post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });

            const initialCount = post.comment_count;

            // Import comment functions
            const { createComment, createReply } = await import('../commentService');

            // Create a parent comment for replies
            parentComment = await createComment({
              content: 'Parent for replies',
              postId: post._id.toString(),
              authorId: user._id.toString()
            });

            let expectedCount = initialCount + 1; // Account for parent comment
            createdComments.push(parentComment);

            // Create comments
            for (const commentData of comments) {
              let comment;
              if (commentData.isReply) {
                comment = await createReply({
                  content: commentData.content,
                  parentId: parentComment._id.toString(),
                  postId: post._id.toString(),
                  authorId: user._id.toString()
                });
              } else {
                comment = await createComment({
                  content: commentData.content,
                  postId: post._id.toString(),
                  authorId: user._id.toString()
                });
              }
              createdComments.push(comment);
              expectedCount++;

              // Property: After each comment creation, count should increase by 1
              const updatedPost = await Post.findById(post._id);
              expect(updatedPost!.comment_count).toBe(expectedCount);
            }

            // Property: Final count should equal initial count + number of comments created
            const finalPost = await Post.findById(post._id);
            expect(finalPost!.comment_count).toBe(expectedCount);
          } finally {
            // Cleanup - always runs even if test fails
            if (createdComments.length > 0) {
              await Comment.deleteMany({ _id: { $in: createdComments.map(c => c._id) } });
            }
            if (post) await Post.deleteMany({ _id: post._id });
            if (user) await User.deleteMany({ _id: user._id });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 27: Empty Comment Rejection
   * For any comment creation or edit request where the content is empty or 
   * contains only whitespace characters, the request should be rejected 
   * with a descriptive error.
   * 
   * Validates: Requirements 6.5, 7.6
   */
  it('Property 27: empty or whitespace-only content should be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t'),
          fc.constant('\n'),
          fc.constant('  \t  \n  ')
        ),
        async (emptyContent) => {
          // Generate unique identifiers using ObjectId and timestamp
          const uniqueId = new mongoose.Types.ObjectId().toString();
          const timestamp = Date.now();
          
          // Create test user and post with unique identifiers
          const user = await User.create({
            username: `u${uniqueId.substring(0, 10)}${timestamp}`.substring(0, 20),
            email: `test${uniqueId}${timestamp}@ex.com`,
            password_hash: 'hashedpassword'
          });

          const post = await Post.create({
            title: 'Test Post',
            url: 'https://example.com',
            type: 'link',
            author_id: user._id,
            points: 0,
            comment_count: 0
          });

          // Import comment functions
          const { createComment, ValidationError } = await import('../commentService');

          // Property: Empty content must be rejected with ValidationError
          await expect(
            createComment({
              content: emptyContent,
              postId: post._id.toString(),
              authorId: user._id.toString()
            })
          ).rejects.toThrow(ValidationError);

          await expect(
            createComment({
              content: emptyContent,
              postId: post._id.toString(),
              authorId: user._id.toString()
            })
          ).rejects.toThrow(/empty.*whitespace/i);

          // Cleanup
          await Post.deleteMany({ _id: post._id });
          await User.deleteMany({ _id: user._id });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 28: Comment Edit Timestamp
   * For any comment that is edited, the edited_at field should be set to the 
   * current timestamp and the content should be updated to the new value.
   * 
   * Validates: Requirements 7.1
   */
  it('Property 28: edited comments should have edited_at timestamp and updated content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        async (originalContent, newContent) => {
          let user, post, comment;
          
          try {
            const beforeEdit = Date.now();

            // Generate unique identifiers using ObjectId and timestamp
            const uniqueId = new mongoose.Types.ObjectId().toString();
            const timestamp = Date.now();
            
            // Create test user and post with unique identifiers
            user = await User.create({
              username: `u${uniqueId.substring(0, 10)}${timestamp}`.substring(0, 20),
              email: `test${uniqueId}${timestamp}@ex.com`,
              password_hash: 'hashedpassword'
            });

            post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });

            // Import comment functions and sanitization
            const { createComment, editComment } = await import('../commentService');
            const { sanitizeText } = await import('../../utils/sanitize');

            // Create a comment
            comment = await createComment({
              content: originalContent,
              postId: post._id.toString(),
              authorId: user._id.toString()
            });

            // Verify comment was created without edited_at
            expect(comment.edited_at).toBeUndefined();

            // Wait a small amount to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            // Edit the comment
            const editedComment = await editComment(
              comment._id.toString(),
              newContent,
              user._id.toString()
            );

            const afterEdit = Date.now();

            // Property: Content should be updated to sanitized new value
            // Account for HTML sanitization
            const expectedContent = sanitizeText(newContent);
            expect(editedComment.content).toBe(expectedContent);

            // Property: edited_at should be set to current timestamp
            expect(editedComment.edited_at).toBeDefined();
            expect(editedComment.edited_at).toBeInstanceOf(Date);
            
            // Property: edited_at should be within reasonable time range
            expect(editedComment.edited_at!.getTime()).toBeGreaterThanOrEqual(beforeEdit);
            expect(editedComment.edited_at!.getTime()).toBeLessThanOrEqual(afterEdit);

            // Property: edited_at should be after created_at
            expect(editedComment.edited_at!.getTime()).toBeGreaterThanOrEqual(
              editedComment.created_at.getTime()
            );
          } finally {
            // Cleanup - always runs even if test fails
            if (comment) await Comment.deleteMany({ _id: comment._id });
            if (post) await Post.deleteMany({ _id: post._id });
            if (user) await User.deleteMany({ _id: user._id });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 29: Comment Soft Deletion
   * For any comment that is deleted, the is_deleted flag should be set to true 
   * and the content should be replaced with "[deleted]", but the comment record 
   * should remain in the database.
   * 
   * Validates: Requirements 7.3
   */
  it('Property 29: deleted comments should be soft deleted with is_deleted=true and content="[deleted]"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        async (content) => {
          let user, post, comment, reply;
          
          try {
            // Generate unique identifiers using ObjectId and timestamp
            const uniqueId = new mongoose.Types.ObjectId().toString();
            const timestamp = Date.now();
            
            // Create test user and post with unique identifiers
            user = await User.create({
              username: `u${uniqueId.substring(0, 10)}${timestamp}`.substring(0, 20),
              email: `test${uniqueId}${timestamp}@ex.com`,
              password_hash: 'hashedpassword'
            });

            post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });

            // Import comment functions
            const { createComment, createReply, deleteComment } = await import('../commentService');

            // Create parent comment
            comment = await createComment({
              content,
              postId: post._id.toString(),
              authorId: user._id.toString()
            });

            // Create a reply to ensure soft delete behavior
            reply = await createReply({
              content: 'Reply to parent',
              parentId: comment._id.toString(),
              postId: post._id.toString(),
              authorId: user._id.toString()
            });

            // Store original content for verification
            const originalContent = comment.content;

            // Delete the parent comment (should be soft delete because it has replies)
            await deleteComment(comment._id.toString(), user._id.toString());

            // Fetch the comment from database
            const deletedComment = await Comment.findById(comment._id);

            // Property: Comment record should still exist in database
            expect(deletedComment).not.toBeNull();

            // Property: is_deleted flag should be set to true
            expect(deletedComment!.is_deleted).toBe(true);

            // Property: Content should be replaced with "[deleted]"
            expect(deletedComment!.content).toBe('[deleted]');

            // Property: Content should have changed from original
            expect(deletedComment!.content).not.toBe(originalContent);
          } finally {
            // Cleanup - always runs even if test fails
            if (comment || reply) {
              await Comment.deleteMany({ _id: { $in: [comment?._id, reply?._id].filter(Boolean) } });
            }
            if (post) await Post.deleteMany({ _id: post._id });
            if (user) await User.deleteMany({ _id: user._id });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 30: Deleted Comment Structure Preservation
   * For any deleted comment that has replies, the comment should remain in the database 
   * with is_deleted = true and content = "[deleted]", and all child comments should 
   * still reference it as their parent.
   * 
   * Validates: Requirements 7.5
   */
  it('Property 30: deleted comments with replies should preserve structure and parent references', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 })
          .map(s => s.replace(/[<>]/g, ''))
          .filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 1, maxLength: 100 })
            .map(s => s.replace(/[<>]/g, ''))
            .filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        async (parentContent, replyContents) => {
          let user, post, parentComment;
          const replies: any[] = [];
          
          try {
            // Generate unique identifiers using ObjectId and timestamp
            const uniqueId = new mongoose.Types.ObjectId().toString();
            const timestamp = Date.now();
            
            // Create test user and post with unique identifiers
            user = await User.create({
              username: `u${uniqueId.substring(0, 10)}${timestamp}`.substring(0, 20),
              email: `test${uniqueId}${timestamp}@ex.com`,
              password_hash: 'hashedpassword'
            });

            post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });

            // Import comment functions
            const { createComment, createReply, deleteComment } = await import('../commentService');

            // Create parent comment
            parentComment = await createComment({
              content: parentContent,
              postId: post._id.toString(),
              authorId: user._id.toString()
            });

            // Create multiple replies to the parent comment
            for (const replyContent of replyContents) {
              const reply = await createReply({
                content: replyContent,
                parentId: parentComment._id.toString(),
                postId: post._id.toString(),
                authorId: user._id.toString()
              });
              replies.push(reply);
            }

            // Store parent comment ID for verification
            const parentCommentId = parentComment._id.toString();

            // Delete the parent comment (should be soft delete because it has replies)
            await deleteComment(parentCommentId, user._id.toString());

            // Fetch the deleted parent comment from database
            const deletedParent = await Comment.findById(parentCommentId);

            // Property: Parent comment should still exist in database
            expect(deletedParent).not.toBeNull();

            // Property: Parent comment should be marked as deleted
            expect(deletedParent!.is_deleted).toBe(true);
            expect(deletedParent!.content).toBe('[deleted]');

            // Property: All child comments should still reference the deleted parent
            for (const reply of replies) {
              const childComment = await Comment.findById(reply._id);
              
              // Child comment should still exist
              expect(childComment).not.toBeNull();
              
              // Child comment should still reference the deleted parent
              expect(childComment!.parent_id).not.toBeNull();
              expect(childComment!.parent_id!.toString()).toBe(parentCommentId);
              
              // Child comment should not be affected by parent deletion
              expect(childComment!.is_deleted).toBe(false);
              expect(childComment!.content).not.toBe('[deleted]');
            }

            // Property: Comment tree structure should be preserved
            const allComments = await Comment.find({ post_id: post._id });
            const tree = buildCommentTree(allComments);

            // Verify deleted parent is in the tree
            const deletedParentInTree = tree.find(node => 
              node.comment._id.toString() === parentCommentId
            );
            expect(deletedParentInTree).toBeDefined();

            // Verify all replies are nested under the deleted parent
            expect(deletedParentInTree!.replies.length).toBe(replies.length);

            // Verify each reply is reachable in the tree
            for (const reply of replies) {
              const replyInTree = deletedParentInTree!.replies.find(node =>
                node.comment._id.toString() === reply._id.toString()
              );
              expect(replyInTree).toBeDefined();
            }
          } finally {
            // Cleanup - always runs even if test fails
            if (parentComment || replies.length > 0) {
              await Comment.deleteMany({ 
                _id: { $in: [parentComment?._id, ...replies.map(r => r._id)].filter(Boolean) } 
              });
            }
            if (post) await Post.deleteMany({ _id: post._id });
            if (user) await User.deleteMany({ _id: user._id });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 31: Comment Tree Completeness
   * For any post, when retrieving the comment tree, all comments belonging to that post
   * should be included in the tree structure, and each comment should be reachable from
   * either the root (if parent_id is null) or from its parent comment.
   * 
   * Validates: Requirements 10.1
   */
  it('Property 31: all comments should be reachable in the tree structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a tree structure: array of comments with parent relationships
        fc.array(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 100 }),
            parentIndex: fc.option(fc.nat(), { nil: null }) // null for root, or index of parent
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (commentData) => {
          // Create test user and post with unique identifiers
          const uniqueId = Math.random().toString(36).substring(2, 8);
          const user = await User.create({
            username: `user${uniqueId}`,
            email: `test${uniqueId}@ex.com`,
            password_hash: 'hashedpassword'
          });

          const post = await Post.create({
            title: 'Test Post',
            url: 'https://example.com',
            type: 'link',
            author_id: user._id,
            points: 0,
            comment_count: 0
          });

          // Create comments with parent relationships
          const createdComments: IComment[] = [];
          
          for (let i = 0; i < commentData.length; i++) {
            const data = commentData[i];
            
            // Determine parent_id
            let parent_id = null;
            if (data.parentIndex !== null && data.parentIndex < createdComments.length) {
              parent_id = createdComments[data.parentIndex]._id;
            }

            const comment = await Comment.create({
              content: data.content,
              post_id: post._id,
              parent_id,
              author_id: user._id,
              points: 0,
              is_deleted: false
            });

            createdComments.push(comment);
          }

          // Build comment tree
          const tree = buildCommentTree(createdComments);

          // Verify all comments are reachable in the tree
          const commentsInTree = collectAllCommentsFromTree(tree);
          
          // Check that all created comments are in the tree
          expect(commentsInTree.length).toBe(createdComments.length);
          
          // Verify each comment is reachable
          for (const comment of createdComments) {
            const reachable = isCommentReachable(comment._id.toString(), tree);
            expect(reachable).toBe(true);
          }

          // Verify tree structure integrity: each comment should have correct parent relationship
          for (const comment of createdComments) {
            if (comment.parent_id === null) {
              // Should be at root level
              const foundAtRoot = tree.some(node => 
                node.comment._id.toString() === comment._id.toString()
              );
              expect(foundAtRoot).toBe(true);
            } else {
              // Should be in parent's replies
              const parent = createdComments.find(c => 
                c._id.toString() === comment.parent_id!.toString()
              );
              if (parent) {
                // Find parent node in tree and verify comment is in its replies
                const parentReachable = isCommentReachable(parent._id.toString(), tree);
                expect(parentReachable).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
