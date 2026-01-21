import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as notificationController from '../controllers/notificationController';

const router = Router();

/**
 * Notification Routes
 * All routes require authentication
 */

// GET /api/notifications - Get all notifications for authenticated user
// Query params: unreadOnly=true (optional)
router.get('/notifications', authenticate, notificationController.getNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/notifications/unread-count', authenticate, notificationController.getUnreadCount);

// PUT /api/notifications/:id/read - Mark a notification as read
router.put('/notifications/:id/read', authenticate, notificationController.markAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', authenticate, notificationController.markAllAsRead);

export default router;
