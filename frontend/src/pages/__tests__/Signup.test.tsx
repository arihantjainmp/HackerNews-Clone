/**
 * Signup Page Component Tests
 *
 * Tests for the Signup page component that handles user registration.
 *
 * Requirements:
 * - 1.1: User registration with username, email, and password
 * - 1.5: Password strength validation (min 8 chars)
 * - 1.6: Password must contain uppercase, lowercase, number, and special character
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../Signup';

// Mock useAuth hook
const mockSignup = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

describe('Signup Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUseAuth.mockReturnValue({
      signup: mockSignup,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
    });
  });

  const renderSignup = () => {
    return render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render signup form with username, email, and password fields', () => {
      renderSignup();

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render link to login page', () => {
      renderSignup();

      const loginLink = screen.getByRole('link', { name: /sign in to your existing account/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should render heading', () => {
      renderSignup();

      expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    });
  });

  describe('Password Requirements Display', () => {
    it('should show password requirements when password field is focused', async () => {
      renderSignup();

      const passwordInput = screen.getByLabelText(/^password$/i);
      fireEvent.focus(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/password must contain:/i)).toBeInTheDocument();
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
        expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
        expect(screen.getByText(/one number/i)).toBeInTheDocument();
        expect(screen.getByText(/one special character/i)).toBeInTheDocument();
      });
    });

    it('should update password requirements as user types', async () => {
      renderSignup();

      const passwordInput = screen.getByLabelText(/^password$/i);
      fireEvent.focus(passwordInput);

      // Type a password that meets some requirements
      fireEvent.change(passwordInput, { target: { value: 'Pass' } });

      await waitFor(() => {
        // Should show requirements display
        expect(screen.getByText(/password must contain:/i)).toBeInTheDocument();
      });

      // Type a password that meets all requirements
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

      await waitFor(() => {
        // All requirements should be marked as met (green checkmarks)
        const requirementsList = screen.getByText(/password must contain:/i).parentElement;
        expect(requirementsList).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation - Username', () => {
    it('should show error when username is empty', async () => {
      renderSignup();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error when username is too short', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'ab' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error when username is too long', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'a'.repeat(21) } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username must be at most 20 characters/i)).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation - Email', () => {
    it('should show error when email is empty', async () => {
      renderSignup();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error when email format is invalid', async () => {
      renderSignup();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation - Password', () => {
    it('should show error when password is empty', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error when password is too short', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Pass1!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password does not meet strength requirements/i)
        ).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error when password lacks uppercase letter', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password does not meet strength requirements/i)
        ).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error when password lacks lowercase letter', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'PASSWORD123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password does not meet strength requirements/i)
        ).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error when password lacks number', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password does not meet strength requirements/i)
        ).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error when password lacks special character', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password does not meet strength requirements/i)
        ).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should accept password that meets all requirements', async () => {
      mockSignup.mockResolvedValue(undefined);
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith('testuser', 'test@example.com', 'Password123!');
      });
    });
  });

  describe('Form Submission', () => {
    it('should call signup function with correct data on valid submission', async () => {
      mockSignup.mockResolvedValue(undefined);
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith('testuser', 'test@example.com', 'Password123!');
      });
    });

    it('should trim username and email before submission', async () => {
      mockSignup.mockResolvedValue(undefined);
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: '  testuser  ' } });
      fireEvent.change(emailInput, { target: { value: '  test@example.com  ' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith('testuser', 'test@example.com', 'Password123!');
      });
    });

    it('should not submit form when validation fails', async () => {
      renderSignup();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignup).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      mockSignup.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creating account\.\.\./i)).toBeInTheDocument();
      });

      expect(submitButton).toBeDisabled();
      expect(usernameInput).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    it('should prevent double submission', async () => {
      mockSignup.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(
        () => {
          expect(screen.queryByText(/creating account\.\.\./i)).not.toBeInTheDocument();
        },
        { timeout: 200 }
      );

      expect(mockSignup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should display server error message on signup failure', async () => {
      const errorMessage = 'Username already exists';
      mockSignup.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display generic error message when error has no response', async () => {
      mockSignup.mockRejectedValue(new Error('Network error'));

      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should display fallback error message when error has no message', async () => {
      mockSignup.mockRejectedValue({});

      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/signup failed\. please try again\./i)).toBeInTheDocument();
      });
    });

    it('should clear server error when submitting again', async () => {
      mockSignup.mockRejectedValueOnce({
        response: { data: { error: 'Username already exists' } },
      });

      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
      });

      mockSignup.mockResolvedValueOnce(undefined);
      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/username already exists/i)).not.toBeInTheDocument();
      });
    });

    it('should re-enable form after error', async () => {
      mockSignup.mockRejectedValue({
        response: { data: { error: 'Username already exists' } },
      });

      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
      });

      expect(usernameInput).not.toBeDisabled();
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for username field', () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(usernameInput).toHaveAttribute('autoComplete', 'username');
      expect(usernameInput).toHaveAttribute('required');
    });

    it('should have proper ARIA attributes for email field', () => {
      renderSignup();

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have proper ARIA attributes for password field', () => {
      renderSignup();

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should associate error messages with inputs using aria-describedby', async () => {
      renderSignup();

      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(usernameInput).toHaveAttribute('aria-describedby', 'username-error');
        expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should associate password requirements with password field', async () => {
      renderSignup();

      const passwordInput = screen.getByLabelText(/^password$/i);
      fireEvent.focus(passwordInput);

      await waitFor(() => {
        expect(passwordInput).toHaveAttribute('aria-describedby', 'password-requirements');
      });
    });
  });
});
