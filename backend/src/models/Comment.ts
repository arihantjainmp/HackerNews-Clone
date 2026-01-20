import { Schema, model, Document, Types } from 'mongoose';

/**
 * Comment interface representing the comment document structure
 */
export interface IComment extends Document {
  _id: Types.ObjectId;
  content: string;
  post_id: Types.ObjectId;
  parent_id: Types.ObjectId | null;
  author_id: Types.ObjectId;
  points: number;
  created_at: Date;
  edited_at?: Date;
  is_deleted: boolean;
}

/**
 * Comment schema definition
 * Stores user comments on posts with support for nested replies
 */
const CommentSchema = new Schema<IComment>({
  content: {
    type: String,
    required: [true, 'Content is required'],
    minlength: [1, 'Content must be at least 1 character'],
    maxlength: [10000, 'Content must not exceed 10000 characters']
  },
  post_id: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post ID is required'],
    index: true
  },
  parent_id: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
  author_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author ID is required']
  },
  points: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  edited_at: {
    type: Date
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
});

// Compound index for efficient tree queries (finding comments by post and parent)
CommentSchema.index({ post_id: 1, parent_id: 1 });

// Index for retrieving comments by post ordered by creation time
CommentSchema.index({ post_id: 1, created_at: -1 });

/**
 * Comment model
 * Handles user comments with support for nested replies and soft deletion
 */
export const Comment = model<IComment>('Comment', CommentSchema);
