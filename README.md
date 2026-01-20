# Hacker News Clone

A production-grade Hacker News clone built with TypeScript, React, Express.js, and MongoDB.

## Project Structure

```
.
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── models/         # Mongoose data models
│   │   ├── services/       # Business logic layer
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route definitions
│   │   ├── utils/          # Utility functions
│   │   └── __tests__/      # Test files
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API client services
│   │   ├── types/         # TypeScript type definitions
│   │   ├── pages/         # Page components
│   │   └── __tests__/     # Test files
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
└── docker-compose.yml      # Docker orchestration
```

## Tech Stack

### Backend
- **Node.js + Express.js**: REST API server
- **TypeScript**: Type-safe development with strict mode
- **Mongoose**: MongoDB ODM with schema validation
- **JWT**: Authentication with access and refresh tokens
- **bcrypt**: Password hashing
- **Joi**: Input validation
- **express-rate-limit**: API rate limiting

### Frontend
- **React 18**: UI library with hooks
- **TypeScript**: Type-safe development with strict mode
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client with interceptors

### Database
- **MongoDB**: Document database for flexible data modeling

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

### Testing
- **Vitest**: Fast unit test runner
- **fast-check**: Property-based testing
- **Supertest**: HTTP endpoint testing
- **React Testing Library**: Component testing

### Code Quality
- **ESLint**: Linting with TypeScript rules
- **Prettier**: Code formatting

## Prerequisites

- Node.js 20+ (for local development)
- Docker and Docker Compose (for containerized deployment)
- npm or yarn

## Getting Started

### Option 1: Docker (Recommended)

1. Clone the repository
2. Create environment files from examples:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
3. Update the `.env` files with your configuration
4. Start all services:
   ```bash
   docker-compose up --build
   ```
5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: mongodb://localhost:27017

### Option 2: Local Development

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### MongoDB
Ensure MongoDB is running locally on port 27017, or update `MONGODB_URI` in backend/.env

## Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for access tokens
- `REFRESH_TOKEN_SECRET`: Secret key for refresh tokens
- `FRONTEND_URL`: Frontend URL for CORS
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window

### Frontend (.env)
- `VITE_API_URL`: Backend API URL

## Development Scripts

### Backend
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm test`: Run tests
- `npm run lint`: Lint code
- `npm run format`: Format code with Prettier

### Frontend
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm test`: Run tests
- `npm run lint`: Lint code
- `npm run format`: Format code with Prettier

## Features (To Be Implemented)

- User authentication (signup, login, logout)
- Post creation (links and text posts)
- Nested comments with threading
- Voting system for posts and comments
- Sorting (new, top, best)
- Search functionality
- Responsive design
- Rate limiting
- Input validation and sanitization

## License

MIT
