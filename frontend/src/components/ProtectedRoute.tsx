/**
 * ProtectedRoute Component
 *
 * Guards routes that require authentication.
 * Redirects unauthenticated users to the login page.
 *
 * Requirements:
 * - 11.5: Redirect unauthenticated users to login page
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Loading Spinner Component
// ============================================================================

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hn-orange"></div>
    </div>
  );
};

// ============================================================================
// ProtectedRoute Component
// ============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that guards authenticated routes
 *
 * Behavior:
 * - While loading auth state: Shows loading spinner
 * - If not authenticated: Redirects to /login
 * - If authenticated: Renders children
 *
 * @param children - The components to render if authenticated
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default ProtectedRoute;
