import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { User } from '../User';
import * as userApi from '../../services/userApi';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the API
vi.mock('../../services/userApi');

// Mock useParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ username: 'testuser' }),
    useNavigate: () => mockNavigate,
  };
});

const mockUserProfile = {
  user: {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  posts: [
    {
      _id: 'post1',
      title: 'Test Post',
      type: 'text' as const,
      text: 'Content',
      author_id: 'user123',
      author: {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      },
      points: 10,
      comment_count: 5,
      created_at: '2024-01-15T00:00:00.000Z',
    },
  ],
  comments: [
    {
      _id: 'comment1',
      content: 'Test comment',
      post_id: 'post1',
      parent_id: null,
      author_id: 'user123',
      author: {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      },
      points: 3,
      is_deleted: false,
      created_at: '2024-01-16T00:00:00.000Z',
    },
  ],
  totalPosts: 1,
  totalComments: 1,
  page: 1,
  totalPages: 1,
};

describe('User Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user profile with posts and comments', async () => {
    vi.spyOn(userApi, 'getUserProfile').mockResolvedValue(mockUserProfile);

    render(
      <BrowserRouter>
        <AuthProvider>
          <User />
        </AuthProvider>
      </BrowserRouter>
    );

    // Should show loading initially
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();

    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    // Check user info
    expect(screen.getByText('posts')).toBeInTheDocument();
    expect(screen.getByText('comments')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText(/Posts \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Comments \(1\)/i)).toBeInTheDocument();

    // Check post is displayed
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });

  it('should display error when user not found', async () => {
    vi.spyOn(userApi, 'getUserProfile').mockRejectedValue({
      response: { status: 404 },
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <User />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/user not found/i)).toBeInTheDocument();
    });
  });

  it('should display generic error on API failure', async () => {
    vi.spyOn(userApi, 'getUserProfile').mockRejectedValue(new Error('Network error'));

    render(
      <BrowserRouter>
        <AuthProvider>
          <User />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load user profile/i)).toBeInTheDocument();
    });
  });

  it('should switch between posts and comments tabs', async () => {
    vi.spyOn(userApi, 'getUserProfile').mockResolvedValue(mockUserProfile);

    render(
      <BrowserRouter>
        <AuthProvider>
          <User />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    // Initially shows posts
    expect(screen.getByText('Test Post')).toBeInTheDocument();

    // Click comments tab
    const commentsTab = screen.getByText(/Comments \(1\)/i);
    commentsTab.click();

    // Should show comment
    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });

  it('should display empty state when user has no posts', async () => {
    const emptyProfile = {
      ...mockUserProfile,
      posts: [],
      totalPosts: 0,
    };

    vi.spyOn(userApi, 'getUserProfile').mockResolvedValue(emptyProfile);

    render(
      <BrowserRouter>
        <AuthProvider>
          <User />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it('should display empty state when user has no comments', async () => {
    const emptyProfile = {
      ...mockUserProfile,
      comments: [],
      totalComments: 0,
    };

    vi.spyOn(userApi, 'getUserProfile').mockResolvedValue(emptyProfile);

    render(
      <BrowserRouter>
        <AuthProvider>
          <User />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    // Switch to comments tab
    const commentsTab = screen.getByText(/Comments \(0\)/i);
    commentsTab.click();

    await waitFor(() => {
      expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
    });
  });

  it('should set page title with username', async () => {
    vi.spyOn(userApi, 'getUserProfile').mockResolvedValue(mockUserProfile);

    render(
      <BrowserRouter>
        <AuthProvider>
          <User />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(document.title).toBe('testuser - Hacker News Clone');
    });
  });
});
