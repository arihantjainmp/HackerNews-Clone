import { Comment } from '../Comment';
import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';

describe('Comment Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid top-level comment', async () => {
      const commentData = {
        content: 'This is a test comment',
        post_id: new Types.ObjectId(),
        parent_id: null,
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      await expect(comment.validate()).resolves.not.toThrow();
      
      expect(comment.points).toBe(0);
      expect(comment.is_deleted).toBe(false);
      expect(comment.parent_id).toBeNull();
    });

    it('should create a valid reply comment', async () => {
      const commentData = {
        content: 'This is a reply',
        post_id: new Types.ObjectId(),
        parent_id: new Types.ObjectId(),
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      await expect(comment.validate()).resolves.not.toThrow();
      
      expect(comment.points).toBe(0);
      expect(comment.is_deleted).toBe(false);
      expect(comment.parent_id).toBeDefined();
    });

    it('should reject content shorter than 1 character', async () => {
      const commentData = {
        content: '',
        post_id: new Types.ObjectId(),
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      const error = comment.validateSync();

      expect(error).toBeDefined();
      expect(error?.errors?.content).toBeDefined();
    });

    it('should reject content longer than 10000 characters', async () => {
      const commentData = {
        content: 'a'.repeat(10001),
        post_id: new Types.ObjectId(),
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      const error = comment.validateSync();

      expect(error).toBeDefined();
      expect(error?.errors?.content).toBeDefined();
    });

    it('should accept content at maximum length (10000 characters)', async () => {
      const commentData = {
        content: 'a'.repeat(10000),
        post_id: new Types.ObjectId(),
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      const error = comment.validateSync();

      expect(error).toBeUndefined();
    });

    it('should require post_id', async () => {
      const commentData = {
        content: 'Test comment',
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      const error = comment.validateSync();

      expect(error).toBeDefined();
      expect(error?.errors?.post_id).toBeDefined();
    });

    it('should require author_id', async () => {
      const commentData = {
        content: 'Test comment',
        post_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      const error = comment.validateSync();

      expect(error).toBeDefined();
      expect(error?.errors?.author_id).toBeDefined();
    });

    it('should default parent_id to null', async () => {
      const commentData = {
        content: 'Test comment',
        post_id: new Types.ObjectId(),
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      
      expect(comment.parent_id).toBeNull();
    });

    it('should default points to 0', async () => {
      const commentData = {
        content: 'Test comment',
        post_id: new Types.ObjectId(),
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      
      expect(comment.points).toBe(0);
    });

    it('should default is_deleted to false', async () => {
      const commentData = {
        content: 'Test comment',
        post_id: new Types.ObjectId(),
        author_id: new Types.ObjectId(),
      };

      const comment = new Comment(commentData);
      
      expect(comment.is_deleted).toBe(false);
    });
  });
});
