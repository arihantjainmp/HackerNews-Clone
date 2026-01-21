/**
 * CommentForm Component
 *
 * Form for creating comments or replies with validation and optimistic updates
 *
 * Features:
 * - Textarea for comment content
 * - Validate content (not empty, max 10000 chars)
 * - Call API to create comment or reply
 * - Add comment to UI optimistically without refresh
 * - Show loading state and prevent double submission
 * - Clear form on success
 * - Display validation errors
 *
 * Requirements: 6.5, 10.4
 */

import React, { useState } from 'react';
import { createComment, createReply } from '../services/commentApi';
import type { Comment } from '../types';

// ============================================================================
// Component Props
// ============================================================================

interface CommentFormProps {
  /**
   * Post ID for top-level comments
   */
  postId?: string;

  /**
   * Parent comment ID for replies
   */
  parentId?: string;

  /**
   * Callback when comment is successfully created
   * Receives the new comment for optimistic UI update
   */
  onCommentCreated?: (comment: Comment) => void;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;

  /**
   * Placeholder text for the textarea
   */
  placeholder?: string;

  /**
   * Auto-focus the textarea on mount
   */
  autoFocus?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * CommentForm provides a textarea for creating comments or replies
 *
 * Requirement 6.5: Validate content (not empty, max 10000 chars)
 * Requirement 10.4: Add comment to UI optimistically without refresh
 */
export const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentId,
  onCommentCreated,
  onCancel,
  placeholder = 'Write a comment...',
  autoFocus = false,
}) => {
  // Form state
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate comment content
   *
   * Requirement 6.5: Validate content (not empty, max 10000 chars)
   */
  const validateContent = (value: string): string | null => {
    // Check if empty or only whitespace
    if (!value.trim()) {
      return 'Comment cannot be empty';
    }

    // Check maximum length
    if (value.length > 10000) {
      return 'Comment cannot exceed 10000 characters';
    }

    return null;
  };

  /**
   * Handle form submission
   *
   * Requirement 6.5: Call API to create comment or reply
   * Requirement 10.4: Add comment to UI optimistically without refresh
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setError(null);

    // Validate content
    const validationError = validateContent(content);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      let response;

      // Determine if this is a top-level comment or reply
      if (parentId) {
        // Create reply to existing comment
        response = await createReply(parentId, content);
      } else if (postId) {
        // Create top-level comment on post
        response = await createComment(postId, content);
      } else {
        throw new Error('Either postId or parentId must be provided');
      }

      // Clear form on success
      setContent('');
      setError(null);

      // Notify parent component with new comment for optimistic update
      if (onCommentCreated) {
        onCommentCreated(response.comment);
      }
    } catch (err: any) {
      // Display error message
      const errorMessage =
        err.response?.data?.error || 'Failed to post comment. Please try again.';
      setError(errorMessage);
      console.error('Comment submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel button click
   */
  const handleCancel = () => {
    // Clear form
    setContent('');
    setError(null);

    // Notify parent component
    if (onCancel) {
      onCancel();
    }
  };

  /**
   * Handle textarea change with character count validation
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Calculate remaining characters
  const remainingChars = 10000 - content.length;
  const showCharCount = content.length > 9000 || remainingChars < 0;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      {/* Textarea */}
      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-y min-h-[80px]"
        rows={3}
        disabled={isSubmitting}
        autoFocus={autoFocus}
        maxLength={10001} // Allow typing one extra char to trigger validation
      />

      {/* Character count (shown when approaching limit) */}
      {showCharCount && (
        <div
          className={`text-xs mt-1 ${
            remainingChars < 0 ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {remainingChars < 0
            ? `${Math.abs(remainingChars)} characters over limit`
            : `${remainingChars} characters remaining`}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 mt-2" role="alert">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="w-full sm:w-auto px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default CommentForm;
