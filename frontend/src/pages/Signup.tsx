/**
 * Signup Page Component
 *
 * Provides a registration form for new users to create an account.
 *
 * Requirements:
 * - 1.1: User registration with username, email, and password
 * - 1.5: Password strength validation (min 8 chars)
 * - 1.6: Password must contain uppercase, lowercase, number, and special character
 *
 * Features:
 * - Username, email, and password input fields
 * - Client-side password validation with strength requirements display
 * - Server error display
 * - Loading state during submission
 * - Double submission prevention
 * - Redirect to home page on success (handled by AuthContext)
 */

import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface ValidationErrors {
  username?: string;
  email?: string;
  password?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

// ============================================================================
// Component
// ============================================================================

const Signup: React.FC = () => {
  const { signup } = useAuth();

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  /**
   * Password strength requirements
   * Requirement 1.6: Password must contain uppercase, lowercase, number, and special character
   */
  const passwordRequirements: PasswordRequirement[] = [
    {
      label: 'At least 8 characters',
      test: (pwd: string) => pwd.length >= 8,
      met: password.length >= 8,
    },
    {
      label: 'One uppercase letter',
      test: (pwd: string) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(password),
    },
    {
      label: 'One lowercase letter',
      test: (pwd: string) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(password),
    },
    {
      label: 'One number',
      test: (pwd: string) => /\d/.test(pwd),
      met: /\d/.test(password),
    },
    {
      label: 'One special character',
      test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  /**
   * Validate password strength
   * Returns true if password meets all requirements
   */
  const validatePasswordStrength = (pwd: string): boolean => {
    return passwordRequirements.every((req) => req.test(pwd));
  };

  /**
   * Validate form fields
   * Returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate username
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (username.trim().length > 20) {
      newErrors.username = 'Username must be at most 20 characters';
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePasswordStrength(password)) {
      newErrors.password = 'Password does not meet strength requirements';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
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
      // Call signup function from AuthContext
      // This will store tokens and redirect to home page on success
      await signup(username.trim(), email.trim(), password);
    } catch (error: any) {
      const responseData = error.response?.data;

      // Handle validation errors array from backend
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        const newErrors: ValidationErrors = {};
        responseData.errors.forEach((err: { field: string; message: string }) => {
          if (err.field === 'username') newErrors.username = err.message;
          if (err.field === 'email') newErrors.email = err.message;
          if (err.field === 'password') newErrors.password = err.message;
        });
        setErrors(newErrors);

        // If we parsed field errors, we don't need a generic server error
        // unless no known fields were matched
        if (Object.keys(newErrors).length === 0) {
          setServerError('Validation failed. Please check your inputs.');
        }
      } else {
        // Fallback for generic errors
        const errorMessage =
          responseData?.error || error.message || 'Signup failed. Please try again.';
        setServerError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-hn-orange hover:text-orange-700">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-10 shadow sm:rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* Server Error Display */}
            {serverError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{serverError}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-hn-orange focus:border-hn-orange text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px]`}
                  aria-invalid={errors.username ? 'true' : 'false'}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-600" id="username-error">
                  {errors.username}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-hn-orange focus:border-hn-orange text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px]`}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600" id="email-error">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors({ ...errors, password: undefined });
                    }
                  }}
                  onFocus={() => setShowPasswordRequirements(true)}
                  disabled={isSubmitting}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-hn-orange focus:border-hn-orange text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px]`}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={
                    errors.password
                      ? 'password-error'
                      : showPasswordRequirements
                        ? 'password-requirements'
                        : undefined
                  }
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600" id="password-error">
                  {errors.password}
                </p>
              )}

              {/* Password Requirements Display */}
              {showPasswordRequirements && (
                <div id="password-requirements" className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs font-medium text-gray-700 mb-2">Password must contain:</p>
                  <ul className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <li key={index} className="flex items-center text-xs">
                        <span className={`mr-2 ${req.met ? 'text-green-600' : 'text-gray-400'}`}>
                          {req.met ? '✓' : '○'}
                        </span>
                        <span className={req.met ? 'text-green-600' : 'text-gray-600'}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Submit Button - Requirement 21.5: Touch targets at least 44x44px */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-hn-orange hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hn-orange disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[44px]"
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
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
