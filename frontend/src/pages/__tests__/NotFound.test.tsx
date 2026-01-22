/**
 * NotFound Component Tests
 *
 * Tests the 404 Not Found page component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '../NotFound';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Render NotFound component with router context
 */
function renderNotFound() {
  return render(
    <BrowserRouter>
      <NotFound />
    </BrowserRouter>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('NotFound Component', () => {
  it('should render 404 heading', () => {
    renderNotFound();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('should render page not found message', () => {
    renderNotFound();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('should render descriptive error message', () => {
    renderNotFound();
    expect(
      screen.getByText(/Sorry, we couldn't find the page you're looking for/i)
    ).toBeInTheDocument();
  });

  it('should render link to home page', () => {
    renderNotFound();
    const homeLink = screen.getByRole('link', { name: /go to home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should render link to submit page', () => {
    renderNotFound();
    const submitLink = screen.getByRole('link', { name: /submit a post/i });
    expect(submitLink).toBeInTheDocument();
    expect(submitLink).toHaveAttribute('href', '/submit');
  });
});
