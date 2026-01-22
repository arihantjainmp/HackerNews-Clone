import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  Notification,
} from '../services/notificationApi';
import { useAuth } from '../contexts/AuthContext';

/**
 * Notifications Page
 * Displays all notifications for the authenticated user
 */
export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const data = await getNotifications(filter === 'unread');
        setNotifications(data);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationText = (notification: Notification): string => {
    if (notification.type === 'post_comment') {
      return `commented on your post`;
    } else {
      return `replied to your comment on`;
    }
  };

  const getNotificationLink = (notification: Notification): string => {
    // For comment replies, link to the specific comment
    if (notification.comment?._id) {
      return `/posts/${notification.post._id}?commentId=${notification.comment._id}`;
    }
    // For post comments without a specific comment ID, just link to the post
    return `/posts/${notification.post._id}`;
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                filter === 'all'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                filter === 'unread'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div>
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <Link
                  key={notification._id}
                  to={getNotificationLink(notification)}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification._id);
                    }
                  }}
                  className={`block px-6 py-4 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                        )}
                        <p className="text-gray-900">
                          <span className="font-semibold text-blue-600">
                            {notification.sender.username}
                          </span>{' '}
                          {getNotificationText(notification)}{' '}
                          <span className="text-blue-600">"{notification.post.title}"</span>
                        </p>
                      </div>

                      {notification.comment && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {notification.comment.content}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkAsRead(notification._id);
                        }}
                        className="ml-4 text-sm text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
