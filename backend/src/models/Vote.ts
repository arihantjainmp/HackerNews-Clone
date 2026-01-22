import { Schema, model, Document, Types } from 'mongoose';

/**
 * Vote interface representing the vote document structure
 */
export interface IVote extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  target_id: Types.ObjectId;
  target_type: 'post' | 'comment';
  direction: 1 | -1;
  created_at: Date;
}

/**
 * Vote schema definition
 * Stores user votes on posts and comments with direction (upvote/downvote)
 */
const VoteSchema = new Schema<IVote>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  target_id: {
    type: Schema.Types.ObjectId,
    required: [true, 'Target ID is required'],
    index: true,
  },
  target_type: {
    type: String,
    enum: {
      values: ['post', 'comment'],
      message: 'Target type must be either "post" or "comment"',
    },
    required: [true, 'Target type is required'],
  },
  direction: {
    type: Number,
    enum: {
      values: [1, -1],
      message: 'Direction must be either 1 (upvote) or -1 (downvote)',
    },
    required: [true, 'Direction is required'],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index: One vote per user per target (prevents duplicate votes)
VoteSchema.index({ user_id: 1, target_id: 1 }, { unique: true });

/**
 * Vote model
 * Handles user voting on posts and comments with duplicate prevention
 */
export const Vote = model<IVote>('Vote', VoteSchema);
