import { Post } from '../Post';
import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';

describe('Post Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid link post', async () => {
      const postData = {
        title: 'Test Link Post',
        url: 'https://example.com',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      await expect(post.validate()).resolves.not.toThrow();
      
      expect(post.type).toBe('link');
      expect(post.points).toBe(0);
      expect(post.comment_count).toBe(0);
    });

    it('should create a valid text post', async () => {
      const postData = {
        title: 'Test Text Post',
        text: 'This is some text content',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      await expect(post.validate()).resolves.not.toThrow();
      
      expect(post.type).toBe('text');
      expect(post.points).toBe(0);
      expect(post.comment_count).toBe(0);
    });

    it('should reject post with both url and text', async () => {
      const postData = {
        title: 'Invalid Post',
        url: 'https://example.com',
        text: 'Some text',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      
      await expect(post.validate()).rejects.toThrow('either url or text, but not both');
    });

    it('should reject post with neither url nor text', async () => {
      const postData = {
        title: 'Invalid Post',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      
      await expect(post.validate()).rejects.toThrow('must have either url or text');
    });

    it('should reject title shorter than 1 character', async () => {
      const postData = {
        title: '',
        url: 'https://example.com',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      const error = post.validateSync();

      expect(error).toBeDefined();
      expect(error?.errors?.title).toBeDefined();
    });

    it('should reject title longer than 300 characters', async () => {
      const postData = {
        title: 'a'.repeat(301),
        url: 'https://example.com',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      const error = post.validateSync();

      expect(error).toBeDefined();
      expect(error?.errors?.title).toBeDefined();
    });

    it('should reject invalid URL format', async () => {
      const postData = {
        title: 'Test Post',
        url: 'not-a-valid-url',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      const error = post.validateSync();

      expect(error).toBeDefined();
      expect(error?.errors?.url).toBeDefined();
    });

    it('should accept valid http URL', async () => {
      const postData = {
        title: 'Test Post',
        url: 'http://example.com',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      const error = post.validateSync();

      expect(error).toBeUndefined();
    });

    it('should accept valid https URL', async () => {
      const postData = {
        title: 'Test Post',
        url: 'https://example.com',
        author_id: new Types.ObjectId(),
      };

      const post = new Post(postData);
      const error = post.validateSync();

      expect(error).toBeUndefined();
    });
  });
});
