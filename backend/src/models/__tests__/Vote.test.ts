import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { Vote } from '../Vote';

describe('Vote Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid upvote on a post', () => {
      const userId = new mongoose.Types.ObjectId();
      const targetId = new mongoose.Types.ObjectId();

      const vote = new Vote({
        user_id: userId,
        target_id: targetId,
        target_type: 'post',
        direction: 1
      });

      const error = vote.validateSync();
      expect(error).toBeUndefined();
      expect(vote.user_id).toEqual(userId);
      expect(vote.target_id).toEqual(targetId);
      expect(vote.target_type).toBe('post');
      expect(vote.direction).toBe(1);
      expect(vote.created_at).toBeInstanceOf(Date);
    });

    it('should create a valid downvote on a comment', () => {
      const userId = new mongoose.Types.ObjectId();
      const targetId = new mongoose.Types.ObjectId();

      const vote = new Vote({
        user_id: userId,
        target_id: targetId,
        target_type: 'comment',
        direction: -1
      });

      const error = vote.validateSync();
      expect(error).toBeUndefined();
      expect(vote.target_type).toBe('comment');
      expect(vote.direction).toBe(-1);
    });

    it('should automatically set created_at timestamp', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'post',
        direction: 1
      });

      expect(vote.created_at).toBeInstanceOf(Date);
      expect(vote.created_at.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Target Type Validation', () => {
    it('should accept "post" as target_type', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'post',
        direction: 1
      });

      const error = vote.validateSync();
      expect(error).toBeUndefined();
      expect(vote.target_type).toBe('post');
    });

    it('should accept "comment" as target_type', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'comment',
        direction: 1
      });

      const error = vote.validateSync();
      expect(error).toBeUndefined();
      expect(vote.target_type).toBe('comment');
    });

    it('should reject invalid target_type', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'invalid' as any,
        direction: 1
      });

      const error = vote.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.target_type).toBeDefined();
      expect(error?.errors?.target_type.message).toMatch(/Target type must be either "post" or "comment"/);
    });

    it('should require target_type field', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        direction: 1
      });

      const error = vote.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.target_type).toBeDefined();
      expect(error?.errors?.target_type.message).toMatch(/Target type is required/);
    });
  });

  describe('Direction Validation', () => {
    it('should accept 1 as direction (upvote)', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'post',
        direction: 1
      });

      const error = vote.validateSync();
      expect(error).toBeUndefined();
      expect(vote.direction).toBe(1);
    });

    it('should accept -1 as direction (downvote)', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'post',
        direction: -1
      });

      const error = vote.validateSync();
      expect(error).toBeUndefined();
      expect(vote.direction).toBe(-1);
    });

    it('should reject 0 as direction', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'post',
        direction: 0 as any
      });

      const error = vote.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.direction).toBeDefined();
      expect(error?.errors?.direction.message).toMatch(/Direction must be either 1 \(upvote\) or -1 \(downvote\)/);
    });

    it('should reject 2 as direction', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'post',
        direction: 2 as any
      });

      const error = vote.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.direction).toBeDefined();
      expect(error?.errors?.direction.message).toMatch(/Direction must be either 1 \(upvote\) or -1 \(downvote\)/);
    });

    it('should require direction field', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'post'
      });

      const error = vote.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.direction).toBeDefined();
      expect(error?.errors?.direction.message).toMatch(/Direction is required/);
    });
  });

  describe('Required Fields', () => {
    it('should require user_id field', () => {
      const vote = new Vote({
        target_id: new mongoose.Types.ObjectId(),
        target_type: 'post',
        direction: 1
      });

      const error = vote.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.user_id).toBeDefined();
      expect(error?.errors?.user_id.message).toMatch(/User ID is required/);
    });

    it('should require target_id field', () => {
      const vote = new Vote({
        user_id: new mongoose.Types.ObjectId(),
        target_type: 'post',
        direction: 1
      });

      const error = vote.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.target_id).toBeDefined();
      expect(error?.errors?.target_id.message).toMatch(/Target ID is required/);
    });
  });

  describe('Indexes', () => {
    it('should have compound unique index on user_id and target_id', () => {
      const indexes = Vote.schema.indexes();
      const compoundIndex = indexes.find(idx => 
        idx[0].user_id !== undefined && idx[0].target_id !== undefined
      );
      
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex?.[1]?.unique).toBe(true);
    });

    it('should have index on user_id', () => {
      const indexes = Vote.schema.indexes();
      const userIdIndex = indexes.find(idx => 
        idx[0].user_id !== undefined
      );
      expect(userIdIndex).toBeDefined();
    });

    it('should have index on target_id', () => {
      const indexes = Vote.schema.indexes();
      const targetIdIndex = indexes.find(idx => 
        idx[0].target_id !== undefined
      );
      expect(targetIdIndex).toBeDefined();
    });
  });
});
