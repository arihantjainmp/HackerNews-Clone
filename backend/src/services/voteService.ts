import { Vote } from '../models/Vote';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { NotFoundError } from '../utils/errors';
import { cache } from '../utils/cache';

/**
 * Vote Service
 * Handles atomic vote state transitions for posts and comments
 * Uses MongoDB atomic operations to ensure consistency and prevent race conditions
 */

/**
 * Handle vote on a target (post or comment) with atomic state transitions
 * 
 * Vote State Machine:
 * - NO_VOTE → UPVOTE: +1 point
 * - NO_VOTE → DOWNVOTE: -1 point
 * - UPVOTE → UPVOTE: -1 point (toggle off, remove vote)
 * - UPVOTE → DOWNVOTE: -2 points
 * - DOWNVOTE → UPVOTE: +2 points
 * - DOWNVOTE → DOWNVOTE: +1 point (toggle off, remove vote)
 * 
 * @param userId - The ID of the user casting the vote
 * @param targetId - The ID of the post or comment being voted on
 * @param targetType - Either 'post' or 'comment'
 * @param newDirection - 1 for upvote, -1 for downvote
 * @returns The updated points value and user's current vote direction
 * @throws Error if target doesn't exist
 */
export async function handleVote(
  userId: string,
  targetId: string,
  targetType: 'post' | 'comment',
  newDirection: 1 | -1
): Promise<{ points: number; userVote: number }> {
  // Find existing vote for this user on this target
  const existingVote = await Vote.findOne({
    user_id: userId,
    target_id: targetId
  });

  let pointsDelta = 0;
  let finalUserVote: 1 | -1 | 0 = newDirection;

  if (!existingVote) {
    // State transition: NO_VOTE → UPVOTE or NO_VOTE → DOWNVOTE
    pointsDelta = newDirection;
    
    // Create new vote record
    await Vote.create({
      user_id: userId,
      target_id: targetId,
      target_type: targetType,
      direction: newDirection
    });
  } else if (existingVote.direction === newDirection) {
    // State transition: UPVOTE → UPVOTE or DOWNVOTE → DOWNVOTE
    // Toggle off - remove the vote
    pointsDelta = -newDirection;
    finalUserVote = 0 as const;
    
    // Delete the vote record
    await Vote.deleteOne({ _id: existingVote._id });
  } else {
    // State transition: UPVOTE → DOWNVOTE or DOWNVOTE → UPVOTE
    // Calculate delta: new direction - old direction = ±2
    pointsDelta = newDirection - existingVote.direction;
    
    // Update existing vote record
    await Vote.updateOne(
      { _id: existingVote._id },
      { $set: { direction: newDirection } }
    );
  }

  // Atomically update points on target using $inc operator
  // This prevents race conditions from concurrent votes
  const Model = targetType === 'post' ? Post : Comment;
  const updatedTarget = await (Model as any).findByIdAndUpdate(
    targetId,
    { $inc: { points: pointsDelta } },
    { new: true }
  );

  if (!updatedTarget) {
    throw new NotFoundError(`${targetType.charAt(0).toUpperCase() + targetType.slice(1)} not found`);
  }

  // Invalidate cached user vote state
  const voteCacheKey = cache.generateKey('vote', { userId, targetId });
  cache.invalidate(voteCacheKey);

  // If voting on a post, invalidate post list caches since points changed
  if (targetType === 'post') {
    cache.invalidateByPrefix('posts');
  }

  return {
    points: updatedTarget.points,
    userVote: finalUserVote
  };
}

/**
 * Vote on a post
 * 
 * @param userId - The ID of the user casting the vote
 * @param postId - The ID of the post being voted on
 * @param direction - 1 for upvote, -1 for downvote
 * @returns The updated points value and user's current vote direction
 */
export async function voteOnPost(
  userId: string,
  postId: string,
  direction: 1 | -1
): Promise<{ points: number; userVote: number }> {
  return handleVote(userId, postId, 'post', direction);
}

/**
 * Vote on a comment
 * 
 * @param userId - The ID of the user casting the vote
 * @param commentId - The ID of the comment being voted on
 * @param direction - 1 for upvote, -1 for downvote
 * @returns The updated points value and user's current vote direction
 */
export async function voteOnComment(
  userId: string,
  commentId: string,
  direction: 1 | -1
): Promise<{ points: number; userVote: number }> {
  return handleVote(userId, commentId, 'comment', direction);
}

/**
 * Get user's current vote on a target (post or comment)
 * Caches the result to improve performance
 * 
 * @param userId - The ID of the user
 * @param targetId - The ID of the post or comment
 * @returns 1 for upvote, -1 for downvote, 0 for no vote
 */
export async function getUserVote(
  userId: string,
  targetId: string
): Promise<number> {
  // Generate cache key for this user's vote on this target
  const cacheKey = cache.generateKey('vote', { userId, targetId });

  // Check cache first
  const cachedVote = cache.get<number>(cacheKey);
  if (cachedVote !== null) {
    return cachedVote;
  }

  // Fetch from database
  const vote = await Vote.findOne({ user_id: userId, target_id: targetId });
  const voteDirection = vote ? vote.direction : 0;

  // Cache the result for 10 minutes
  cache.set(cacheKey, voteDirection, 10 * 60 * 1000);

  return voteDirection;
}
