import api from './api';

/**
 * Notification API
 * Handles all notification-related API calls
 */

export interface Notification {
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
  created_at: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

/**
 * Get all notifications for the authenticated user
 * @param unreadOnly - If true, only return unread notifications
 */
export const getNotifications = async (unreadOnly: boolean = false): Promise<Notification[]> => {
  const response = await api.get<NotificationResponse>(
    `/api/notifications${unreadOnly ? '?unreadOnly=true' : ''}`
  );
  return response.data.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<UnreadCountResponse>('/api/notifications/unread-count');
  return response.data.data.count;
};

/**
 * Mark a notification as read
 * @param notificationId - The ID of the notification to mark as read
 */
export const markAsRead = async (notificationId: string): Promise<void> => {
  await api.put(`/api/notifications/${notificationId}/read`);
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<void> => {
  await api.put('/api/notifications/read-all');
};
