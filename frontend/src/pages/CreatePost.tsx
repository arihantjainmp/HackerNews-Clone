/**
 * CreatePost Page Component
 *
 * Provides a form for authenticated users to create new posts (link or text).
 *
 * Requirements:
 * - 3.1: Create post with title and URL (link post)
 * - 3.2: Create post with title and text (text post)
 * - 3.3: Ensure only URL or text is provided, not both
 * - 3.7: Validate title length (1-300 chars)
 * - 3.8: Reject empty or whitespace-only titles
 *
 * Features:
 * - Form with title field and URL/text toggle
 * - Client-side validation (title length, mutual exclusivity)
 * - Server error display
 * - Loading state during submission
 * - Double submission prevention
 * - Redirect to post detail page on success
 */

import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../services/postApi';

// ============================================================================
// Types
// ============================================================================

interface ValidationErrors {
  title?: string;
  url?: string;
  text?: string;
  general?: string;
}

type PostType = 'link' | 'text';

// ============================================================================
// Component
// ============================================================================

const CreatePost: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [postType, setPostType] = useState<PostType>('link');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  /**
   * Validate form fields
   * Returns true if valid, false otherwise
   *
   * Requirements:
   * - 3.3: Ensure only URL or text is provided, not both
   * - 3.7: Validate title length (1-300 chars)
   * - 3.8: Reject empty or whitespace-only titles
   */
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate title (Requirement 3.7, 3.8)
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 1) {
      newErrors.title = 'Title must be at least 1 character';
    } else if (title.length > 300) {
      newErrors.title = 'Title must be at most 300 characters';
    }

    // Validate URL/text mutual exclusivity (Requirement 3.3)
    if (postType === 'link') {
      if (!url.trim()) {
        newErrors.url = 'URL is required for link posts';
      } else if (!/^https?:\/\/.+/.test(url.trim())) {
        newErrors.url = 'Please enter a valid URL (must start with http:// or https://)';
      }
      // Ensure text is empty for link posts
      if (text.trim()) {
        newErrors.general = 'Cannot provide both URL and text. Please choose one post type.';
      }
    } else {
      // text post
      if (!text.trim()) {
        newErrors.text = 'Text content is required for text posts';
      } else if (text.length > 10000) {
        newErrors.text = 'Text content must be at most 10000 characters';
      }
      // Ensure URL is empty for text posts
      if (url.trim()) {
        newErrors.general = 'Cannot provide both URL and text. Please choose one post type.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle post type toggle
   * Clears the inactive field when switching types
   */
  const handlePostTypeChange = (type: PostType) => {
    setPostType(type);
    setErrors({});
    setServerError(null);

    // Clear the field that's not being used
    if (type === 'link') {
      setText('');
    } else {
      setUrl('');
    }
  };

  /**
   * Handle form submission
   * Creates post via API and redirects to post detail on success
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous errors
    setServerError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Call API to create post (Requirement 3.1, 3.2)
      const response = await createPost(
        title.trim(),
        postType === 'link' ? url.trim() : undefined,
        postType === 'text' ? text.trim() : undefined
      );

      // Redirect to post detail page on success
      navigate(`/posts/${response.post._id}`);
    } catch (error: unknown) {
      // Display error message from API
      const errorMessage =
        (error as { response?: { data?: { error?: string } }; message?: string }).response?.data
          ?.error ||
        (error as { message?: string }).message ||
        'Failed to create post. Please try again.';
      setServerError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel - navigate back to home
   */
  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Submit a Post</h1>
        <p className="mt-2 text-sm text-gray-600">
          Share an interesting link or start a discussion
        </p>
      </div>

        {/* Form */}
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <form onSubmit={handleSubmit} noValidate>
            {/* Server Error Display */}
            {serverError && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{serverError}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* General Error Display */}
            {errors.general && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{errors.general}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Post Type Toggle - Requirement 21.5: Touch targets at least 44x44px */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
              <div className="flex gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => handlePostTypeChange('link')}
                  disabled={isSubmitting}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                    postType === 'link'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => handlePostTypeChange('text')}
                  disabled={isSubmitting}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                    postType === 'text'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Title Field */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                maxLength={300}
                placeholder="Enter a descriptive title"
                className={`appearance-none block w-full px-3 py-2 border ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px]`}
                aria-invalid={errors.title ? 'true' : 'false'}
                aria-describedby={errors.title ? 'title-error' : 'title-help'}
              />
              {errors.title ? (
                <p className="mt-2 text-sm text-red-600" id="title-error">
                  {errors.title}
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-500" id="title-help">
                  {title.length}/300 characters
                </p>
              )}
            </div>

            {/* URL Field (for link posts) */}
            {postType === 'link' && (
              <div className="mb-6">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  id="url"
                  name="url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="https://example.com"
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.url ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px]`}
                  aria-invalid={errors.url ? 'true' : 'false'}
                  aria-describedby={errors.url ? 'url-error' : undefined}
                />
                {errors.url && (
                  <p className="mt-2 text-sm text-red-600" id="url-error">
                    {errors.url}
                  </p>
                )}
              </div>
            )}

            {/* Text Field (for text posts) */}
            {postType === 'text' && (
              <div className="mb-6">
                <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                  Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="text"
                  name="text"
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={isSubmitting}
                  rows={10}
                  maxLength={10000}
                  placeholder="Share your thoughts..."
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.text ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed`}
                  aria-invalid={errors.text ? 'true' : 'false'}
                  aria-describedby={errors.text ? 'text-error' : 'text-help'}
                />
                {errors.text ? (
                  <p className="mt-2 text-sm text-red-600" id="text-error">
                    {errors.text}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-500" id="text-help">
                    {text.length}/10000 characters
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons - Requirement 21.5: Touch targets at least 44x44px */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Post'
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
    </div>
  );
};

export default CreatePost;
