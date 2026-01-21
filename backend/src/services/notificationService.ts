import { Notification } from '../models/Notification';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { Types } from 'mongoose';
import { ValidationError, NotFoundError } from '../utils/errors';

/**
 * Notification Service
 * Handles notification creation, retrieval, and marking as read
 */

/**
 * Notification response interface with populated data
 */
export interface INotificationResponse {
  _id: string;
  recipient_id: string;
  sender: {
    _id: string;
    username: string;
  };
  type: 'comment_reply' | 'post_comment';
  post: {
    _id: string;
    title: string;
  };
  comment?: {
    _id: string;
    content: string;
  };
  is_read: boolean;
  created_at: Date;
}

/**
 * Create a notification when someone comments on a post
 * Only creates notification if the commenter is not the post author
 * 
 * @param postId - The ID of the post that was commented on
 * @param commentId - The ID of the new comment
 * @param senderId - The ID of the user who created the comment
 */
export async function createPostCommentNotification(
  postId: string,
  commentId: string,
  senderId: string
): Promise<void> {
  // Validate ObjectIds
  if (!Types.ObjectId.isValid(postId)) {
    throw new ValidationError('Invalid post ID');
  }
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ValidationError('Invalid comment ID');
  }
  if (!Types.ObjectId.isValid(senderId)) {
    throw new ValidationError('Invalid sender ID');
  }

  // Get the post to find the author
  const post = await Post.findById(postId);
  if (!post) {
    throw new NotFoundError('Post not found');
  }

  // Don't create notification if user is commenting on their own post
  if (post.author_id.toString() === senderId) {
    return;
  }

  // Create notification
  await Notification.create({
    recipient_id: post.author_id,
    sender_id: new Types.ObjectId(senderId),
    type: 'post_comment',
    post_id: new Types.ObjectId(postId),
    comment_id: new Types.ObjectId(commentId),
    is_read: false,
    created_at: new Date()
  });
}

/**
 * Create a notification when someone replies to a comment
 * Only creates notification if the replier is not the comment author
 * 
 * @param parentCommentId - The ID of the comment that was replied to
 * @param replyId - The ID of the new reply
 * @param postId - The ID of the post
 * @param senderId - The ID of the user who created the reply
 */
export async function createCommentReplyNotification(
  parentCommentId: string,
  replyId: string,
  postId: string,
  senderId: string
): Promise<void> {
  // Validate ObjectIds
  if (!Types.ObjectId.isValid(parentCommentId)) {
    throw new ValidationError('Invalid parent comment ID');
  }
  if (!Types.ObjectId.isValid(replyId)) {
    throw new ValidationError('Invalid reply ID');
  }
  if (!Types.ObjectId.isValid(postId)) {
    throw new ValidationError('Invalid post ID');
  }
  if (!Types.ObjectId.isValid(senderId)) {
    throw new ValidationError('Invalid sender ID');
  }

  // Get the parent comment to find the author
  const parentComment = await Comment.findById(parentCommentId);
  if (!parentComment) {
    throw new NotFoundError('Parent comment not found');
  }

  // Don't create notification if user is replying to their own comment
  if (parentComment.author_id.toString() === senderId) {
    return;
  }

  // Create notification
  await Notification.create({
    recipient_id: parentComment.author_id,
    sender_id: new Types.ObjectId(senderId),
    type: 'comment_reply',
    post_id: new Types.ObjectId(postId),
    comment_id: new Types.ObjectId(replyId),
    is_read: false,
    created_at: new Date()
  });
}

/**
 * Get all notifications for a user
 * Returns notifications sorted by creation date (newest first)
 * Populates sender and post data
 * 
 * @param userId - The ID of the user
 * @param unreadOnly - If true, only return unread notifications
 * @returns Array of notifications with populated data
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<INotificationResponse[]> {
  // Validate ObjectId
  if (!Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  // Build query filter
  const filter: any = { recipient_id: new Types.ObjectId(userId) };
  if (unreadOnly) {
    filter.is_read = false;
  }

  // Fetch notifications with populated data
  const notifications = await Notification.find(filter)
    .populate('sender_id', 'username')
    .populate('post_id', 'title')
    .populate('comment_id', 'content')
    .sort({ created_at: -1 })
    .lean()
    .exec();

  // Transform to response format
  return notifications.map((notification: any) => ({
    _id: notification._id.toString(),
    recipient_id: notification.recipient_id.toString(),
    sender: {
      _id: notification.sender_id._id.toString(),
      username: notification.sender_id.username
    },
    type: notification.type,
    post: {
      _id: notification.post_id._id.toString(),
      title: notification.post_id.title
    },
    comment: notification.comment_id ? {
      _id: notification.comment_id._id.toString(),
      content: notification.comment_id.content
    } : undefined,
    is_read: notification.is_read,
    created_at: notification.created_at
  }));
}

/**
 * Mark a notification as read
 * 
 * @param notificationId - The ID of the notification
 * @param userId - The ID of the user (to verify ownership)
 * @throws NotFoundError if notification doesn't exist or doesn't belong to user
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  // Validate ObjectIds
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new ValidationError('Invalid notification ID');
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  // Find and update notification
  const notification = await Notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificationId),
      recipient_id: new Types.ObjectId(userId)
    },
    { is_read: true },
    { new: true }
  );

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }
}

/**
 * Mark all notifications as read for a user
 * 
 * @param userId - The ID of the user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  // Validate ObjectId
  if (!Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  await Notification.updateMany(
    { recipient_id: new Types.ObjectId(userId), is_read: false },
    { is_read: true }
  );
}

/**
 * Get unread notification count for a user
 * 
 * @param userId - The ID of the user
 * @returns Number of unread notifications
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  // Validate ObjectId
  if (!Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  return await Notification.countDocuments({
    recipient_id: new Types.ObjectId(userId),
    is_read: false
  });
}
