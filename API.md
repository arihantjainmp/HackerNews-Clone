# API Documentation - Hacker News Clone

## Overview
**Base URL**: `http://localhost:5000/api`

### Authentication
This API uses **HttpOnly Cookies** for session management.
- `access_token`: Short-lived (15 min)
- `refresh_token`: Long-lived (7 days)

Cookies are automatically managed by the browser or tools like Postman. No manual header management is required for authenticated requests.

---

## 📌 Post Endpoints

### `GET /posts`
Fetch a paginated list of posts.

**Request Params:**
- `page`: integer (optional, default: 1)
- `sort`: string (optional, options: `'new'`, `'top'`, `'best'`)
- `q`: string (optional, search query)

**Response:**
```json
{
  "posts": [{
    "_id": "507f1f77bcf86cd799439011",
    "title": "Hacker News Clone",
    "url": "https://github.com/example/repo",
    "text": null,
    "author": { "username": "johndoe" },
    "points": 156,
    "comment_count": 42,
    "created_at": "2024-01-01T12:00:00Z",
    "userVote": 1
  }],
  "page": 1,
  "totalPages": 10,
  "total": 250
}
```

### `POST /posts`
Create a new post. (Auth Required)
- **Body**: `{ "title": "...", "url": "...", "text": "..." }` (One of url/text required)

### `GET /posts/:id`
Get post details and full comment thread.

---

## 📌 Authentication Endpoints

### `POST /auth/signup`
- **Body**: `{ "username": "...", "email": "...", "password": "..." }`
- **Response**: `201 Created` (Sets Cookies)

### `POST /auth/login`
- **Body**: `{ "email": "...", "password": "..." }`
- **Response**: `200 OK` (Sets Cookies)

### `POST /auth/logout`
- **Response**: `200 OK` (Clears Cookies)

### `GET /auth/me`
- **Response**: `{ "user": { "_id": "...", "username": "..." } }`

---

## 📌 Comment & Vote Endpoints

### `POST /posts/:postId/comments`
Submit a top-level comment. (Auth Required)

### `POST /comments/:commentId/replies`
Reply to a specific comment. (Auth Required)

### `POST /posts/:id/vote` | `POST /comments/:id/vote`
- **Body**: `{ "direction": 1 }` (1 for up, -1 for down)
- **Toggle**: Sending the same direction again removes the vote.

---

## 📌 Other Endpoints

### `GET /notifications`
Fetch unread notifications for the user. (Auth Required)

### `GET /users/:username`
Fetch public profile and recent activity.