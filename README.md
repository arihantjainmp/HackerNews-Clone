# Hacker News Clone

A full-stack production-grade Hacker News clone built with **React**, **Node.js/Express**, and **MongoDB**. This project implements a secure, scalable architecture with comprehensive feature parity to the original platform.

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v20+)
- MongoDB (v7.0+)
- Docker & Docker Compose (optional)

### Option 1: Quick Start with Docker
The fastest way to spin up the entire stack (Frontend, Backend, and Database).

```bash
docker-compose up --build
```
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Option 2: Local Development

#### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your secrets
npm run dev
```

#### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 🔐 Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/hackernews` |
| `JWT_SECRET` | Secret for Access Tokens (15m) | *Required* |
| `REFRESH_TOKEN_SECRET` | Secret for Refresh Tokens (7d) | *Required* |
| `PORT` | API Server Port | `5000` |
| `FRONTEND_URL` | CORS Origin for Frontend | `http://localhost:3000` |

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API Base URL | `http://localhost:5000` |

## 🤖 AI Tools Used

This project was developed with the assistance of **Gemini AI Agent (CLI)**.

**How AI Assisted Development:**
1.  **Security Hardening**: The AI identified XSS vulnerabilities in the initial `localStorage` token implementation and refactored the entire authentication system to use **HttpOnly, Secure, and SameSite=Strict Cookies**.
2.  **Vulnerability Mitigation**: Implemented **NoSQL Injection protection** using `express-mongo-sanitize` across all backend routes.
3.  **Performance Optimization**: Refactored the dynamic "Best" sorting algorithm from a memory-heavy in-app sort to a high-performance **MongoDB Aggregation Pipeline**.
4.  **Full-Stack Refactoring**: Harmonized frontend state management (`AuthContext`) and API clients to support the secure cookie architecture automatically.
5.  **Quality Assurance**: Generated comprehensive test suites including **Property-Based Testing** (using `fast-check`) to verify business logic invariants.

## ✨ Features

### Core Features
- **Authentication**: Secure Signup, Login, and Logout using HttpOnly cookies.
- **Post Feed**: Paginated list with support for Link and Text submissions.
- **Voting**: Atomic upvote/downvote toggling for posts and comments.
- **Comments**: Unlimited threaded discussions with soft-delete support.
- **Search & Sort**: Advanced sorting (New, Top, Best) and case-insensitive title search.

### Bonus Features
- ✅ **Notifications**: Real-time activity alerts for replies and comments.
- ✅ **Rate Limiting**: API protection against spam/abuse via `express-rate-limit`.
- ✅ **Dockerization**: Containerized environments for consistent deployment.
- ✅ **CI/CD**: GitHub Actions workflow for automated Build and Test.
- ✅ **Mobile-Responsive**: adaptive UI built with Tailwind CSS.

---
*For detailed API specifications, please refer to [API.md](./API.md).*