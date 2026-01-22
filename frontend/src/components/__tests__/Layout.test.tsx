/**
 * Layout Component Tests
 *
 * Tests for the main layout component including header, navigation, and auth status.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from '../Layout';
import * as AuthContext from '../../contexts/AuthContext';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.spyOn(AuthContext, 'useAuth').mockImplementation(mockUseAuth);

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should render logo and brand name', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Check for logo
      expect(screen.getByText('HN')).toBeInTheDocument();

      // Check for brand name
      expect(screen.getByText('Hacker News')).toBeInTheDocument();
    });

    it('should render login and signup links when not authenticated', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Desktop links
      const loginLinks = screen.getAllByText('Login');
      const signupLinks = screen.getAllByText('Sign Up');

      expect(loginLinks.length).toBeGreaterThan(0);
      expect(signupLinks.length).toBeGreaterThan(0);
    });

    it('should not render submit link when not authenticated', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Submit should not be visible
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    const mockLogout = vi.fn();

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          _id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
        refreshToken: vi.fn(),
      });
    });

    it('should render username when authenticated', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should render logout button when authenticated', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      const logoutButtons = screen.getAllByText('Logout');
      expect(logoutButtons.length).toBeGreaterThan(0);
    });

    it('should render submit link when authenticated', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      const submitLinks = screen.getAllByText('Submit');
      expect(submitLinks.length).toBeGreaterThan(0);
    });

    it('should not render login/signup links when authenticated', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Login and Signup should not be visible in desktop view
      const loginLinks = screen.queryAllByText('Login');
      const signupLinks = screen.queryAllByText('Sign Up');

      // They should not exist in the desktop navigation
      expect(loginLinks.length).toBe(0);
      expect(signupLinks.length).toBe(0);
    });

    it('should call logout when logout button is clicked', async () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      const logoutButtons = screen.getAllByText('Logout');
      expect(logoutButtons.length).toBeGreaterThan(0);

      fireEvent.click(logoutButtons[0]!);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should render loading text when loading', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      const loadingTexts = screen.getAllByText('Loading...');
      expect(loadingTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Mobile Menu', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should toggle mobile menu when button is clicked', () => {
      const { container } = render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      const menuButton = screen.getByLabelText('Toggle menu');

      // Mobile menu should be closed initially (not in DOM)
      let mobileMenu = container.querySelector('.md\\:hidden.py-4');
      expect(mobileMenu).not.toBeInTheDocument();

      // Open menu
      fireEvent.click(menuButton);

      // Mobile menu should be open (in DOM)
      mobileMenu = container.querySelector('.md\\:hidden.py-4');
      expect(mobileMenu).toBeInTheDocument();

      // Close menu
      fireEvent.click(menuButton);

      // Mobile menu should be closed again (not in DOM)
      mobileMenu = container.querySelector('.md\\:hidden.py-4');
      expect(mobileMenu).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should have responsive classes for mobile, tablet, and desktop', () => {
      const { container } = render(
        <BrowserRouter>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Check for responsive classes
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();

      // Check for max-width container
      const maxWidthContainer = container.querySelector('.max-w-7xl');
      expect(maxWidthContainer).toBeInTheDocument();

      // Check for responsive padding
      const responsivePadding = container.querySelector('.px-4.sm\\:px-6.lg\\:px-8');
      expect(responsivePadding).toBeInTheDocument();
    });
  });
});
