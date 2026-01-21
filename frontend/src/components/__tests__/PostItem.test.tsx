/**
 * PostItem Component Tests
 *
 * Tests for the PostItem component including:
 * - Rendering post metadata
 * - Vote button interactions
 * - Navigation behavior
 * - Optimistic updates and error rollback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PostItem } from '../PostItem';
import * as postApi from '../../services/postApi';
import type { Post } from '../../types';

// Mock the post API
vi.mock('../../services/postApi');

// Mock the auth context
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      isAuthenticated: true,
      user: {
        _id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2024-01-01',
      },
      isLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
    })),
  };
});

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('PostItem', () => {
  const mockPost: Post = {
    _id: 'post1',
    title: 'Test Post Title',
    type: 'link',
    url: 'https://example.com',
    author_id: 'user1',
    author: {
      _id: 'user1',
      username: 'testauthor',
      email: 'author@example.com',
      created_at: '2024-01-01',
    },
    points: 10,
    comment_count: 5,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders post metadata correctly', () => {
    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={0} />
      </BrowserRouter>
    );

    // Check title
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();

    // Check author
    expect(screen.getByText('testauthor')).toBeInTheDocument();

    // Check points
    expect(screen.getByText('10')).toBeInTheDocument();

    // Check comment count
    expect(screen.getByText('5 comments')).toBeInTheDocument();

    // Check domain for link posts
    expect(screen.getByText('(example.com)')).toBeInTheDocument();
  });

  it('highlights upvote button when user has upvoted', () => {
    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={1} />
      </BrowserRouter>
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    expect(upvoteButton).toHaveClass('text-orange-500');
  });

  it('highlights downvote button when user has downvoted', () => {
    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={-1} />
      </BrowserRouter>
    );

    const downvoteButton = screen.getByLabelText('Downvote');
    expect(downvoteButton).toHaveClass('text-blue-500');
  });

  it('handles upvote with optimistic update', async () => {
    const mockVoteResponse = { points: 11, userVote: 1 };
    vi.mocked(postApi.voteOnPost).mockResolvedValue(mockVoteResponse);

    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={0} />
      </BrowserRouter>
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    fireEvent.click(upvoteButton);

    // Check optimistic update
    await waitFor(() => {
      expect(screen.getByText('11')).toBeInTheDocument();
    });

    // Verify API was called
    expect(postApi.voteOnPost).toHaveBeenCalledWith('post1', 1);
  });

  it('handles downvote with optimistic update', async () => {
    const mockVoteResponse = { points: 9, userVote: -1 };
    vi.mocked(postApi.voteOnPost).mockResolvedValue(mockVoteResponse);

    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={0} />
      </BrowserRouter>
    );

    const downvoteButton = screen.getByLabelText('Downvote');
    fireEvent.click(downvoteButton);

    // Check optimistic update
    await waitFor(() => {
      expect(screen.getByText('9')).toBeInTheDocument();
    });

    // Verify API was called
    expect(postApi.voteOnPost).toHaveBeenCalledWith('post1', -1);
  });

  it('rolls back optimistic update on error', async () => {
    vi.mocked(postApi.voteOnPost).mockRejectedValue(new Error('Vote failed'));

    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={0} />
      </BrowserRouter>
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    fireEvent.click(upvoteButton);

    // Wait for error and rollback
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Back to original
    });
  });

  it('opens URL in new tab when clicking link post title', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={0} />
      </BrowserRouter>
    );

    const titleLink = screen.getByText('Test Post Title');
    fireEvent.click(titleLink);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer'
    );

    windowOpenSpy.mockRestore();
  });

  it('navigates to post detail when clicking text post title', () => {
    const textPost: Post = {
      ...mockPost,
      type: 'text',
      text: 'Post content',
      url: undefined,
    };

    render(
      <BrowserRouter>
        <PostItem post={textPost} userVote={0} />
      </BrowserRouter>
    );

    const titleLink = screen.getByText('Test Post Title');
    fireEvent.click(titleLink);

    expect(mockNavigate).toHaveBeenCalledWith('/posts/post1');
  });

  it('navigates to post detail when clicking comment count', () => {
    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={0} />
      </BrowserRouter>
    );

    const commentsButton = screen.getByText('5 comments');
    fireEvent.click(commentsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/posts/post1');
  });

  it('displays singular "comment" for count of 1', () => {
    const postWithOneComment: Post = {
      ...mockPost,
      comment_count: 1,
    };

    render(
      <BrowserRouter>
        <PostItem post={postWithOneComment} userVote={0} />
      </BrowserRouter>
    );

    expect(screen.getByText('1 comment')).toBeInTheDocument();
  });

  it('calls onVoteUpdate callback when provided', async () => {
    const mockVoteResponse = { points: 11, userVote: 1 };
    vi.mocked(postApi.voteOnPost).mockResolvedValue(mockVoteResponse);

    const onVoteUpdate = vi.fn();

    render(
      <BrowserRouter>
        <PostItem post={mockPost} userVote={0} onVoteUpdate={onVoteUpdate} />
      </BrowserRouter>
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(onVoteUpdate).toHaveBeenCalledWith('post1', 11, 1);
    });
  });
});
