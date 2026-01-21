# Testing Guide

This document provides comprehensive guidance on testing in the Hacker News Clone project. It covers how to run tests, understand our testing approach, write new tests, and interpret coverage reports.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Property-Based Testing](#property-based-testing)
- [Writing New Tests](#writing-new-tests)
- [Coverage Requirements](#coverage-requirements)
- [Test Organization](#test-organization)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Hacker News Clone uses a comprehensive testing strategy that includes:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints and component interactions with real dependencies
- **Property-Based Tests**: Test invariants across many generated inputs using fast-check
- **Component Tests**: Test React components with React Testing Library

### Testing Philosophy

Our testing approach follows these principles:

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Property-Based Testing for Critical Logic**: Use PBT to verify correctness properties across many inputs
3. **Integration Over Mocking**: Prefer real dependencies (in-memory database) over mocks when practical
4. **Fast Feedback**: Tests should run quickly to enable rapid development
5. **Clear Failure Messages**: Tests should clearly indicate what went wrong

## Test Types

### 1. Unit Tests

Unit tests verify individual functions work correctly in isolation.

**Location**: Co-located with source files using `.test.ts` suffix
- Backend: `backend/src/**/*.test.ts`
- Frontend: `frontend/src/**/*.test.tsx`

**Example**: Testing password hashing utility
```typescript
// backend/src/utils/__tests__/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../password';

describe('Password Utilities', () => {
  it('should hash password and verify correctly', async () => {
    const password = 'SecurePass123!';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword('WrongPass', hash)).toBe(false);
  });
});
```

### 2. Integration Tests

Integration tests verify complete request-response cycles with real dependencies.

**Location**: Same as unit tests, often in service or controller test files

**Example**: Testing authentication endpoint
```typescript
// backend/src/services/__tests__/authService.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { register, login } from '../authService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Authentication Service', () => {
  it('should register and login user', async () => {
    const user = await register('testuser', 'test@example.com', 'Password123!');
    expect(user.username).toBe('testuser');
    
    const result = await login('test@example.com', 'Password123!');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});
```

### 3. Property-Based Tests

Property-based tests verify invariants hold across many randomly generated inputs.

**Location**: Separate files with `.property.test.ts` suffix
- Backend: `backend/src/**/*.property.test.ts`
- Frontend: `frontend/src/**/*.property.test.tsx`

**Example**: Testing vote state transitions
```typescript
// backend/src/services/__tests__/voteService.property.test.ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { handleVote } from '../voteService';

/**
 * Property 17: Vote State Transition - No Vote to Upvote
 * For any post or comment with no existing vote from a user, when that user upvotes,
 * the target's points should increase by exactly 1.
 * **Validates: Requirements 5.1, 8.1**
 */
describe('Property 17: No vote to upvote', () => {
  it('should increase points by 1 for any initial points value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -100, max: 100 }), // Initial points
        async (initialPoints) => {
          // Setup test data...
          const result = await handleVote(userId, targetId, 'post', 1);
          
          // Verify property holds
          expect(result.points).toBe(initialPoints + 1);
        }
      ),
      { numRuns: 100 } // Run 100 times with different inputs
    );
  });
});
```

### 4. Component Tests

Component tests verify React components render correctly and handle user interactions.

**Location**: `frontend/src/**/__tests__/*.test.tsx`

**Example**: Testing PostItem component
```typescript
// frontend/src/components/__tests__/PostItem.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostItem } from '../PostItem';

describe('PostItem', () => {
  it('should render post with title and metadata', () => {
    const post = {
      _id: '1',
      title: 'Test Post',
      points: 42,
      comment_count: 5,
      author: { username: 'testuser' },
      created_at: new Date()
    };
    
    render(<PostItem post={post} userVote={0} onVote={vi.fn()} />);
    
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.getByText('42 points')).toBeInTheDocument();
    expect(screen.getByText('5 comments')).toBeInTheDocument();
  });
  
  it('should call onVote when upvote button clicked', () => {
    const onVote = vi.fn();
    const post = { /* ... */ };
    
    render(<PostItem post={post} userVote={0} onVote={onVote} />);
    
    fireEvent.click(screen.getByLabelText('Upvote'));
    expect(onVote).toHaveBeenCalledWith(1);
  });
});
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/services/__tests__/authService.test.ts

# Run tests matching a pattern
npm test -- --grep "authentication"

# Run only property-based tests
npm test -- --grep "Property"
```

### Frontend Tests

```bash
cd frontend

# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/components/__tests__/PostItem.test.tsx

# Run tests matching a pattern
npm test -- --grep "PostItem"
```

### Running All Tests

From the project root:

```bash
# Run backend and frontend tests sequentially
cd backend && npm test && cd ../frontend && npm test

# Or use a script (if added to root package.json)
npm test
```

### Test Output

Tests use Vitest, which provides clear output:

```
✓ backend/src/services/__tests__/authService.test.ts (5)
  ✓ Authentication Service (5)
    ✓ should register user with valid credentials
    ✓ should reject duplicate email
    ✓ should reject weak password
    ✓ should login with valid credentials
    ✓ should reject invalid credentials

Test Files  1 passed (1)
     Tests  5 passed (5)
  Start at  10:30:00
  Duration  2.34s
```

## Property-Based Testing

Property-based testing (PBT) is a powerful technique for verifying correctness. Instead of writing specific test cases, you define **properties** (invariants) that should hold for all valid inputs.

### What is a Property?

A property is a characteristic that should always be true. For example:

- **Vote Property**: "For any post, the points should equal the sum of all vote directions"
- **Sorting Property**: "For any list sorted by 'new', each post should have created_at >= next post"
- **Pagination Property**: "For any pagination parameters, each item should appear exactly once across all pages"

### Why Use Property-Based Testing?

1. **Finds Edge Cases**: Automatically tests with many inputs you wouldn't think to write
2. **Verifies Invariants**: Ensures correctness properties hold universally
3. **Reduces Test Code**: One property test replaces many specific test cases
4. **Better Coverage**: Tests behavior across the entire input space

### Property-Based Testing with fast-check

We use [fast-check](https://github.com/dubzzz/fast-check) for property-based testing.

#### Basic Structure

```typescript
import fc from 'fast-check';

it('property description', async () => {
  await fc.assert(
    fc.asyncProperty(
      // Arbitraries: generators for test inputs
      fc.integer({ min: 0, max: 100 }),
      fc.string({ minLength: 1, maxLength: 50 }),
      
      // Property function: receives generated inputs
      async (number, text) => {
        // Arrange: setup test data
        const result = await someFunction(number, text);
        
        // Assert: verify property holds
        expect(result).toSatisfyProperty();
      }
    ),
    { numRuns: 100 } // Run 100 times with different inputs
  );
});
```

#### Common Arbitraries

```typescript
// Numbers
fc.integer({ min: 0, max: 100 })
fc.nat() // Natural numbers (0, 1, 2, ...)
fc.float({ min: 0, max: 1 })

// Strings
fc.string() // Any string
fc.string({ minLength: 1, maxLength: 300 }) // Bounded length
fc.emailAddress() // Valid email format
fc.webUrl() // Valid URL

// Arrays
fc.array(fc.integer()) // Array of integers
fc.array(fc.string(), { minLength: 1, maxLength: 10 }) // Bounded array

// Objects
fc.record({
  name: fc.string(),
  age: fc.integer({ min: 0, max: 120 })
})

// Choices
fc.constantFrom('post', 'comment') // Pick from values
fc.oneof(fc.string(), fc.integer()) // Union types

// Custom generators
fc.string().filter(s => s.length > 0) // Filter values
fc.string().map(s => s.toUpperCase()) // Transform values
```

#### Property Test Examples

**Example 1: Vote State Transitions**

```typescript
/**
 * Property: Points should always equal sum of all vote directions
 */
it('Property 22: Points reflect vote sum', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.constantFrom(1, -1), { minLength: 1, maxLength: 20 }),
      async (voteDirections) => {
        // Create post and voters
        const post = await createTestPost();
        const voters = await Promise.all(
          voteDirections.map(() => createTestUser())
        );
        
        // Cast all votes
        for (let i = 0; i < voters.length; i++) {
          await handleVote(voters[i]._id, post._id, 'post', voteDirections[i]);
        }
        
        // Verify property: points = sum of votes
        const expectedSum = voteDirections.reduce((sum, dir) => sum + dir, 0);
        const updatedPost = await Post.findById(post._id);
        expect(updatedPost.points).toBe(expectedSum);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Example 2: Sorting Correctness**

```typescript
/**
 * Property: "new" sort should order by created_at descending
 */
it('Property 13: New sort ordering', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.date(), { minLength: 2, maxLength: 20 }),
      async (dates) => {
        // Create posts with different timestamps
        const posts = await Promise.all(
          dates.map(date => createTestPost({ created_at: date }))
        );
        
        // Get posts sorted by "new"
        const result = await getPosts({ sort: 'new' });
        
        // Verify property: each post.created_at >= next post.created_at
        for (let i = 0; i < result.posts.length - 1; i++) {
          expect(result.posts[i].created_at.getTime())
            .toBeGreaterThanOrEqual(result.posts[i + 1].created_at.getTime());
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Example 3: Input Validation**

```typescript
/**
 * Property: XSS prevention should remove all script tags
 */
it('Property 33: XSS prevention', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 1000 }),
      fc.constantFrom('<script>', '<img onerror=', '<iframe>'),
      async (text, xssPayload) => {
        const maliciousContent = text + xssPayload + text;
        const sanitized = sanitizeText(maliciousContent);
        
        // Verify property: no script tags in output
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('<iframe');
      }
    ),
    { numRuns: 100 }
  );
});
```

### Debugging Property Test Failures

When a property test fails, fast-check provides a counterexample:

```
Error: Property failed after 23 runs
Counterexample: [42, "test string"]
Seed: 1234567890
```

To reproduce the failure:

```typescript
await fc.assert(
  fc.asyncProperty(/* ... */),
  { 
    numRuns: 100,
    seed: 1234567890 // Use seed from failure
  }
);
```

Or test with the specific counterexample:

```typescript
it('debug specific case', async () => {
  const result = await someFunction(42, "test string");
  expect(result).toSatisfyProperty();
});
```

## Writing New Tests

### Guidelines for Writing Tests

1. **Test One Thing**: Each test should verify one specific behavior
2. **Use Descriptive Names**: Test names should clearly state what is being tested
3. **Follow AAA Pattern**: Arrange (setup), Act (execute), Assert (verify)
4. **Clean Up**: Use `beforeEach`/`afterEach` to reset state between tests
5. **Avoid Test Interdependence**: Tests should not depend on execution order

### Adding a Unit Test

**Step 1**: Create or open the test file

```bash
# For new file
touch backend/src/utils/__tests__/myUtil.test.ts
```

**Step 2**: Write the test

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myUtil';

describe('myFunction', () => {
  it('should return expected result for valid input', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
  
  it('should throw error for invalid input', () => {
    expect(() => myFunction(null)).toThrow('Invalid input');
  });
});
```

### Adding an Integration Test

**Step 1**: Set up test database

```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections before each test
  await User.deleteMany({});
  await Post.deleteMany({});
});
```

**Step 2**: Write the test

```typescript
describe('Post Service Integration', () => {
  it('should create post and retrieve it', async () => {
    // Arrange
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash'
    });
    
    // Act
    const post = await createPost({
      title: 'Test Post',
      url: 'https://example.com',
      authorId: user._id
    });
    
    const retrieved = await getPostById(post._id);
    
    // Assert
    expect(retrieved.title).toBe('Test Post');
    expect(retrieved.author_id.toString()).toBe(user._id.toString());
  });
});
```

### Adding a Property-Based Test

**Step 1**: Identify the property

Ask: "What should always be true regardless of input?"

Examples:
- "Points should always equal sum of votes"
- "Sorted list should be in correct order"
- "Sanitized text should contain no script tags"

**Step 2**: Choose appropriate arbitraries

```typescript
// For testing vote logic
fc.array(fc.constantFrom(1, -1), { minLength: 1, maxLength: 20 })

// For testing sorting
fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 2, maxLength: 50 })

// For testing validation
fc.string({ minLength: 1, maxLength: 300 })
```

**Step 3**: Write the property test

```typescript
/**
 * Property X: [Property Name]
 * [Description of what should always be true]
 * **Validates: Requirements X.Y**
 */
describe('Property X: [Property Name]', () => {
  it('should [property description]', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitraries
        fc.integer({ min: 0, max: 100 }),
        
        // Property function
        async (input) => {
          // Arrange
          const testData = await setupTestData(input);
          
          // Act
          const result = await functionUnderTest(testData);
          
          // Assert property
          expect(result).toSatisfyProperty();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Adding a Component Test

**Step 1**: Set up test file

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyComponent } from '../MyComponent';
```

**Step 2**: Write the test

```typescript
describe('MyComponent', () => {
  it('should render with props', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  
  it('should handle user interaction', async () => {
    const onSubmit = vi.fn();
    render(<MyComponent onSubmit={onSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
```

## Coverage Requirements

### Coverage Targets

The project maintains the following coverage requirements:

| Area | Target | Rationale |
|------|--------|-----------|
| **Backend Business Logic** | 80%+ | Critical for correctness |
| **Backend Services** | 80%+ | Core functionality |
| **Backend Middleware** | 70%+ | Important but simpler |
| **Frontend Components** | 70%+ | User-facing code |
| **Frontend Services** | 80%+ | API integration |

### Viewing Coverage Reports

**Generate coverage report:**

```bash
# Backend
cd backend
npm run test:coverage

# Frontend
cd frontend
npm run test:coverage
```

**View HTML report:**

```bash
# Backend
open backend/coverage/index.html

# Frontend
open frontend/coverage/index.html
```

**Coverage report shows:**
- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of conditional branches tested
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

### Interpreting Coverage

**Good coverage (80%+):**
```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
authService.ts      |   95.2  |   88.9   |  100.0  |   95.0
voteService.ts      |   92.3  |   85.7   |  100.0  |   92.1
```

**Areas needing attention (<80%):**
```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
postService.ts      |   72.5  |   66.7   |   85.7  |   71.8
```

### Coverage Best Practices

1. **Focus on Business Logic**: Prioritize testing critical paths
2. **Don't Chase 100%**: Some code (error handlers, edge cases) is hard to test
3. **Quality Over Quantity**: Well-designed tests are better than many poor tests
4. **Use Coverage to Find Gaps**: Identify untested code paths
5. **Document Untested Code**: Add comments explaining why code isn't tested

### Excluded from Coverage

The following are excluded from coverage requirements:

- Test files (`*.test.ts`, `*.test.tsx`)
- Configuration files (`*.config.ts`)
- Type definitions (`*.d.ts`)
- Build output (`dist/`, `build/`)
- Node modules

## Test Organization

### File Structure

Tests are co-located with source code:

```
src/
├── services/
│   ├── authService.ts
│   └── __tests__/
│       ├── authService.test.ts          # Unit/integration tests
│       └── authService.property.test.ts # Property-based tests
├── components/
│   ├── PostItem.tsx
│   └── __tests__/
│       ├── PostItem.test.tsx            # Component tests
│       └── PostItem.property.test.tsx   # Property tests (if applicable)
```

### Naming Conventions

- **Unit/Integration Tests**: `*.test.ts` or `*.test.tsx`
- **Property-Based Tests**: `*.property.test.ts` or `*.property.test.tsx`
- **Test Suites**: Use `describe()` blocks to group related tests
- **Test Names**: Use `it('should ...')` format

### Test Data Management

**Create helper functions for test data:**

```typescript
// backend/src/__tests__/helpers.ts
export async function createTestUser(overrides = {}) {
  const uniqueId = Math.random().toString(36).substring(7);
  return await User.create({
    username: `user${uniqueId}`,
    email: `${uniqueId}@test.com`,
    password_hash: 'hashedpassword',
    ...overrides
  });
}

export async function createTestPost(overrides = {}) {
  const user = await createTestUser();
  return await Post.create({
    title: 'Test Post',
    url: 'https://example.com',
    type: 'link',
    author_id: user._id,
    points: 0,
    comment_count: 0,
    ...overrides
  });
}
```

**Use in tests:**

```typescript
it('should vote on post', async () => {
  const user = await createTestUser();
  const post = await createTestPost();
  
  await voteOnPost({ userId: user._id, postId: post._id, direction: 1 });
  
  const updated = await Post.findById(post._id);
  expect(updated.points).toBe(1);
});
```

## Best Practices

### General Testing Best Practices

1. **Write Tests First (TDD)**: Consider writing tests before implementation
2. **Keep Tests Simple**: Tests should be easier to understand than the code they test
3. **Test Behavior, Not Implementation**: Don't test internal details
4. **Use Meaningful Assertions**: `expect(user.isAdmin).toBe(true)` not `expect(user.role).toBe('admin')`
5. **Avoid Test Interdependence**: Each test should be independent
6. **Clean Up Resources**: Always clean up database, files, etc.
7. **Use Descriptive Names**: Test names should explain what is being tested
8. **Group Related Tests**: Use `describe()` blocks to organize tests

### Property-Based Testing Best Practices

1. **Start with Simple Properties**: Begin with obvious invariants
2. **Use Appropriate Generators**: Choose arbitraries that match your domain
3. **Run Enough Iterations**: 100+ runs for critical properties
4. **Shrink Counterexamples**: fast-check automatically finds minimal failing case
5. **Document Properties**: Clearly state what property is being tested
6. **Link to Requirements**: Reference which requirements the property validates

### Component Testing Best Practices

1. **Test User Behavior**: Focus on what users see and do
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Avoid Implementation Details**: Don't test state or props directly
4. **Test Accessibility**: Ensure components are accessible
5. **Mock External Dependencies**: Mock API calls, not internal functions

### Integration Testing Best Practices

1. **Use Real Dependencies**: Prefer in-memory database over mocks
2. **Test Complete Flows**: Test entire request-response cycles
3. **Verify Side Effects**: Check database changes, not just return values
4. **Test Error Scenarios**: Verify error handling works correctly
5. **Clean Up Between Tests**: Reset database state

## Troubleshooting

### Common Test Issues

#### Tests Fail Intermittently

**Problem**: Tests pass sometimes and fail other times

**Causes**:
- Race conditions in async code
- Shared state between tests
- Timing-dependent assertions

**Solutions**:
```typescript
// Use waitFor for async assertions
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Clean up between tests
beforeEach(async () => {
  await User.deleteMany({});
  await Post.deleteMany({});
});

// Use proper async/await
await createPost(); // Don't forget await!
```

#### Property Tests Fail with Counterexample

**Problem**: Property test fails with specific input

**Solution**:
1. Note the counterexample and seed from error message
2. Create a specific unit test with that input
3. Fix the bug
4. Re-run property test to verify fix

```typescript
// Property test failed with counterexample: [42, -1]
it('debug counterexample', async () => {
  const result = await handleVote(userId, postId, 'post', -1);
  // Debug and fix the issue
});
```

#### MongoDB Memory Server Issues

**Problem**: Tests fail with MongoDB connection errors

**Solutions**:
```typescript
// Increase timeout for slow systems
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000); // 30 second timeout

// Ensure cleanup
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Check for existing connections
beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // ... connect to test database
});
```

#### Coverage Not Updating

**Problem**: Coverage report doesn't reflect recent changes

**Solutions**:
```bash
# Clear coverage cache
rm -rf coverage/

# Clear Vitest cache
rm -rf node_modules/.vitest/

# Re-run with coverage
npm run test:coverage
```

#### Tests Timeout

**Problem**: Tests exceed default timeout

**Solutions**:
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout

// Increase timeout for all tests in suite
describe('Slow Suite', () => {
  beforeAll(() => {
    vi.setConfig({ testTimeout: 10000 });
  });
  
  // tests...
});
```

#### Mock Not Working

**Problem**: Mocked function still calls real implementation

**Solutions**:
```typescript
// Use vi.mock at top level
vi.mock('../api', () => ({
  fetchData: vi.fn()
}));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// Verify mock was called
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
```

### Getting Help

If you encounter issues not covered here:

1. **Check Test Output**: Read error messages carefully
2. **Run Single Test**: Isolate the failing test
3. **Check Setup/Teardown**: Verify beforeEach/afterEach are correct
4. **Review Recent Changes**: What changed since tests last passed?
5. **Check Dependencies**: Ensure test dependencies are installed
6. **Consult Documentation**: 
   - [Vitest Docs](https://vitest.dev/)
   - [fast-check Docs](https://github.com/dubzzz/fast-check)
   - [React Testing Library Docs](https://testing-library.com/react)

---

## Summary

This testing guide provides everything you need to understand, run, and write tests for the Hacker News Clone project. Key takeaways:

- **Run tests frequently** during development for fast feedback
- **Use property-based testing** for critical business logic
- **Maintain coverage targets** (80% backend, 70% frontend)
- **Write clear, focused tests** that verify behavior
- **Clean up resources** to avoid test interdependence

For more information, see:
- [README.md](./README.md) - Project overview and setup
- [API.md](./API.md) - API endpoint documentation
- [.kiro/specs/hacker-news-clone/](./kiro/specs/hacker-news-clone/) - Requirements and design documents

Happy testing! 🧪
