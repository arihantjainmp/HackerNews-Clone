# API Documentation

Base URL: `http://localhost:5000/api`

## Health Check Endpoints

### GET /health
Comprehensive health check that verifies database connectivity, memory usage, and system uptime.

Response (200 OK when healthy, 503 Service Unavailable when unhealthy):
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-01-23T02:00:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "database": {
      "status": "up" | "down",
      "responseTime": 5,
      "error": "optional error message"
    },
    "memory": {
      "status": "ok" | "warning" | "critical",
      "usage": {
        "heapUsed": 150,
        "heapTotal": 200,
        "external": 10,
        "rss": 250
      },
      "percentage": 75
    }
  }
}
```

### GET /ready
Kubernetes readiness probe - returns 200 only when service is ready to accept traffic.

Response (200 OK when ready, 503 Service Unavailable when not ready):
```json
{
  "status": "ready"
}
```

### GET /live
Kubernetes liveness probe - returns 200 if service is alive.

Response (200 OK):
```json
{
  "status": "alive",
  "uptime": 3600.5
}
```

## Authentication Endpoints

### POST /auth/signup
Request body:
- username: string (required, 3-20 chars)
- email: string (required, valid email)
- password: string (required, min 8 chars)

Response:
{
  user: {
    _id: string,
    username: string,
    email: string,
    created_at: string
  }
}

### POST /auth/login
Request body:
- email: string (required)
- password: string (required)

Response:
{
  user: {
    _id: string,
    username: string,
    email: string,
    created_at: string
  }
}

### POST /auth/logout
Request body:
- (none)

Response:
{
  message: string
}

### GET /auth/me
Request params:
- (none)

Response:
{
  user: {
    _id: string,
    username: string,
    email: string,
    created_at: string
  }
}

## Post Endpoints

### GET /posts
Request params:
- page: integer (optional, default: 1)
- limit: integer (optional, default: 25)
- sort: string (optional, options: 'new', 'top', 'best')
- q: string (optional, search query)

Response:
{
  posts: [{
    _id: string,
    title: string,
    url: string | null,
    text: string | null,
    type: string ('link' | 'text'),
    author: {
      _id: string,
      username: string,
      created_at: string
    },
    points: integer,
    comment_count: integer,
    created_at: string,
    userVote: integer | null
  }],
  total: integer,
  page: integer,
  totalPages: integer
}

### POST /posts
Request body:
- title: string (required)
- url: string (optional)
- text: string (optional)

Response:
{
  post: {
    _id: string,
    title: string,
    url: string | null,
    text: string | null,
    type: string,
    author: {
      _id: string,
      username: string
    },
    points: integer,
    comment_count: integer,
    created_at: string
  }
}

### GET /posts/:id
Request params:
- id: string (required)

Response:
{
  post: {
    _id: string,
    title: string,
    url: string | null,
    text: string | null,
    author: {
      _id: string,
      username: string
    },
    points: integer,
    comment_count: integer,
    created_at: string,
    userVote: integer | null
  },
  comments: [{
    comment: {
      _id: string,
      content: string,
      author: {
        _id: string,
        username: string
      },
      points: integer,
      created_at: string
    },
    replies: array // Recursive structure of comments
  }]
}

### POST /posts/:id/vote
Request body:
- direction: integer (1 for upvote, -1 for downvote)

Response:
{
  points: integer,
  userVote: integer
}

## Comment Endpoints

### POST /posts/:postId/comments
Request body:
- content: string (required)

Response:
{
  comment: {
    _id: string,
    content: string,
    post_id: string,
    author: {
      _id: string,
      username: string
    },
    points: integer,
    created_at: string
  }
}

### POST /comments/:commentId/replies
Request body:
- content: string (required)

Response:
{
  comment: {
    _id: string,
    content: string,
    post_id: string,
    parent_id: string,
    author: {
      _id: string,
      username: string
    },
    points: integer,
    created_at: string
  }
}

### POST /comments/:id/vote
Request body:
- direction: integer (1 for upvote, -1 for downvote)

Response:
{
  points: integer,
  userVote: integer
}

### DELETE /comments/:id
Request params:
- id: string (required)

Response:
{
  message: string
}

## User Endpoints

### GET /users/:username
Request params:
- username: string (required)

Response:
{
  user: {
    _id: string,
    username: string,
    created_at: string
  },
  posts: array,
  comments: array
}

## Notification Endpoints

### GET /notifications
Request params:
- unreadOnly: boolean (optional)

Response:
{
  notifications: [{
    _id: string,
    type: string ('comment_reply' | 'post_comment'),
    message: string,
    is_read: boolean,
    created_at: string
  }]
}
