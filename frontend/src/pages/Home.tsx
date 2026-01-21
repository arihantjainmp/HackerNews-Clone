/**
 * Home Page Component
 *
 * Main landing page displaying the post list with sorting and search controls
 *
 * Requirements: 9.1, 9.7, 9.8
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PostList } from '../components';
import { useAuth } from '../contexts/AuthContext';
import type { SortOption } from '../types';

// ============================================================================
// Component
// ============================================================================

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL query parameters
  const initialSort = (searchParams.get('sort') as SortOption) || 'new';
  const initialSearch = searchParams.get('q') || '';

  // State for sorting and search
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);

  /**
   * Set page title
   * Requirement 17.3: Set page title
   */
  useEffect(() => {
    document.title = 'Hacker News Clone';
  }, []);

  /**
   * Update URL query parameters when sort or search changes
   * Requirement 9.7, 9.8: Update URL query parameters when sorting/searching
   */
  useEffect(() => {
    const params = new URLSearchParams();

    // Add sort parameter if not default
    if (sort !== 'new') {
      params.set('sort', sort);
    }

    // Add search parameter if present
    if (searchQuery) {
      params.set('q', searchQuery);
    }

    // Update URL without triggering navigation
    setSearchParams(params, { replace: true });
  }, [sort, searchQuery, setSearchParams]);

  /**
   * Debounced search handler (300ms delay)
   * Requirement 9.8: Add search input with debouncing (300ms)
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((newSort: SortOption) => {
    setSort(newSort);
  }, []);

  /**
   * Clear search
   */
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchInput('');
  }, []);

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-500 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-white font-bold text-base sm:text-xl">Hacker News Clone</h1>
            </div>

            {/* Auth Status - Responsive */}
            <div className="flex items-center gap-2 sm:gap-4">
              {isAuthenticated ? (
                <>
                  <span className="text-white text-xs sm:text-sm hidden md:inline">
                    Welcome, <span className="font-semibold">{user?.username}</span>
                  </span>
                  <button
                    onClick={() => navigate('/submit')}
                    className="px-2 sm:px-4 py-2 bg-white text-orange-500 rounded hover:bg-gray-100 transition-colors text-xs sm:text-sm font-medium min-h-[44px]"
                  >
                    Submit
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-2 sm:px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-2 sm:px-4 py-2 bg-white text-orange-500 rounded hover:bg-gray-100 transition-colors text-xs sm:text-sm font-medium min-h-[44px]"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-2 sm:px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px]"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Requirement 21.1: Single-column layout for mobile */}
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl">
        {/* Controls */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <div className="flex gap-1 sm:gap-1">
                <button
                  onClick={() => handleSortChange('new')}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded text-sm font-medium transition-colors min-h-[44px] ${
                    sort === 'new'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  New
                </button>
                <button
                  onClick={() => handleSortChange('top')}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded text-sm font-medium transition-colors min-h-[44px] ${
                    sort === 'top'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Top
                </button>
                <button
                  onClick={() => handleSortChange('best')}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded text-sm font-medium transition-colors min-h-[44px] ${
                    sort === 'best'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Best
                </button>
              </div>
            </div>

            {/* Search - with debouncing */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search posts..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Active Search Indicator */}
            {searchQuery && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm text-gray-600">
                  Searching for: <span className="font-semibold break-words">{searchQuery}</span>
                </span>
                <button
                  onClick={handleClearSearch}
                  className="text-sm text-orange-500 hover:text-orange-600 font-medium self-start sm:self-auto min-h-[44px] sm:min-h-0 flex items-center"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Post List */}
        <PostList sort={sort} searchQuery={searchQuery} />
      </main>
    </div>
  );
};

export default Home;
