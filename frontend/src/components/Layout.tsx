/**
 * Layout Component
 *
 * Main layout wrapper with header, navigation, and auth status.
 * Provides consistent structure across all pages.
 *
 * Requirements:
 * - 21.1: Responsive single-column layout for mobile
 * - 21.2: Adaptive layout for tablet and desktop
 * - 21.3: Efficient use of screen space
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-500 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Brand */}
            <div className="flex items-center">
              <Link to="/" className="text-white hover:text-orange-100 transition-colors">
                <span className="font-bold text-lg hidden sm:inline">Hacker News Clone</span>
                <span className="font-bold text-lg sm:hidden">HN</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className="text-white hover:text-orange-100 transition-colors font-medium"
              >
                Home
              </Link>
              {isAuthenticated && (
                <Link
                  to="/submit"
                  className="text-white hover:text-orange-100 transition-colors font-medium"
                >
                  Submit
                </Link>
              )}
            </nav>

            {/* Desktop Auth Status */}
            <div className="hidden md:flex items-center space-x-4">
              {isLoading ? (
                <div className="text-white text-sm">Loading...</div>
              ) : isAuthenticated ? (
                <>
                  <NotificationBell />
                  <span className="text-white text-sm font-medium">{user?.username || 'User'}</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-white text-orange-500 rounded hover:bg-orange-50 transition-colors font-medium text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-white hover:text-orange-100 transition-colors font-medium text-sm"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-white text-orange-500 rounded hover:bg-orange-50 transition-colors font-medium text-sm"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white hover:text-orange-100 transition-colors p-2"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-orange-400">
              <nav className="flex flex-col space-y-3">
                <button
                  onClick={() => handleNavigation('/')}
                  className="text-white hover:text-orange-100 transition-colors font-medium text-left px-2 py-2"
                >
                  Home
                </button>
                {isAuthenticated && (
                  <button
                    onClick={() => handleNavigation('/submit')}
                    className="text-white hover:text-orange-100 transition-colors font-medium text-left px-2 py-2"
                  >
                    Submit
                  </button>
                )}
                <div className="border-t border-orange-400 pt-3 mt-3">
                  {isLoading ? (
                    <div className="text-white text-sm px-2">Loading...</div>
                  ) : isAuthenticated ? (
                    <>
                      <div className="flex items-center justify-between px-2 py-2">
                        <div className="text-white text-sm font-medium">
                          {user?.username || 'User'}
                        </div>
                        <NotificationBell />
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-2 py-2 text-white hover:text-orange-100 transition-colors font-medium"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleNavigation('/login')}
                        className="w-full text-left px-2 py-2 text-white hover:text-orange-100 transition-colors font-medium"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => handleNavigation('/signup')}
                        className="w-full text-left px-2 py-2 text-white hover:text-orange-100 transition-colors font-medium"
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>Hacker News Clone - Built with React, TypeScript, and Express</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
