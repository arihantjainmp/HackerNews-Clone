import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createComment, createReply, editComment, deleteComment, ValidationError, NotFoundError, ForbiddenError } from '../commentService';
import { Comment } from '../../models/Comment';
import { Post } from '../../models/Post';
import { User } from '../../models/User';

/**
 * Comment Service Unit Tests
 * Tests comment creation functionality with atomic count updates
 */

let mongoServer: MongoMemoryServer;

beforeEach(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  // Clean up
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Comment Service - Unit Tests', () => {
  describe('createComment', () => {
    it('should create a top-level comment with parent_id = null', async () => {
      // Create test user and post
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      // Create comment
      const comment = await createComment({
        content: 'This is a test comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Verify comment properties
      expect(comment.content).toBe('This is a test comment');
      expect(comment.post_id.toString()).toBe(post._id.toString());
      expect(comment.parent_id).toBeNull();
      expect(comment.author_id.toString()).toBe(user._id.toString());
      expect(comment.points).toBe(0);
      expect(comment.is_deleted).toBe(false);
      expect(comment.created_at).toBeInstanceOf(Date);
    });

    it('should atomically increment post comment_count', async () => {
      // Create test user and post
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const initialCount = post.comment_count;

      // Create comment
      await createComment({
        content: 'Test comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Verify comment_count was incremented
      const updatedPost = await Post.findById(post._id);
      expect(updatedPost!.comment_count).toBe(initialCount + 1);
    });

    it('should reject empty content', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      await expect(
        createComment({
          content: '',
          postId: post._id.toString(),
          authorId: user._id.toString()
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject whitespace-only content', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      await expect(
        createComment({
          content: '   ',
          postId: post._id.toString(),
          authorId: user._id.toString()
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject content exceeding 10000 characters', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const longContent = 'a'.repeat(10001);

      await expect(
        createComment({
          content: longContent,
          postId: post._id.toString(),
          authorId: user._id.toString()
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent post', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const fakePostId = new mongoose.Types.ObjectId().toString();

      await expect(
        createComment({
          content: 'Test comment',
          postId: fakePostId,
          authorId: user._id.toString()
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createReply', () => {
    it('should create a reply with parent_id set to parent comment', async () => {
      // Create test user and post
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      // Create parent comment
      const parentComment = await createComment({
        content: 'Parent comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Create reply
      const reply = await createReply({
        content: 'This is a reply',
        parentId: parentComment._id.toString(),
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Verify reply properties
      expect(reply.content).toBe('This is a reply');
      expect(reply.post_id.toString()).toBe(post._id.toString());
      expect(reply.parent_id!.toString()).toBe(parentComment._id.toString());
      expect(reply.author_id.toString()).toBe(user._id.toString());
      expect(reply.points).toBe(0);
      expect(reply.is_deleted).toBe(false);
    });

    it('should atomically increment post comment_count for replies', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const parentComment = await createComment({
        content: 'Parent comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      const postAfterParent = await Post.findById(post._id);
      const countAfterParent = postAfterParent!.comment_count;

      // Create reply
      await createReply({
        content: 'Reply',
        parentId: parentComment._id.toString(),
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Verify comment_count was incremented again
      const updatedPost = await Post.findById(post._id);
      expect(updatedPost!.comment_count).toBe(countAfterParent + 1);
    });

    it('should reject empty content for replies', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const parentComment = await createComment({
        content: 'Parent comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      await expect(
        createReply({
          content: '',
          parentId: parentComment._id.toString(),
          postId: post._id.toString(),
          authorId: user._id.toString()
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent parent comment', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const fakeCommentId = new mongoose.Types.ObjectId().toString();

      await expect(
        createReply({
          content: 'Reply',
          parentId: fakeCommentId,
          postId: post._id.toString(),
          authorId: user._id.toString()
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent post', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const parentComment = await createComment({
        content: 'Parent comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      const fakePostId = new mongoose.Types.ObjectId().toString();

      await expect(
        createReply({
          content: 'Reply',
          parentId: parentComment._id.toString(),
          postId: fakePostId,
          authorId: user._id.toString()
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('editComment', () => {
    it('should update comment content and set edited_at timestamp', async () => {
      // Create test user and post
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      // Create comment
      const comment = await createComment({
        content: 'Original content',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Verify edited_at is not set initially
      expect(comment.edited_at).toBeUndefined();

      // Edit the comment
      const updatedComment = await editComment(
        comment._id.toString(),
        'Updated content',
        user._id.toString()
      );

      // Verify content was updated
      expect(updatedComment.content).toBe('Updated content');
      
      // Verify edited_at was set
      expect(updatedComment.edited_at).toBeInstanceOf(Date);
      expect(updatedComment.edited_at!.getTime()).toBeGreaterThan(comment.created_at.getTime());
    });

    it('should throw ForbiddenError when user is not the comment author', async () => {
      // Create two users
      const author = await User.create({
        username: 'author',
        email: 'author@example.com',
        password_hash: 'hashedpassword'
      });

      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: author._id
      });

      // Create comment as author
      const comment = await createComment({
        content: 'Original content',
        postId: post._id.toString(),
        authorId: author._id.toString()
      });

      // Try to edit as different user
      await expect(
        editComment(
          comment._id.toString(),
          'Malicious edit',
          otherUser._id.toString()
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should validate new content using same rules as creation', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const comment = await createComment({
        content: 'Original content',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Test empty content
      await expect(
        editComment(comment._id.toString(), '', user._id.toString())
      ).rejects.toThrow(ValidationError);

      // Test whitespace-only content
      await expect(
        editComment(comment._id.toString(), '   ', user._id.toString())
      ).rejects.toThrow(ValidationError);

      // Test content exceeding 10000 characters
      const longContent = 'a'.repeat(10001);
      await expect(
        editComment(comment._id.toString(), longContent, user._id.toString())
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent comment', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const fakeCommentId = new mongoose.Types.ObjectId().toString();

      await expect(
        editComment(fakeCommentId, 'New content', user._id.toString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid comment ID', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      await expect(
        editComment('invalid-id', 'New content', user._id.toString())
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid user ID', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const comment = await createComment({
        content: 'Original content',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      await expect(
        editComment(comment._id.toString(), 'New content', 'invalid-id')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteComment', () => {
    it('should soft delete comment with replies (set is_deleted=true, content="[deleted]")', async () => {
      // Create test user and post
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      // Create parent comment
      const parentComment = await createComment({
        content: 'Parent comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Create reply to the parent comment
      await createReply({
        content: 'Reply to parent',
        parentId: parentComment._id.toString(),
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      const postBeforeDelete = await Post.findById(post._id);
      const commentCountBeforeDelete = postBeforeDelete!.comment_count;

      // Delete the parent comment (should be soft delete because it has replies)
      await deleteComment(parentComment._id.toString(), user._id.toString());

      // Verify comment still exists but is marked as deleted
      const deletedComment = await Comment.findById(parentComment._id);
      expect(deletedComment).not.toBeNull();
      expect(deletedComment!.is_deleted).toBe(true);
      expect(deletedComment!.content).toBe('[deleted]');

      // Verify comment_count was NOT decremented (soft delete)
      const postAfterDelete = await Post.findById(post._id);
      expect(postAfterDelete!.comment_count).toBe(commentCountBeforeDelete);
    });

    it('should hard delete comment without replies and decrement comment_count', async () => {
      // Create test user and post
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      // Create comment without replies
      const comment = await createComment({
        content: 'Comment without replies',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      const postBeforeDelete = await Post.findById(post._id);
      const commentCountBeforeDelete = postBeforeDelete!.comment_count;

      // Delete the comment (should be hard delete because it has no replies)
      await deleteComment(comment._id.toString(), user._id.toString());

      // Verify comment was actually deleted from database
      const deletedComment = await Comment.findById(comment._id);
      expect(deletedComment).toBeNull();

      // Verify comment_count was decremented
      const postAfterDelete = await Post.findById(post._id);
      expect(postAfterDelete!.comment_count).toBe(commentCountBeforeDelete - 1);
    });

    it('should throw ForbiddenError when user is not the comment author', async () => {
      // Create two users
      const author = await User.create({
        username: 'author',
        email: 'author@example.com',
        password_hash: 'hashedpassword'
      });

      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: author._id
      });

      // Create comment as author
      const comment = await createComment({
        content: 'Original content',
        postId: post._id.toString(),
        authorId: author._id.toString()
      });

      // Try to delete as different user
      await expect(
        deleteComment(comment._id.toString(), otherUser._id.toString())
      ).rejects.toThrow(ForbiddenError);

      // Verify comment was not deleted
      const stillExistingComment = await Comment.findById(comment._id);
      expect(stillExistingComment).not.toBeNull();
      expect(stillExistingComment!.is_deleted).toBe(false);
    });

    it('should throw NotFoundError for non-existent comment', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const fakeCommentId = new mongoose.Types.ObjectId().toString();

      await expect(
        deleteComment(fakeCommentId, user._id.toString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid comment ID', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      await expect(
        deleteComment('invalid-id', user._id.toString())
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid user ID', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const comment = await createComment({
        content: 'Test comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      await expect(
        deleteComment(comment._id.toString(), 'invalid-id')
      ).rejects.toThrow(ValidationError);
    });

    it('should complete deletion operation successfully', async () => {
      // This test verifies that the deletion operation completes successfully
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      });

      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id
      });

      const comment = await createComment({
        content: 'Test comment',
        postId: post._id.toString(),
        authorId: user._id.toString()
      });

      // Verify the operation completes successfully
      await expect(
        deleteComment(comment._id.toString(), user._id.toString())
      ).resolves.not.toThrow();

      // Verify comment was deleted
      const deletedComment = await Comment.findById(comment._id);
      expect(deletedComment).toBeNull();
    });
  });
});
