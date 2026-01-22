import { Schema, model, Document, Types } from 'mongoose';

/**
 * Notification interface representing the notification document structure
 */
export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient_id: Types.ObjectId;
  sender_id: Types.ObjectId;
  type: 'comment_reply' | 'post_comment';
  post_id: Types.ObjectId;
  comment_id?: Types.ObjectId;
  is_read: boolean;
  created_at: Date;
}

/**
 * Notification schema definition
 * Stores notifications for user interactions (replies on comments/posts)
 */
const NotificationSchema = new Schema<INotification>({
  recipient_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient ID is required'],
    index: true,
  },
  sender_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required'],
  },
  type: {
    type: String,
    enum: {
      values: ['comment_reply', 'post_comment'],
      message: 'Type must be either "comment_reply" or "post_comment"',
    },
    required: [true, 'Type is required'],
  },
  post_id: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post ID is required'],
  },
  comment_id: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries (finding unread notifications for a user)
NotificationSchema.index({ recipient_id: 1, is_read: 1, created_at: -1 });

/**
 * Notification model
 * Handles user notifications for comments and replies
 */
export const Notification = model<INotification>('Notification', NotificationSchema);
