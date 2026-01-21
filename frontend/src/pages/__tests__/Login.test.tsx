/**
 * Login Page Component Tests
 *
 * Tests for the Login page component that handles user authentication.
 *
 * Requirements:
 * - 1.3: User login with valid credentials
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';

// Mock useAuth hook
const mockLogin = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      signup: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
    });
  });

  const renderLogin = () => {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render login form with email and password fields', () => {
      renderLogin();

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render link to signup page', () => {
      renderLogin();

      const signupLink = screen.getByRole('link', { name: /create a new account/i });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute('href', '/signup');
    });

    it('should render heading', () => {
      renderLogin();

      expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when email is empty', async () => {
      renderLogin();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Should not call login
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show error when email format is invalid', async () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });

      // Should not call login
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show error when password is empty', async () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Should not call login
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show multiple errors when both fields are invalid', async () => {
      renderLogin();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Should not call login
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should clear validation errors when user corrects input', async () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Submit with empty email to trigger error
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Correct the email
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Email error should be cleared (only password error remains)
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call login function with correct credentials on valid submission', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should not submit form when validation fails', async () => {
      renderLogin();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      // Mock login to delay resolution
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText(/signing in\.\.\./i)).toBeInTheDocument();
      });

      // Button should be disabled
      expect(submitButton).toBeDisabled();

      // Input fields should be disabled
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    it('should prevent double submission', async () => {
      // Mock login to delay resolution
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Click submit button multiple times
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Wait for submission to complete
      await waitFor(
        () => {
          expect(screen.queryByText(/signing in\.\.\./i)).not.toBeInTheDocument();
        },
        { timeout: 200 }
      );

      // Login should only be called once
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should display server error message on login failure', async () => {
      const errorMessage = 'Invalid credentials';
      mockLogin.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display generic error message when error has no response', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));

      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should display fallback error message when error has no message', async () => {
      mockLogin.mockRejectedValue({});

      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/login failed\. please try again\./i)
        ).toBeInTheDocument();
      });
    });

    it('should clear server error when submitting again', async () => {
      // First submission fails
      mockLogin.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials' } },
      });

      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Second submission succeeds
      mockLogin.mockResolvedValueOnce(undefined);
      fireEvent.change(passwordInput, { target: { value: 'correctpassword' } });
      fireEvent.click(submitButton);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
      });
    });

    it('should re-enable form after error', async () => {
      mockLogin.mockRejectedValue({
        response: { data: { error: 'Invalid credentials' } },
      });

      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Form should be re-enabled
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for email field', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have proper ARIA attributes for password field', () => {
      renderLogin();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should associate error messages with inputs using aria-describedby', async () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});
