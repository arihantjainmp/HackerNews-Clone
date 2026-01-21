import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import { handleVote, voteOnPost, voteOnComment } from '../voteService';
import { Vote } from '../../models/Vote';
import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';
import { User } from '../../models/User';

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
  // Clear all collections before each test
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await Vote.deleteMany({});
});

/**
 * Helper function to create a unique test user with valid constraints
 */
async function createTestUser() {
  const uniqueId = Math.random().toString(36).substring(2, 10);
  return await User.create({
    username: `u${uniqueId}`,
    email: `${uniqueId}@test.com`,
    password_hash: 'hashedpassword'
  });
}

describe('Property-Based Tests: Vote State Transitions', () => {
  /**
   * Feature: hacker-news-clone, Property 17: Vote State Transition - No Vote to Upvote
   * For any post or comment with no existing vote from a user, when that user upvotes,
   * the target's points should increase by exactly 1 and a vote record with direction 1 should be created.
   * **Validates: Requirements 5.1, 8.1**
   */
  it('Property 17: No vote to upvote should increase points by 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('post', 'comment'),
        fc.integer({ min: -100, max: 100 }), // Initial points
        async (targetType, initialPoints) => {
          // Create test user
          const user = await createTestUser();

          // Create target (post or comment)
          let target;
          if (targetType === 'post') {
            target = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: initialPoints,
              comment_count: 0
            });
          } else {
            const post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });
            target = await Comment.create({
              content: 'Test comment',
              post_id: post._id,
              parent_id: null,
              author_id: user._id,
              points: initialPoints
            });
          }

          // Perform upvote
          const result = await handleVote(
            user._id.toString(),
            target._id.toString(),
            targetType,
            1
          );

          // Verify points increased by 1
          expect(result.points).toBe(initialPoints + 1);
          expect(result.userVote).toBe(1);

          // Verify vote record was created
          const vote = await Vote.findOne({
            user_id: user._id,
            target_id: target._id
          });
          expect(vote).toBeTruthy();
          expect(vote?.direction).toBe(1);
          expect(vote?.target_type).toBe(targetType);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 18: Vote State Transition - No Vote to Downvote
   * For any post or comment with no existing vote from a user, when that user downvotes,
   * the target's points should decrease by exactly 1 and a vote record with direction -1 should be created.
   * **Validates: Requirements 5.2, 8.2**
   */
  it('Property 18: No vote to downvote should decrease points by 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('post', 'comment'),
        fc.integer({ min: -100, max: 100 }), // Initial points
        async (targetType, initialPoints) => {
          // Create test user
          const user = await createTestUser();

          // Create target (post or comment)
          let target;
          if (targetType === 'post') {
            target = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: initialPoints,
              comment_count: 0
            });
          } else {
            const post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });
            target = await Comment.create({
              content: 'Test comment',
              post_id: post._id,
              parent_id: null,
              author_id: user._id,
              points: initialPoints
            });
          }

          // Perform downvote
          const result = await handleVote(
            user._id.toString(),
            target._id.toString(),
            targetType,
            -1
          );

          // Verify points decreased by 1
          expect(result.points).toBe(initialPoints - 1);
          expect(result.userVote).toBe(-1);

          // Verify vote record was created
          const vote = await Vote.findOne({
            user_id: user._id,
            target_id: target._id
          });
          expect(vote).toBeTruthy();
          expect(vote?.direction).toBe(-1);
          expect(vote?.target_type).toBe(targetType);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 19: Vote Toggle
   * For any post or comment where a user has already voted in a direction (up or down),
   * voting again in the same direction should toggle off the vote (remove it).
   * **Validates: Requirements 5.3, 5.6, 8.3, 8.6**
   */
  it('Property 19: Voting in same direction should toggle off the vote', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('post', 'comment'),
        fc.constantFrom(1, -1), // Initial vote direction
        fc.integer({ min: -100, max: 100 }), // Initial points
        async (targetType, initialDirection, initialPoints) => {
          // Create test user
          const user = await createTestUser();

          // Create target (post or comment)
          let target;
          if (targetType === 'post') {
            target = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: initialPoints,
              comment_count: 0
            });
          } else {
            const post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });
            target = await Comment.create({
              content: 'Test comment',
              post_id: post._id,
              parent_id: null,
              author_id: user._id,
              points: initialPoints
            });
          }

          // First vote
          const firstResult = await handleVote(
            user._id.toString(),
            target._id.toString(),
            targetType,
            initialDirection
          );

          const pointsAfterFirstVote = firstResult.points;

          // Second vote in same direction (should toggle off)
          const secondResult = await handleVote(
            user._id.toString(),
            target._id.toString(),
            targetType,
            initialDirection
          );

          // Verify points returned to original value
          expect(secondResult.points).toBe(pointsAfterFirstVote - initialDirection);
          expect(secondResult.userVote).toBe(0);

          // Verify vote record was deleted
          const votes = await Vote.find({
            user_id: user._id,
            target_id: target._id
          });
          expect(votes).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 20: Vote State Transition - Upvote to Downvote
   * For any post or comment where a user has upvoted, when that user downvotes,
   * the target's points should decrease by exactly 2 and the vote record should be updated to direction -1.
   * **Validates: Requirements 5.4, 8.4**
   */
  it('Property 20: Upvote to downvote should decrease points by 2', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('post', 'comment'),
        fc.integer({ min: -100, max: 100 }), // Initial points
        async (targetType, initialPoints) => {
          // Create test user
          const user = await createTestUser();

          // Create target (post or comment)
          let target;
          if (targetType === 'post') {
            target = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: initialPoints,
              comment_count: 0
            });
          } else {
            const post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });
            target = await Comment.create({
              content: 'Test comment',
              post_id: post._id,
              parent_id: null,
              author_id: user._id,
              points: initialPoints
            });
          }

          // First upvote
          const upvoteResult = await handleVote(
            user._id.toString(),
            target._id.toString(),
            targetType,
            1
          );

          const pointsAfterUpvote = upvoteResult.points;

          // Switch to downvote
          const downvoteResult = await handleVote(
            user._id.toString(),
            target._id.toString(),
            targetType,
            -1
          );

          // Verify points decreased by 2
          expect(downvoteResult.points).toBe(pointsAfterUpvote - 2);
          expect(downvoteResult.userVote).toBe(-1);

          // Verify vote record was updated
          const vote = await Vote.findOne({
            user_id: user._id,
            target_id: target._id
          });
          expect(vote).toBeTruthy();
          expect(vote?.direction).toBe(-1);

          // Verify only one vote record exists
          const votes = await Vote.find({
            user_id: user._id,
            target_id: target._id
          });
          expect(votes).toHaveLength(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 21: Vote State Transition - Downvote to Upvote
   * For any post or comment where a user has downvoted, when that user upvotes,
   * the target's points should increase by exactly 2 and the vote record should be updated to direction 1.
   * **Validates: Requirements 5.5, 8.5**
   */
  it('Property 21: Downvote to upvote should increase points by 2', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('post', 'comment'),
        fc.integer({ min: -100, max: 100 }), // Initial points
        async (targetType, initialPoints) => {
          // Create test user
          const user = await createTestUser();

          // Create target (post or comment)
          let target;
          if (targetType === 'post') {
            target = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: initialPoints,
              comment_count: 0
            });
          } else {
            const post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: user._id,
              points: 0,
              comment_count: 0
            });
            target = await Comment.create({
              content: 'Test comment',
              post_id: post._id,
              parent_id: null,
              author_id: user._id,
              points: initialPoints
            });
          }

          // First downvote
          const downvoteResult = await handleVote(
            user._id.toString(),
            target._id.toString(),
            targetType,
            -1
          );

          const pointsAfterDownvote = downvoteResult.points;

          // Switch to upvote
          const upvoteResult = await handleVote(
            user._id.toString(),
            target._id.toString(),
            targetType,
            1
          );

          // Verify points increased by 2
          expect(upvoteResult.points).toBe(pointsAfterDownvote + 2);
          expect(upvoteResult.userVote).toBe(1);

          // Verify vote record was updated
          const vote = await Vote.findOne({
            user_id: user._id,
            target_id: target._id
          });
          expect(vote).toBeTruthy();
          expect(vote?.direction).toBe(1);

          // Verify only one vote record exists
          const votes = await Vote.find({
            user_id: user._id,
            target_id: target._id
          });
          expect(votes).toHaveLength(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 22: Points Reflect Vote Sum
   * For any post or comment, the points value should always equal the sum of all vote directions
   * (where upvote = +1, downvote = -1) for that target.
   * **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 8.1, 8.2, 8.4, 8.5**
   */
  it('Property 22: Points should always equal sum of all vote directions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('post', 'comment'),
        fc.array(fc.constantFrom(1, -1), { minLength: 1, maxLength: 20 }), // Array of vote directions
        async (targetType, voteDirections) => {
          // Create author user
          const author = await createTestUser();

          // Create target (post or comment)
          let target;
          if (targetType === 'post') {
            target = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: author._id,
              points: 0,
              comment_count: 0
            });
          } else {
            const post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: author._id,
              points: 0,
              comment_count: 0
            });
            target = await Comment.create({
              content: 'Test comment',
              post_id: post._id,
              parent_id: null,
              author_id: author._id,
              points: 0
            });
          }

          // Create unique users for each vote and cast votes
          const voters = [];
          for (let i = 0; i < voteDirections.length; i++) {
            const voter = await createTestUser();
            voters.push(voter);
            await handleVote(
              voter._id.toString(),
              target._id.toString(),
              targetType,
              voteDirections[i]
            );
          }

          // Calculate expected sum
          const expectedSum = voteDirections.reduce((sum, dir) => sum + dir, 0);

          // Verify points equal the sum of all votes
          const Model = targetType === 'post' ? Post : Comment;
          const updatedTarget = await Model.findById(target._id);
          expect(updatedTarget?.points).toBe(expectedSum);

          // Verify all votes were recorded
          const votes = await Vote.find({ target_id: target._id });
          expect(votes).toHaveLength(voteDirections.length);

          // Verify the sum of recorded votes matches
          const recordedSum = votes.reduce((sum, vote) => sum + vote.direction, 0);
          expect(recordedSum).toBe(expectedSum);
          expect(updatedTarget?.points).toBe(recordedSum);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: hacker-news-clone, Property 22: Points Reflect Vote Sum (Concurrent Voting)
   * Test with concurrent votes to verify atomicity - points should still equal sum of all votes
   * even when votes are cast simultaneously.
   * **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 8.1, 8.2, 8.4, 8.5**
   */
  it('Property 22: Points should equal vote sum even with concurrent votes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('post', 'comment'),
        fc.array(fc.constantFrom(1, -1), { minLength: 5, maxLength: 15 }), // Array of vote directions
        async (targetType, voteDirections) => {
          // Create author user
          const author = await createTestUser();

          // Create target (post or comment)
          let target;
          if (targetType === 'post') {
            target = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: author._id,
              points: 0,
              comment_count: 0
            });
          } else {
            const post = await Post.create({
              title: 'Test Post',
              url: 'https://example.com',
              type: 'link',
              author_id: author._id,
              points: 0,
              comment_count: 0
            });
            target = await Comment.create({
              content: 'Test comment',
              post_id: post._id,
              parent_id: null,
              author_id: author._id,
              points: 0
            });
          }

          // Create unique users for each vote
          const voters = [];
          for (let i = 0; i < voteDirections.length; i++) {
            const voter = await createTestUser();
            voters.push(voter);
          }

          // Cast all votes concurrently using Promise.all
          await Promise.all(
            voters.map((voter, index) =>
              handleVote(
                voter._id.toString(),
                target._id.toString(),
                targetType,
                voteDirections[index]
              )
            )
          );

          // Calculate expected sum
          const expectedSum = voteDirections.reduce((sum, dir) => sum + dir, 0);

          // Verify points equal the sum of all votes (atomicity check)
          const Model = targetType === 'post' ? Post : Comment;
          const updatedTarget = await Model.findById(target._id);
          expect(updatedTarget?.points).toBe(expectedSum);

          // Verify all votes were recorded
          const votes = await Vote.find({ target_id: target._id });
          expect(votes).toHaveLength(voteDirections.length);

          // Verify the sum of recorded votes matches
          const recordedSum = votes.reduce((sum, vote) => sum + vote.direction, 0);
          expect(recordedSum).toBe(expectedSum);
          expect(updatedTarget?.points).toBe(recordedSum);
        }
      ),
      { numRuns: 100 }
    );
  });
});
