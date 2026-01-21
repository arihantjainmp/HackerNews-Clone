import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as notificationService from '../notificationService';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';
import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';

let mongoServer: MongoMemoryServer;

beforeEach(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Notification Service', () => {
  describe('createPostCommentNotification', () => {
    it('should create a notification when someone comments on a post', async () => {
      // Create users
      const postAuthor = await User.create({
        username: 'postauthor',
        email: 'postauthor@test.com',
        password_hash: 'hash123'
      });

      const commenter = await User.create({
        username: 'commenter',
        email: 'commenter@test.com',
        password_hash: 'hash456'
      });

      // Create post
      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: postAuthor._id,
        points: 0,
        comment_count: 0
      });

      // Create comment
      const comment = await Comment.create({
        content: 'Test comment',
        post_id: post._id,
        parent_id: null,
        author_id: commenter._id,
        points: 0
      });

      // Create notification
      await notificationService.createPostCommentNotification(
        post._id.toString(),
        comment._id.toString(),
        commenter._id.toString()
      );

      // Verify notification was created
      const notifications = await Notification.find({ recipient_id: postAuthor._id });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('post_comment');
      expect(notifications[0].sender_id.toString()).toBe(commenter._id.toString());
      expect(notifications[0].is_read).toBe(false);
    });

    it('should not create notification if user comments on their own post', async () => {
      // Create user
      const user = await User.create({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash123'
      });

      // Create post
      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id,
        points: 0,
        comment_count: 0
      });

      // Create comment by same user
      const comment = await Comment.create({
        content: 'Test comment',
        post_id: post._id,
        parent_id: null,
        author_id: user._id,
        points: 0
      });

      // Try to create notification
      await notificationService.createPostCommentNotification(
        post._id.toString(),
        comment._id.toString(),
        user._id.toString()
      );

      // Verify no notification was created
      const notifications = await Notification.find({ recipient_id: user._id });
      expect(notifications).toHaveLength(0);
    });
  });

  describe('createCommentReplyNotification', () => {
    it('should create a notification when someone replies to a comment', async () => {
      // Create users
      const commentAuthor = await User.create({
        username: 'commentauthor',
        email: 'commentauthor@test.com',
        password_hash: 'hash123'
      });

      const replier = await User.create({
        username: 'replier',
        email: 'replier@test.com',
        password_hash: 'hash456'
      });

      // Create post
      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: commentAuthor._id,
        points: 0,
        comment_count: 0
      });

      // Create parent comment
      const parentComment = await Comment.create({
        content: 'Parent comment',
        post_id: post._id,
        parent_id: null,
        author_id: commentAuthor._id,
        points: 0
      });

      // Create reply
      const reply = await Comment.create({
        content: 'Reply comment',
        post_id: post._id,
        parent_id: parentComment._id,
        author_id: replier._id,
        points: 0
      });

      // Create notification
      await notificationService.createCommentReplyNotification(
        parentComment._id.toString(),
        reply._id.toString(),
        post._id.toString(),
        replier._id.toString()
      );

      // Verify notification was created
      const notifications = await Notification.find({ recipient_id: commentAuthor._id });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('comment_reply');
      expect(notifications[0].sender_id.toString()).toBe(replier._id.toString());
      expect(notifications[0].is_read).toBe(false);
    });

    it('should not create notification if user replies to their own comment', async () => {
      // Create user
      const user = await User.create({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash123'
      });

      // Create post
      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id,
        points: 0,
        comment_count: 0
      });

      // Create parent comment
      const parentComment = await Comment.create({
        content: 'Parent comment',
        post_id: post._id,
        parent_id: null,
        author_id: user._id,
        points: 0
      });

      // Create reply by same user
      const reply = await Comment.create({
        content: 'Reply comment',
        post_id: post._id,
        parent_id: parentComment._id,
        author_id: user._id,
        points: 0
      });

      // Try to create notification
      await notificationService.createCommentReplyNotification(
        parentComment._id.toString(),
        reply._id.toString(),
        post._id.toString(),
        user._id.toString()
      );

      // Verify no notification was created
      const notifications = await Notification.find({ recipient_id: user._id });
      expect(notifications).toHaveLength(0);
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve all notifications for a user', async () => {
      // Create users
      const recipient = await User.create({
        username: 'recipient',
        email: 'recipient@test.com',
        password_hash: 'hash123'
      });

      const sender = await User.create({
        username: 'sender',
        email: 'sender@test.com',
        password_hash: 'hash456'
      });

      // Create post
      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: recipient._id,
        points: 0,
        comment_count: 0
      });

      // Create comment
      const comment = await Comment.create({
        content: 'Test comment',
        post_id: post._id,
        parent_id: null,
        author_id: sender._id,
        points: 0
      });

      // Create notification
      await Notification.create({
        recipient_id: recipient._id,
        sender_id: sender._id,
        type: 'post_comment',
        post_id: post._id,
        comment_id: comment._id,
        is_read: false
      });

      // Get notifications
      const notifications = await notificationService.getUserNotifications(
        recipient._id.toString()
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0].sender.username).toBe('sender');
      expect(notifications[0].post.title).toBe('Test Post');
      expect(notifications[0].is_read).toBe(false);
    });

    it('should filter unread notifications when requested', async () => {
      // Create user
      const user = await User.create({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash123'
      });

      const sender = await User.create({
        username: 'sender',
        email: 'sender@test.com',
        password_hash: 'hash456'
      });

      // Create post
      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id,
        points: 0,
        comment_count: 0
      });

      // Create comment
      const comment = await Comment.create({
        content: 'Test comment',
        post_id: post._id,
        parent_id: null,
        author_id: sender._id,
        points: 0
      });

      // Create read and unread notifications
      await Notification.create({
        recipient_id: user._id,
        sender_id: sender._id,
        type: 'post_comment',
        post_id: post._id,
        comment_id: comment._id,
        is_read: true
      });

      await Notification.create({
        recipient_id: user._id,
        sender_id: sender._id,
        type: 'post_comment',
        post_id: post._id,
        comment_id: comment._id,
        is_read: false
      });

      // Get only unread notifications
      const unreadNotifications = await notificationService.getUserNotifications(
        user._id.toString(),
        true
      );

      expect(unreadNotifications).toHaveLength(1);
      expect(unreadNotifications[0].is_read).toBe(false);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      // Create user
      const user = await User.create({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash123'
      });

      const sender = await User.create({
        username: 'sender',
        email: 'sender@test.com',
        password_hash: 'hash456'
      });

      // Create post
      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id,
        points: 0,
        comment_count: 0
      });

      // Create comment
      const comment = await Comment.create({
        content: 'Test comment',
        post_id: post._id,
        parent_id: null,
        author_id: sender._id,
        points: 0
      });

      // Create notification
      const notification = await Notification.create({
        recipient_id: user._id,
        sender_id: sender._id,
        type: 'post_comment',
        post_id: post._id,
        comment_id: comment._id,
        is_read: false
      });

      // Mark as read
      await notificationService.markNotificationAsRead(
        notification._id.toString(),
        user._id.toString()
      );

      // Verify it was marked as read
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.is_read).toBe(true);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return the count of unread notifications', async () => {
      // Create user
      const user = await User.create({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hash123'
      });

      const sender = await User.create({
        username: 'sender',
        email: 'sender@test.com',
        password_hash: 'hash456'
      });

      // Create post
      const post = await Post.create({
        title: 'Test Post',
        text: 'Test content',
        type: 'text',
        author_id: user._id,
        points: 0,
        comment_count: 0
      });

      // Create comment
      const comment = await Comment.create({
        content: 'Test comment',
        post_id: post._id,
        parent_id: null,
        author_id: sender._id,
        points: 0
      });

      // Create 3 unread and 2 read notifications
      for (let i = 0; i < 3; i++) {
        await Notification.create({
          recipient_id: user._id,
          sender_id: sender._id,
          type: 'post_comment',
          post_id: post._id,
          comment_id: comment._id,
          is_read: false
        });
      }

      for (let i = 0; i < 2; i++) {
        await Notification.create({
          recipient_id: user._id,
          sender_id: sender._id,
          type: 'post_comment',
          post_id: post._id,
          comment_id: comment._id,
          is_read: true
        });
      }

      // Get unread count
      const count = await notificationService.getUnreadNotificationCount(
        user._id.toString()
      );

      expect(count).toBe(3);
    });
  });
});
