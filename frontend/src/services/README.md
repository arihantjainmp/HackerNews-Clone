# API Client

This directory contains the configured Axios API client for the Hacker News Clone frontend.

## Overview

The `api.ts` module provides a pre-configured Axios instance with the following features:

- **Automatic Authorization Headers**: Automatically adds JWT access tokens to all requests
- **Automatic Token Refresh**: Handles 401 errors by refreshing expired access tokens
- **Token Storage**: Manages token storage in localStorage
- **Redirect on Auth Failure**: Redirects to login when refresh tokens are invalid

## Usage

### Basic API Calls

```typescript
import apiClient from './services/api';

// GET request
const response = await apiClient.get('/api/posts');
const posts = response.data;

// POST request
const response = await apiClient.post('/api/posts', {
  title: 'My Post',
  url: 'https://example.com'
});

// PUT request
const response = await apiClient.put('/api/comments/123', {
  content: 'Updated content'
});

// DELETE request
await apiClient.delete('/api/comments/123');
```

### Token Management

```typescript
import { setStoredTokens, getStoredTokens, clearStoredTokens } from './services/api';

// Store tokens after login
setStoredTokens({
  accessToken: 'your-access-token',
  refreshToken: 'your-refresh-token'
});

// Retrieve stored tokens
const tokens = getStoredTokens();
if (tokens) {
  console.log('Access token:', tokens.accessToken);
}

// Clear tokens on logout
clearStoredTokens();
```

## How It Works

### Request Interceptor

Before each request, the interceptor:
1. Checks if tokens exist in localStorage
2. If found, adds `Authorization: Bearer <token>` header
3. Sends the request

### Response Interceptor

When a request fails with 401:
1. Checks if this is the first retry attempt
2. If already refreshing, queues the request
3. Attempts to refresh the access token using the refresh token
4. If successful:
   - Stores new tokens
   - Retries the original request with new token
   - Processes any queued requests
5. If refresh fails:
   - Clears all tokens
   - Redirects to `/login`

### Token Refresh Flow

```
Request → 401 Error → Check Refresh Token
                            ↓
                    Valid? ─┬─ Yes → Refresh Access Token
                            │         ↓
                            │    Store New Tokens
                            │         ↓
                            │    Retry Original Request
                            │
                            └─ No → Clear Tokens → Redirect to Login
```

## Configuration

The API client is configured with:

- **Base URL**: `VITE_API_URL` environment variable (defaults to `http://localhost:5000`)
- **Timeout**: 30 seconds
- **Headers**: `Content-Type: application/json`

To change the base URL, update your `.env` file:

```env
VITE_API_URL=https://api.example.com
```

## Error Handling

The API client automatically handles:

- **401 Unauthorized**: Attempts token refresh, redirects to login on failure
- **Network Errors**: Propagates to caller for handling
- **Other HTTP Errors**: Propagates to caller for handling

Example error handling:

```typescript
try {
  const response = await apiClient.post('/api/posts', postData);
  // Handle success
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) {
      // Handle validation errors
      console.error('Validation error:', error.response.data);
    } else if (error.response?.status === 403) {
      // Handle forbidden
      console.error('Access denied');
    } else {
      // Handle other errors
      console.error('Request failed:', error.message);
    }
  }
}
```

## Testing

The API client includes comprehensive tests for:

- Token storage utilities
- Request interceptor behavior
- Response interceptor token refresh logic
- Error handling and redirects

Run tests with:

```bash
npm test -- src/services/__tests__/api.test.ts
```

## Requirements Satisfied

- **11.3**: Automatic token refresh on 401 errors
- **11.4**: Redirect to login on refresh token failure
- **11.7**: Include Access_Token in Authorization header for authenticated requests
