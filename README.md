# Hacker News Clone

A production-grade Hacker News clone built as a full-stack TypeScript application. This project demonstrates modern web development practices with comprehensive testing, including property-based testing for critical business logic.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [AI Tools Used](#ai-tools-used)
- [License](#license)

## 🎯 Overview

This Hacker News Clone is a feature-complete social news aggregation platform where users can:
- Submit posts (links or text content)
- Engage in threaded discussions through nested comments
- Vote on posts and comments
- Browse content with multiple sorting algorithms (new, top, best)
- Search for posts by title

The application emphasizes production-ready code quality with:
- **Type Safety**: Strict TypeScript throughout the stack
- **Comprehensive Testing**: Unit, integration, and property-based tests
- **Security**: JWT authentication, input validation, rate limiting, XSS prevention
- **Performance**: Optimized database queries with proper indexing
- **Scalability**: Docker containerization for easy deployment

## ✨ Features

### Authentication & User Management
- ✅ User registration with password strength validation
- ✅ Secure login with JWT access and refresh tokens
- ✅ Automatic token refresh for seamless sessions
- ✅ Password hashing with bcrypt

### Posts
- ✅ Create link posts (with URL) or text posts
- ✅ View paginated post lists
- ✅ Sort by new, top, or best (Hacker News algorithm)
- ✅ Search posts by title
- ✅ Upvote and downvote posts

### Comments
- ✅ Create top-level comments on posts
- ✅ Reply to comments with unlimited nesting
- ✅ Edit and delete your own comments
- ✅ Soft deletion preserves comment tree structure
- ✅ Upvote and downvote comments

### Security & Performance
- ✅ Input validation and sanitization (XSS prevention)
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ CORS configuration
- ✅ Error handling with appropriate HTTP status codes
- ✅ Database indexing for optimized queries
- ✅ Responsive design for mobile, tablet, and desktop

## 🛠 Tech Stack

### Backend
| Technology | Purpose | Justification |
|------------|---------|---------------|
| **Node.js + Express.js** | REST API Server | Non-blocking I/O ideal for API servers, mature ecosystem |
| **TypeScript** | Type Safety | Reduces runtime errors, improves maintainability |
| **MongoDB + Mongoose** | Database & ODM | Document model naturally represents nested comment trees |
| **JWT** | Authentication | Stateless authentication with access/refresh token pattern |
| **bcrypt** | Password Hashing | Industry-standard password hashing with salt |
| **Joi** | Input Validation | Schema-based validation with detailed error messages |
| **express-rate-limit** | Rate Limiting | Protects against abuse and DoS attacks |
| **sanitize-html** | XSS Prevention | Sanitizes user input to prevent script injection |

### Frontend
| Technology | Purpose | Justification |
|------------|---------|---------------|
| **React 18** | UI Library | Component-based architecture, hooks for state management |
| **TypeScript** | Type Safety | Shared type definitions with backend |
| **Vite** | Build Tool | Fast HMR, optimized production builds |
| **Tailwind CSS** | Styling | Utility-first approach enables rapid UI development |
| **React Router** | Routing | Industry-standard routing with protected routes |
| **Axios** | HTTP Client | Promise-based with interceptors for token management |

### Testing
| Technology | Purpose |
|------------|---------|
| **Vitest** | Fast unit test runner with Jest-compatible API |
| **fast-check** | Property-based testing for critical business logic |
| **Supertest** | HTTP endpoint integration testing |
| **React Testing Library** | Component testing with user-centric queries |
| **MongoDB Memory Server** | In-memory database for isolated tests |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization for consistent environments |
| **Docker Compose** | Multi-container orchestration |

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Frontend (Vite + TypeScript)                    │ │
│  │  - Components (PostList, CommentThread, Auth)          │ │
│  │  - State Management (Context API)                      │ │
│  │  - Routing (React Router)                              │ │
│  │  - HTTP Client (Axios with interceptors)               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Express.js Backend (Node.js + TypeScript)             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │ Controllers  │  │  Services    │  │ Middleware  │  │ │
│  │  │ - Auth       │  │  - Auth      │  │ - JWT Auth  │  │ │
│  │  │ - Posts      │  │  - Posts     │  │ - Validate  │  │ │
│  │  │ - Comments   │  │  - Comments  │  │ - Error     │  │ │
│  │  │ - Votes      │  │  - Votes     │  │ - Rate Limit│  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Mongoose ODM
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MongoDB Database                                       │ │
│  │  - users collection                                     │ │
│  │  - posts collection                                     │ │
│  │  - comments collection                                  │ │
│  │  - votes collection                                     │ │
│  │  - refreshtokens collection                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

The application follows a **three-tier architecture**:
1. **Client Layer**: React SPA with client-side routing and state management
2. **Application Layer**: Express.js REST API with service-oriented architecture
3. **Data Layer**: MongoDB with Mongoose for schema validation and queries

## 📦 Prerequisites

### For Docker Deployment (Recommended)
- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

### For Local Development
- [Node.js](https://nodejs.org/) 20.x or higher
- [MongoDB](https://www.mongodb.com/try/download/community) 7.0+
- npm 10+ or yarn 1.22+

## 🚀 Getting Started

### Option 1: Docker (Recommended)

This is the fastest way to get the entire stack running.

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hacker-news-clone
   ```

2. **Create environment files**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Configure environment variables** (optional)
   
   Edit `backend/.env` and `frontend/.env` if you need to change default values.
   For development, the defaults work out of the box.

4. **Start all services**
   ```bash
   docker-compose up --build
   ```

5. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5000
   - **MongoDB**: mongodb://localhost:27017

6. **Stop the services**
   ```bash
   docker-compose down
   ```

   To remove volumes (database data):
   ```bash
   docker-compose down -v
   ```

### Option 2: Local Development

For active development with hot reloading.

#### 1. Start MongoDB

Ensure MongoDB is running locally:
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Or use Docker for just MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

#### 2. Backend Setup

```bash
cd backend
npm install

# Create and configure environment file
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# Start development server (with hot reload)
npm run dev
```

The backend will be available at http://localhost:5000

#### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install

# Create and configure environment file
cp .env.example .env
# Edit .env to point to your backend (default: http://localhost:5000)

# Start development server (with hot reload)
npm run dev
```

The frontend will be available at http://localhost:3000

#### 4. Verify Setup

Open http://localhost:3000 in your browser. You should see the Hacker News Clone homepage.

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `5000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/hackernews` | Yes |
| `JWT_SECRET` | Secret key for access tokens | - | Yes |
| `REFRESH_TOKEN_SECRET` | Secret key for refresh tokens | - | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (milliseconds) | `900000` (15 min) | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `200` | No |

**Security Note**: In production, use strong, randomly generated secrets for `JWT_SECRET` and `REFRESH_TOKEN_SECRET`. You can generate them with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend (`frontend/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000` | Yes |

**Note**: Vite requires environment variables to be prefixed with `VITE_` to be exposed to the client.

## 💻 Development

### Backend Scripts

```bash
cd backend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Frontend Scripts

```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## 🧪 Testing

This project includes comprehensive testing at multiple levels:

### Test Types

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test API endpoints and component interactions
3. **Property-Based Tests**: Test invariants across many generated inputs using fast-check

### Running Tests

```bash
# Backend tests
cd backend
npm test                    # Run all tests once
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report

# Frontend tests
cd frontend
npm test                    # Run all tests once
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report
```

### Test Coverage

The project maintains high test coverage:
- **Backend**: 80%+ coverage for business logic
- **Frontend**: Comprehensive component and integration tests

### Property-Based Testing Examples

The project uses property-based testing for critical business logic:

- **Vote State Transitions**: Verifies points always reflect vote sum across all state transitions
- **Sorting Algorithms**: Ensures correct ordering for new, top, and best sorts
- **Comment Tree Construction**: Validates all comments are reachable in the tree
- **Pagination**: Confirms each item appears exactly once across all pages
- **Token Management**: Tests token generation, expiration, and refresh correctness

## 📁 Project Structure

```
.
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   │   ├── userController.ts
│   │   │   ├── notificationController.ts
│   │   │   └── __tests__/
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.ts        # JWT authentication
│   │   │   ├── validation.ts  # Input validation
│   │   │   ├── errorHandler.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── cors.ts
│   │   │   └── __tests__/
│   │   ├── models/            # Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Post.ts
│   │   │   ├── Comment.ts
│   │   │   ├── Vote.ts
│   │   │   ├── RefreshToken.ts
│   │   │   ├── Notification.ts
│   │   │   └── __tests__/
│   │   ├── routes/            # API route definitions
│   │   │   ├── authRoutes.ts
│   │   │   ├── postRoutes.ts
│   │   │   ├── commentRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   └── notificationRoutes.ts
│   │   ├── services/          # Business logic
│   │   │   ├── authService.ts
│   │   │   ├── postService.ts
│   │   │   ├── commentService.ts
│   │   │   ├── voteService.ts
│   │   │   ├── notificationService.ts
│   │   │   └── __tests__/
│   │   ├── utils/             # Utility functions
│   │   │   ├── cache.ts
│   │   │   ├── errors.ts
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   ├── sanitize.ts
│   │   │   ├── validateEnv.ts
│   │   │   └── __tests__/
│   │   └── index.ts           # Application entry point
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── CommentForm.tsx
│   │   │   ├── CommentItem.tsx
│   │   │   ├── CommentThread.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── PostItem.tsx
│   │   │   ├── PostList.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── __tests__/
│   │   ├── contexts/          # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   └── __tests__/
│   │   ├── hooks/             # Custom hooks
│   │   │   └── useDebounce.ts
│   │   ├── pages/             # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── CreatePost.tsx
│   │   │   ├── PostDetail.tsx
│   │   │   ├── User.tsx
│   │   │   ├── Notifications.tsx
│   │   │   ├── NotFound.tsx
│   │   │   └── __tests__/
│   │   ├── services/          # API client
│   │   │   ├── api.ts         # Axios instance
│   │   │   ├── authApi.ts
│   │   │   ├── postApi.ts
│   │   │   ├── commentApi.ts
│   │   │   ├── userApi.ts
│   │   │   ├── notificationApi.ts
│   │   │   └── __tests__/
│   │   ├── types/             # TypeScript types
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── timeAgo.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
│
├── .kiro/                      # Kiro specs and documentation
│   └── specs/
│       └── hacker-news-clone/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── docker-compose.yml          # Docker orchestration
├── .gitignore
└── README.md
```

## 📚 API Documentation

### Base URL
- Development: `http://localhost:5000`
- Production: Configure via `VITE_API_URL`

### Authentication Endpoints

#### POST `/api/auth/signup`
Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "_id": "...",
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### POST `/api/auth/login`
Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK` (same structure as signup)

#### POST `/api/auth/refresh`
Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGc..."
}
```

#### POST `/api/auth/logout`
Invalidate refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

### Post Endpoints

#### GET `/api/posts`
Get paginated list of posts.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 25)
- `sort` (string: "new" | "top" | "best", default: "new")
- `q` (string, optional): Search query

**Response:** `200 OK`
```json
{
  "posts": [...],
  "total": 100,
  "page": 1,
  "totalPages": 4
}
```

#### POST `/api/posts`
Create a new post (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (Link Post):**
```json
{
  "title": "Interesting Article",
  "url": "https://example.com/article"
}
```

**Request Body (Text Post):**
```json
{
  "title": "Discussion Topic",
  "text": "Let's discuss this interesting topic..."
}
```

**Response:** `201 Created`

#### GET `/api/posts/:id`
Get a single post with its comment tree.

**Response:** `200 OK`

#### POST `/api/posts/:id/vote`
Vote on a post (requires authentication).

**Request Body:**
```json
{
  "direction": 1  // 1 for upvote, -1 for downvote
}
```

**Response:** `200 OK`

### Comment Endpoints

#### POST `/api/posts/:postId/comments`
Create a top-level comment (requires authentication).

**Request Body:**
```json
{
  "content": "Great post! Here are my thoughts..."
}
```

**Response:** `201 Created`

#### POST `/api/comments/:commentId/replies`
Reply to a comment (requires authentication).

**Request Body:**
```json
{
  "content": "I agree with your point about..."
}
```

**Response:** `201 Created`

#### PUT `/api/comments/:id`
Edit your own comment (requires authentication).

**Request Body:**
```json
{
  "content": "Updated comment text..."
}
```

**Response:** `200 OK`

#### DELETE `/api/comments/:id`
Delete your own comment (requires authentication).

**Response:** `200 OK`

#### POST `/api/comments/:id/vote`
Vote on a comment (requires authentication).

**Request Body:**
```json
{
  "direction": 1  // 1 for upvote, -1 for downvote
}
```

**Response:** `200 OK`

### Error Responses

All endpoints may return the following error responses:

- `400 Bad Request`: Invalid input or validation error
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "error": "Error message describing what went wrong"
}
```

For validation errors:
```json
{
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Docker Issues

**Problem**: `docker-compose up` fails with "port already in use"

**Solution**: Another service is using the required ports (3000, 5000, or 27017).
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :5000
lsof -i :27017

# Stop the conflicting service or change ports in docker-compose.yml
```

**Problem**: Containers fail health checks

**Solution**: Wait longer for services to start, or check logs:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

**Problem**: MongoDB data persists after `docker-compose down`

**Solution**: Remove volumes to reset the database:
```bash
docker-compose down -v
```

#### Backend Issues

**Problem**: `npm run dev` fails with "Cannot find module"

**Solution**: Reinstall dependencies:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**Problem**: MongoDB connection error

**Solution**: 
1. Ensure MongoDB is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status mongod
   ```
2. Check `MONGODB_URI` in `backend/.env` matches your MongoDB setup
3. For Docker MongoDB: `mongodb://localhost:27017/hackernews`
4. For local MongoDB: `mongodb://127.0.0.1:27017/hackernews`

**Problem**: JWT errors or authentication not working

**Solution**: Ensure `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are set in `backend/.env`:
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Problem**: Tests fail with database errors

**Solution**: Tests use an in-memory MongoDB. Ensure you have enough memory:
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

#### Frontend Issues

**Problem**: `npm run dev` shows blank page

**Solution**: 
1. Check browser console for errors
2. Verify `VITE_API_URL` in `frontend/.env` points to running backend
3. Check CORS settings in backend

**Problem**: API requests fail with CORS errors

**Solution**: 
1. Ensure backend `FRONTEND_URL` in `backend/.env` matches frontend URL
2. For local development: `http://localhost:3000`
3. Check browser console for specific CORS error

**Problem**: Authentication doesn't persist after refresh

**Solution**: 
1. Check browser's localStorage for tokens
2. Ensure cookies are enabled
3. Check for console errors related to token refresh

**Problem**: Build fails with TypeScript errors

**Solution**: 
```bash
cd frontend
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

#### General Issues

**Problem**: Rate limiting blocks requests during development

**Solution**: Increase limits in `backend/.env`:
```env
RATE_LIMIT_MAX_REQUESTS=1000
```

**Problem**: Hot reload not working

**Solution**: 
1. For backend: Restart `npm run dev`
2. For frontend: Clear Vite cache:
   ```bash
   rm -rf frontend/node_modules/.vite
   ```

**Problem**: Port conflicts on macOS

**Solution**: macOS AirPlay Receiver uses port 5000 by default:
1. System Settings → General → AirDrop & Handoff → Disable "AirPlay Receiver"
2. Or change backend port in `backend/.env` and `frontend/.env`

### Getting Help

If you encounter issues not covered here:

1. **Check logs**: Look at console output and browser developer tools
2. **Search issues**: Check if others have encountered the same problem
3. **Environment**: Verify all environment variables are set correctly
4. **Dependencies**: Ensure you're using compatible Node.js and npm versions
5. **Clean install**: Try removing `node_modules` and reinstalling



## 🤖 AI Tools Used

This project was developed with assistance from AI tools to accelerate development and ensure best practices:

### Kiro AI Assistant
- **Spec-Driven Development**: Used Kiro's spec workflow to create comprehensive requirements, design documents, and implementation tasks
- **Code Generation**: Generated boilerplate code, models, services, and API endpoints following the design specifications
- **Test Generation**: Created unit tests, integration tests, and property-based tests with fast-check
- **Code Review**: Received suggestions for improvements in error handling, validation, and security
- **Documentation**: Assisted in writing inline code comments and this README

### Development Approach
The project followed a **spec-driven development methodology**:

1. **Requirements Phase**: Defined 28 detailed requirements covering all features
2. **Design Phase**: Created technical design with architecture diagrams, data models, and correctness properties
3. **Implementation Phase**: Broke down work into 100+ incremental tasks with clear acceptance criteria
4. **Testing Phase**: Implemented comprehensive test coverage including property-based tests

### AI-Assisted Areas
- ✅ Project scaffolding and configuration
- ✅ Database schema design and Mongoose models
- ✅ Service layer implementation with business logic
- ✅ API endpoint creation with validation
- ✅ Authentication and security middleware
- ✅ Frontend components and state management
- ✅ Test suite creation (unit, integration, property-based)
- ✅ Documentation and code comments

### Human Oversight
While AI tools accelerated development, all code was:
- Reviewed for correctness and security
- Tested thoroughly with automated tests
- Validated against requirements
- Refined based on best practices

The combination of AI assistance and human oversight enabled rapid development of a production-quality application with comprehensive testing and documentation.

## 📄 License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Built with ❤️ using TypeScript, React, Express.js, and MongoDB**
