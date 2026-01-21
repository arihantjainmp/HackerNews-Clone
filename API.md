# Hacker News Clone - API Documentation

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Responses](#error-responses)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Posts](#post-endpoints)
  - [Comments](#comment-endpoints)
  - [Votes](#vote-endpoints)
  - [Users](#user-endpoints)
  - [Notifications](#notification-endpoints)

---

## Overview

This document provides comprehensive documentation for the Hacker News Clone REST API. The API follows RESTful principles and uses JSON for request and response payloads.

**API Version:** 1.0  
**Protocol:** HTTPS  
**Content-Type:** application/json

---

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

All endpoints are prefixed with `/api`.

---

## Authentication

The API uses JWT (JSON Web Token) based authentication with two token types:

- **Access Token**: Short-lived token (15 minutes) for API authentication
- **Refresh Token**: Long-lived token (7 days) for obtaining new access tokens

### Authentication Flow

1. **Sign up** or **log in** to receive both tokens
2. Include the **Access Token** in the `Authorization` header for protected endpoints
3. When the Access Token expires, use the **Refresh Token** to obtain a new one
4. **Log out** to invalidate the Refresh Token

### Authorization Header Format

```
Authorization: Bearer <access_token>
```


---

## Rate Limiting

To protect the API from abuse, rate limiting is enforced on all endpoints:

- **Limit:** 100 requests per 15-minute window per IP address
- **Status Code:** `429 Too Many Requests` when limit is exceeded
- **Headers:** 
  - `RateLimit-Limit`: Maximum requests allowed in the window
  - `RateLimit-Remaining`: Remaining requests in current window
  - `RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)
  - `Retry-After`: Seconds to wait before retrying (included in 429 responses)

### Rate Limit Response Example

```json
{
  "error": "Too many requests from this IP, please try again later",
  "retryAfter": 900
}
```

**Configuration:** Rate limits can be adjusted via environment variables in development:
- `RATE_LIMIT_WINDOW_MS`: Window duration in milliseconds (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window (default: 100)

---

## Error Responses

The API uses standard HTTP status codes and returns errors in a consistent JSON format.

### Error Response Format

```json
{
  "error": "Error message describing what went wrong"
}
```

For validation errors with multiple fields:

```json
{
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200 OK` | Request succeeded |
| `201 Created` | Resource created successfully |
| `400 Bad Request` | Invalid input or validation error |
| `401 Unauthorized` | Missing or invalid authentication token |
| `403 Forbidden` | Authenticated but not authorized for this action |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Resource already exists (e.g., duplicate username) |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server error |


---

## API Endpoints

## Authentication Endpoints

### POST /api/auth/signup

Register a new user account.

**Authentication:** Not required

**Request Body:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules:**
- `username`: 3-20 characters, alphanumeric with underscores/hyphens
- `email`: Valid email format
- `password`: Minimum 8 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

**Success Response (201 Created):**

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

```json
// 400 - Validation Error
{
  "errors": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}

// 409 - Conflict
{
  "error": "username already exists"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```


---

### POST /api/auth/login

Authenticate user and generate tokens.

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

```json
// 401 - Invalid Credentials
{
  "error": "Invalid email or password"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

---

### POST /api/auth/refresh

Refresh access token using a valid refresh token. Implements token rotation for enhanced security.

**Authentication:** Not required (uses refresh token in body)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** A new refresh token is returned (token rotation). The old refresh token is invalidated.

**Error Responses:**

```json
// 401 - Invalid or Expired Token
{
  "error": "Invalid or expired refresh token"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
  

---

### POST /api/auth/refresh

Refresh access token using a valid refresh token. Implements token rotation for enhanced security.

**Authentication:** Not required (uses refresh token in body)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** A new refresh token is returned (token rotation). The old refresh token is invalidated.

**Error Responses:**

```json
// 401 - Invalid or Expired Token
{
  "error": "Invalid or expired refresh token"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```


---

### POST /api/auth/logout

Invalidate refresh token to log out user.

**Authentication:** Not required (uses refresh token in body)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**

```json
// 401 - Invalid Token
{
  "error": "Invalid or already used refresh token"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

---

### GET /api/auth/me

Get current authenticated user's information.

**Authentication:** Required

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}

// 404 - User Not Found
{
  "error": "User not found"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```


---

## Post Endpoints

### GET /api/posts

Get paginated, sorted, and searchable list of posts.

**Authentication:** Optional (includes user vote data if authenticated)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (min: 1) |
| `limit` | number | 25 | Posts per page (min: 1, max: 100) |
| `sort` | string | "new" | Sort method: "new", "top", or "best" |
| `q` | string | - | Search query for post titles (case-insensitive) |

**Sorting Methods:**
- **new**: Sort by creation time (newest first)
- **top**: Sort by points (highest first)
- **best**: Sort by score = points / ((hours_since_creation + 2) ^ 1.8)

**Success Response (200 OK):**

```json
{
  "posts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Show HN: My new project",
      "url": "https://example.com",
      "type": "link",
      "author": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "johndoe",
        "created_at": "2024-01-15T10:30:00.000Z"
      },
      "points": 42,
      "comment_count": 15,
      "created_at": "2024-01-20T14:30:00.000Z",
      "userVote": 1
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 6
}
```

**Response Fields:**
- `userVote`: User's current vote (1 = upvote, -1 = downvote, 0 = no vote). Only included if authenticated.

**Error Responses:**

```json
// 400 - Invalid Query Parameters
{
  "errors": [
    {
      "field": "sort",
      "message": "sort must be one of [new, top, best]"
    }
  ]
}
```

**cURL Examples:**

```bash
# Get first page with default sorting
curl -X GET "http://localhost:5000/api/posts"

# Get second page with top sorting
curl -X GET "http://localhost:5000/api/posts?page=2&sort=top"

# Search for posts
curl -X GET "http://localhost:5000/api/posts?q=javascript&limit=10"

# With authentication
curl -X GET "http://localhost:5000/api/posts" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```


---

### POST /api/posts

Create a new post (link or text).

**Authentication:** Required

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Show HN: My new project",
  "url": "https://example.com"
}
```

OR

```json
{
  "title": "Ask HN: What are you working on?",
  "text": "I'm curious to hear what projects everyone is building..."
}
```

**Validation Rules:**
- `title`: Required, 1-300 characters
- `url`: Optional, valid URL format (must start with http:// or https://)
- `text`: Optional, max 10,000 characters
- **Exactly one** of `url` or `text` must be provided (not both, not neither)

**Success Response (201 Created):**

```json
{
  "post": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Show HN: My new project",
    "url": "https://example.com",
    "type": "link",
    "author": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "johndoe",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "points": 0,
    "comment_count": 0,
    "created_at": "2024-01-20T14:30:00.000Z"
  }
}
```

**Error Responses:**

```json
// 400 - Validation Error
{
  "errors": [
    {
      "field": "title",
      "message": "title is required"
    }
  ]
}

// 400 - Both URL and Text Provided
{
  "error": "Post must have either url or text, but not both"
}

// 401 - Not Authenticated
{
  "error": "Access token required"
}
```

**cURL Examples:**

```bash
# Create link post
curl -X POST http://localhost:5000/api/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Show HN: My new project",
    "url": "https://example.com"
  }'

# Create text post
curl -X POST http://localhost:5000/api/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ask HN: What are you working on?",
    "text": "I am curious to hear what projects everyone is building..."
  }'
```


---

### GET /api/posts/:id

Get a single post by ID with details and comment tree.

**Authentication:** Optional (includes user vote data if authenticated)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Post ID (MongoDB ObjectId) |

**Success Response (200 OK):**

```json
{
  "post": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Show HN: My new project",
    "url": "https://example.com",
    "type": "link",
    "author": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "johndoe",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "points": 42,
    "comment_count": 15,
    "created_at": "2024-01-20T14:30:00.000Z",
    "userVote": 1
  },
  "comments": [
    {
      "comment": {
        "_id": "507f1f77bcf86cd799439013",
        "content": "Great work!",
        "author": {
          "_id": "507f1f77bcf86cd799439014",
          "username": "janedoe"
        },
        "points": 5,
        "created_at": "2024-01-20T15:00:00.000Z",
        "is_deleted": false
      },
      "replies": [
        {
          "comment": {
            "_id": "507f1f77bcf86cd799439015",
            "content": "Thanks!",
            "author": {
              "_id": "507f1f77bcf86cd799439012",
              "username": "johndoe"
            },
            "points": 2,
            "created_at": "2024-01-20T15:30:00.000Z",
            "is_deleted": false
          },
          "replies": []
        }
      ]
    }
  ]
}
```

**Comment Tree Structure:**
- Comments are returned as a nested tree structure
- Each node contains a `comment` object and a `replies` array
- Top-level comments have `parent_id: null`
- Nested replies reference their parent via `parent_id`

**Error Responses:**

```json
// 404 - Post Not Found
{
  "error": "Post not found"
}

// 400 - Invalid ID Format
{
  "error": "Invalid ID format"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:5000/api/posts/507f1f77bcf86cd799439011

# With authentication
curl -X GET http://localhost:5000/api/posts/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```


---

## Comment Endpoints

### POST /api/posts/:postId/comments

Create a top-level comment on a post.

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `postId` | string | Post ID (MongoDB ObjectId) |

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "content": "This is a great post! Thanks for sharing."
}
```

**Validation Rules:**
- `content`: Required, 1-10,000 characters, cannot be empty or only whitespace

**Success Response (201 Created):**

```json
{
  "comment": {
    "_id": "507f1f77bcf86cd799439013",
    "content": "This is a great post! Thanks for sharing.",
    "post_id": "507f1f77bcf86cd799439011",
    "parent_id": null,
    "author": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "johndoe",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "points": 0,
    "created_at": "2024-01-20T15:00:00.000Z",
    "is_deleted": false
  }
}
```

**Error Responses:**

```json
// 400 - Validation Error
{
  "errors": [
    {
      "field": "content",
      "message": "content must be between 1 and 10000 characters"
    }
  ]
}

// 401 - Not Authenticated
{
  "error": "Access token required"
}

// 404 - Post Not Found
{
  "error": "Post not found"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/posts/507f1f77bcf86cd799439011/comments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a great post! Thanks for sharing."
  }'
```


---

### POST /api/comments/:commentId/replies

Create a reply to an existing comment.

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `commentId` | string | Parent comment ID (MongoDB ObjectId) |

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "content": "I agree with your point!"
}
```

**Validation Rules:**
- `content`: Required, 1-10,000 characters, cannot be empty or only whitespace

**Success Response (201 Created):**

```json
{
  "comment": {
    "_id": "507f1f77bcf86cd799439015",
    "content": "I agree with your point!",
    "post_id": "507f1f77bcf86cd799439011",
    "parent_id": "507f1f77bcf86cd799439013",
    "author": {
      "_id": "507f1f77bcf86cd799439014",
      "username": "janedoe",
      "created_at": "2024-01-16T10:30:00.000Z"
    },
    "points": 0,
    "created_at": "2024-01-20T15:30:00.000Z",
    "is_deleted": false
  }
}
```

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}

// 404 - Parent Comment Not Found
{
  "error": "Parent comment not found"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/comments/507f1f77bcf86cd799439013/replies \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I agree with your point!"
  }'
```


---

### PUT /api/comments/:id

Edit an existing comment. Only the comment author can edit their own comments.

**Authentication:** Required (must be comment author)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Comment ID (MongoDB ObjectId) |

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "content": "Updated comment content with corrections."
}
```

**Validation Rules:**
- `content`: Required, 1-10,000 characters, cannot be empty or only whitespace

**Success Response (200 OK):**

```json
{
  "comment": {
    "_id": "507f1f77bcf86cd799439013",
    "content": "Updated comment content with corrections.",
    "post_id": "507f1f77bcf86cd799439011",
    "parent_id": null,
    "author": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "johndoe",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "points": 5,
    "created_at": "2024-01-20T15:00:00.000Z",
    "edited_at": "2024-01-20T16:00:00.000Z",
    "is_deleted": false
  }
}
```

**Note:** The `edited_at` field is set to the current timestamp when a comment is edited.

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}

// 403 - Not Comment Author
{
  "error": "You can only edit your own comments"
}

// 404 - Comment Not Found
{
  "error": "Comment not found"
}
```

**cURL Example:**

```bash
curl -X PUT http://localhost:5000/api/comments/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated comment content with corrections."
  }'
```


---

### DELETE /api/comments/:id

Delete a comment. Only the comment author can delete their own comments.

**Deletion Behavior:**
- **Soft Delete (has replies):** If the comment has replies, it's marked as deleted (`is_deleted: true`) and content is replaced with "[deleted]", but the comment structure is preserved
- **Hard Delete (no replies):** If the comment has no replies, it's permanently removed from the database and the post's comment count is decremented

**Authentication:** Required (must be comment author)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Comment ID (MongoDB ObjectId) |

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**

```json
{
  "message": "Comment deleted successfully"
}
```

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}

// 403 - Not Comment Author
{
  "error": "You can only delete your own comments"
}

// 404 - Comment Not Found
{
  "error": "Comment not found"
}
```

**cURL Example:**

```bash
curl -X DELETE http://localhost:5000/api/comments/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```


---

## Vote Endpoints

### POST /api/posts/:id/vote

Vote on a post (upvote or downvote).

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Post ID (MongoDB ObjectId) |

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "direction": 1
}
```

**Validation Rules:**
- `direction`: Required, must be `1` (upvote) or `-1` (downvote)

**Vote State Transitions:**
- **No vote → Upvote:** Points +1
- **No vote → Downvote:** Points -1
- **Upvote → Upvote:** No change (idempotent)
- **Upvote → Downvote:** Points -2
- **Downvote → Upvote:** Points +2
- **Downvote → Downvote:** No change (idempotent)

**Success Response (200 OK):**

```json
{
  "points": 43,
  "userVote": 1
}
```

**Response Fields:**
- `points`: Updated total points for the post
- `userVote`: User's current vote direction (1 or -1)

**Error Responses:**

```json
// 400 - Invalid Direction
{
  "errors": [
    {
      "field": "direction",
      "message": "direction must be 1 or -1"
    }
  ]
}

// 401 - Not Authenticated
{
  "error": "Access token required"
}

// 404 - Post Not Found
{
  "error": "Post not found"
}
```

**cURL Examples:**

```bash
# Upvote a post
curl -X POST http://localhost:5000/api/posts/507f1f77bcf86cd799439011/vote \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"direction": 1}'

# Downvote a post
curl -X POST http://localhost:5000/api/posts/507f1f77bcf86cd799439011/vote \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"direction": -1}'
```


---

### POST /api/comments/:id/vote

Vote on a comment (upvote or downvote).

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Comment ID (MongoDB ObjectId) |

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "direction": 1
}
```

**Validation Rules:**
- `direction`: Required, must be `1` (upvote) or `-1` (downvote)

**Vote State Transitions:**
Same as post voting (see POST /api/posts/:id/vote)

**Success Response (200 OK):**

```json
{
  "points": 6,
  "userVote": 1
}
```

**Response Fields:**
- `points`: Updated total points for the comment
- `userVote`: User's current vote direction (1 or -1)

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}

// 404 - Comment Not Found
{
  "error": "Comment not found"
}
```

**cURL Examples:**

```bash
# Upvote a comment
curl -X POST http://localhost:5000/api/comments/507f1f77bcf86cd799439013/vote \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"direction": 1}'

# Downvote a comment
curl -X POST http://localhost:5000/api/comments/507f1f77bcf86cd799439013/vote \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"direction": -1}'
```


---

## User Endpoints

### GET /api/users/:username

Get user profile with recent activities.

**Authentication:** Optional

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | Username |

**Success Response (200 OK):**

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "username": "johndoe",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "posts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Show HN: My new project",
      "points": 42,
      "comment_count": 15,
      "created_at": "2024-01-20T14:30:00.000Z"
    }
  ],
  "comments": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "content": "Great post!",
      "points": 5,
      "created_at": "2024-01-20T15:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

```json
// 404 - User Not Found
{
  "error": "User not found"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:5000/api/users/johndoe
```


---

## Notification Endpoints

### GET /api/notifications

Get all notifications for the authenticated user.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `unreadOnly` | boolean | false | If true, return only unread notifications |

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**

```json
{
  "notifications": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "user_id": "507f1f77bcf86cd799439012",
      "type": "comment_reply",
      "message": "johndoe replied to your comment",
      "related_id": "507f1f77bcf86cd799439015",
      "is_read": false,
      "created_at": "2024-01-20T16:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439021",
      "user_id": "507f1f77bcf86cd799439012",
      "type": "post_comment",
      "message": "janedoe commented on your post",
      "related_id": "507f1f77bcf86cd799439013",
      "is_read": true,
      "created_at": "2024-01-20T15:00:00.000Z"
    }
  ]
}
```

**Notification Types:**
- `comment_reply`: Someone replied to your comment
- `post_comment`: Someone commented on your post

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}
```

**cURL Examples:**

```bash
# Get all notifications
curl -X GET http://localhost:5000/api/notifications \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get only unread notifications
curl -X GET "http://localhost:5000/api/notifications?unreadOnly=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```


---

### GET /api/notifications/unread-count

Get the count of unread notifications for the authenticated user.

**Authentication:** Required

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**

```json
{
  "count": 3
}
```

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### PUT /api/notifications/:id/read

Mark a specific notification as read.

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Notification ID (MongoDB ObjectId) |

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**

```json
{
  "message": "Notification marked as read"
}
```

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}

// 404 - Notification Not Found
{
  "error": "Notification not found"
}
```

**cURL Example:**

```bash
curl -X PUT http://localhost:5000/api/notifications/507f1f77bcf86cd799439020/read \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```


---

### PUT /api/notifications/read-all

Mark all notifications as read for the authenticated user.

**Authentication:** Required

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**

```json
{
  "message": "All notifications marked as read"
}
```

**Error Responses:**

```json
// 401 - Not Authenticated
{
  "error": "Access token required"
}
```

**cURL Example:**

```bash
curl -X PUT http://localhost:5000/api/notifications/read-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Common Patterns and Best Practices

### Pagination

When working with paginated endpoints (e.g., GET /api/posts), use the response metadata to navigate:

```javascript
// Example: Fetch all pages
async function fetchAllPosts() {
  let allPosts = [];
  let page = 1;
  let totalPages = 1;
  
  while (page <= totalPages) {
    const response = await fetch(`/api/posts?page=${page}&limit=25`);
    const data = await response.json();
    
    allPosts = allPosts.concat(data.posts);
    totalPages = data.totalPages;
    page++;
  }
  
  return allPosts;
}
```

### Token Refresh Flow

Implement automatic token refresh in your client:

```javascript
// Example: Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```


### Error Handling

Always check response status codes and handle errors appropriately:

```javascript
// Example: Comprehensive error handling
async function createPost(postData) {
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(postData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 400:
          // Validation error - show field-specific messages
          if (error.errors) {
            error.errors.forEach(err => {
              console.error(`${err.field}: ${err.message}`);
            });
          }
          break;
        case 401:
          // Authentication error - redirect to login
          window.location.href = '/login';
          break;
        case 429:
          // Rate limit - show retry message
          console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
          break;
        default:
          console.error('An error occurred:', error.error);
      }
      
      throw new Error(error.error);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}
```

### Rate Limit Handling

Respect rate limits and implement retry logic:

```javascript
// Example: Retry with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```


### Optimistic Updates

Implement optimistic UI updates for better user experience:

```javascript
// Example: Optimistic voting
async function handleVote(postId, direction) {
  // Save current state for rollback
  const previousPoints = post.points;
  const previousVote = post.userVote;
  
  // Calculate optimistic update
  const pointsDelta = calculatePointsDelta(previousVote, direction);
  
  // Update UI immediately
  setPost({
    ...post,
    points: post.points + pointsDelta,
    userVote: direction
  });
  
  try {
    // Send to server
    const response = await fetch(`/api/posts/${postId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ direction })
    });
    
    if (!response.ok) throw new Error('Vote failed');
    
    // Update with server response
    const data = await response.json();
    setPost({
      ...post,
      points: data.points,
      userVote: data.userVote
    });
  } catch (error) {
    // Rollback on failure
    setPost({
      ...post,
      points: previousPoints,
      userVote: previousVote
    });
    console.error('Failed to vote:', error);
  }
}

function calculatePointsDelta(currentVote, newVote) {
  if (currentVote === 0) return newVote; // No vote -> vote
  if (currentVote === newVote) return 0; // Same vote (idempotent)
  return newVote - currentVote; // Vote change (±2)
}
```

---

## Testing the API

### Using cURL

All examples in this document use cURL for demonstration. Replace `http://localhost:5000` with your actual API URL.

### Using Postman

1. Import the API endpoints into Postman
2. Set up an environment variable for `baseUrl` and `accessToken`
3. Use the Pre-request Script to automatically refresh tokens:

```javascript
// Postman Pre-request Script
const accessToken = pm.environment.get('accessToken');
const refreshToken = pm.environment.get('refreshToken');

if (!accessToken && refreshToken) {
  pm.sendRequest({
    url: pm.environment.get('baseUrl') + '/api/auth/refresh',
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    body: { mode: 'raw', raw: JSON.stringify({ refreshToken }) }
  }, (err, res) => {
    if (!err) {
      const data = res.json();
      pm.environment.set('accessToken', data.accessToken);
      pm.environment.set('refreshToken', data.refreshToken);
    }
  });
}
```


### Using JavaScript/TypeScript

Example API client implementation:

```typescript
// api-client.ts
class HackerNewsAPI {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token refresh on 401
    if (response.status === 401 && this.refreshToken) {
      const refreshResponse = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        this.saveTokens(data.accessToken, data.refreshToken);
        
        // Retry original request
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Authentication
  async signup(username: string, email: string, password: string) {
    const data = await this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.saveTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.saveTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async logout() {
    await this.request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    localStorage.clear();
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Posts
  async getPosts(params: { page?: number; limit?: number; sort?: string; q?: string } = {}) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/posts?${query}`);
  }

  async getPost(id: string) {
    return this.request(`/api/posts/${id}`);
  }

  async createPost(title: string, url?: string, text?: string) {
    return this.request('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title, url, text }),
    });
  }

  // Comments
  async createComment(postId: string, content: string) {
    return this.request(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async createReply(commentId: string, content: string) {
    return this.request(`/api/comments/${commentId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Votes
  async voteOnPost(postId: string, direction: 1 | -1) {
    return this.request(`/api/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
  }

  async voteOnComment(commentId: string, direction: 1 | -1) {
    return this.request(`/api/comments/${commentId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
  }
}

// Usage
const api = new HackerNewsAPI('http://localhost:5000');

// Login
await api.login('john@example.com', 'SecurePass123!');

// Get posts
const posts = await api.getPosts({ sort: 'top', limit: 10 });

// Create post
await api.createPost('My Post', 'https://example.com');

// Vote
await api.voteOnPost('507f1f77bcf86cd799439011', 1);
```

---

## Additional Resources

- **GitHub Repository:** [Link to repository]
- **Frontend Application:** [Link to deployed frontend]
- **API Status:** [Link to status page]
- **Support:** [Contact information]

---

## Changelog

### Version 1.0 (January 2024)
- Initial API release
- Authentication endpoints
- Post CRUD operations
- Comment system with nested replies
- Voting system
- User profiles
- Notifications

---

**Last Updated:** January 2024  
**API Version:** 1.0
