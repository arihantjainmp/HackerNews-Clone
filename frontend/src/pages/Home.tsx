/**
 * Home Page Component
 *
 * Main landing page displaying the post list with sorting and search controls
 *
 * Requirements: 9.1, 9.7, 9.8
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PostList } from '../components';
import { useDebounce } from '../hooks';
import type { SortOption } from '../types';

// ============================================================================
// Component
// ============================================================================

export const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL query parameters
  const initialSort = (searchParams.get('sort') as SortOption) || 'new';
  const initialSearch = searchParams.get('q') || '';

  // State for sorting and search
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [searchInput, setSearchInput] = useState(initialSearch);
  
  // Debounce search input with 300ms delay
  // Requirement 22.5: Implement debouncing for search input to reduce unnecessary API calls
  const debouncedSearch = useDebounce(searchInput, 300);

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
    if (debouncedSearch) {
      params.set('q', debouncedSearch);
    }

    // Update URL without triggering navigation
    setSearchParams(params, { replace: true });
  }, [sort, debouncedSearch, setSearchParams]);

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
    setSearchInput('');
  }, []);

  return (
    <div>
      {/* Controls Bar - Sort and Search */}
      <div className="bg-white rounded-lg shadow-sm mb-4 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Sort:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleSortChange('new')}
                className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                  sort === 'new'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                New
              </button>
              <button
                onClick={() => handleSortChange('top')}
                className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                  sort === 'top'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Top
              </button>
              <button
                onClick={() => handleSortChange('best')}
                className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                  sort === 'best'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Best
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search posts..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Active Search Indicator */}
        {debouncedSearch && (
          <div className="mt-2 text-xs sm:text-sm text-gray-700">
            Searching: <span className="font-semibold">{debouncedSearch}</span>
            <button
              onClick={handleClearSearch}
              className="ml-2 text-orange-500 hover:text-orange-600 font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Post List */}
      <PostList sort={sort} searchQuery={debouncedSearch} />
    </div>
  );
};

export default Home;
