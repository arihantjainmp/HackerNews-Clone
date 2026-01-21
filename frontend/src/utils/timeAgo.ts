/**
 * Time formatting utilities
 *
 * Provides functions for displaying relative time (e.g., "2 hours ago")
 */

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 *
 * @param date - ISO 8601 date string or Date object
 * @returns Human-readable relative time string
 */
export const formatTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const past = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - past.getTime();

  // Convert to seconds
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  }

  // Convert to minutes
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }

  // Convert to hours
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }

  // Convert to days
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  // Convert to months
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }

  // Convert to years
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
};
