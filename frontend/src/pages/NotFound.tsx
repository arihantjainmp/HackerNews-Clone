/**
 * NotFound Page Component
 *
 * Displays a 404 error page when users navigate to a non-existent route.
 *
 * Requirements:
 * - 11.5: Handle invalid routes with 404 page
 *
 * Features:
 * - Clear 404 error message
 * - Navigation links to return to valid pages
 * - Consistent styling with the rest of the application
 */

import React from 'react';
import { Link } from 'react-router-dom';

// ============================================================================
// Component
// ============================================================================

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-9xl font-extrabold text-hn-orange">404</h1>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Page not found</h2>
          <p className="mt-2 text-base text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-hn-orange hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hn-orange"
          >
            Go to Home
          </Link>
          <Link
            to="/submit"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hn-orange"
          >
            Submit a Post
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
