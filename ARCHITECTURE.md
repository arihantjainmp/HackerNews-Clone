# System Architecture

## 1. High-Level Architecture

The Hacker News Clone is designed as a **Service-Oriented 3-Tier Application**. It emphasizes separation of concerns, strict type safety, and stateless scalability.

```
[Client Layer]        [Application Layer]        [Data Layer]
   React SPA   <--->   Express REST API   <--->   MongoDB
      ^                       ^
      |                       |
   Nginx/Vite           Node.js Runtime
```

### 1.1 Layers
*   **Presentation Layer (Frontend):** React 18 application handling UI rendering, client-side routing, and state management.
*   **Business Logic Layer (Backend):** Node.js/Express application implementing RESTful endpoints, authentication logic, and domain services.
*   **Persistence Layer (Database):** MongoDB document store managing users, posts, comments, and votes.

---

## 2. Security Architecture

The system implements a "Defense in Depth" strategy, specifically hardened against common web vulnerabilities.

### 2.1 Authentication & Session Management
*   **Mechanism:** Dual-token JWT (Access Token + Refresh Token).
*   **Transport Security:**
    *   **Access Token (15 min):** Transmitted via **HttpOnly, Secure, SameSite=Strict** cookies. This completely mitigates XSS token theft vectors.
    *   **Refresh Token (7 days):** Also stored in a hardened cookie. Used to rotate the access token transparently.
*   **Token Rotation:** Implements Reuse Detection. Using a used refresh token triggers a security alert and invalidates the entire token family (forcing re-login).

### 2.2 Input Validation & Sanitization
*   **Schema Validation:** `Joi` middleware validates all request bodies (types, lengths, formats) before reaching the controller.
*   **NoSQL Injection:** `express-mongo-sanitize` middleware strips `$` prefixes from input keys to prevent operator injection attacks.
*   **XSS Prevention:** `sanitize-html` strips dangerous tags (`<script>`, `<iframe>`) and attributes (`onclick`) from user-generated content (posts, comments) at the service boundary.

---

## 3. Data Architecture (MongoDB)

### 3.1 Schema Design
The database schema balances normalization for consistency and denormalization for read performance.

*   **Users:** Stores credentials and profile data.
*   **Posts:** Stores content and cached counters (`points`, `comment_count`).
    *   *Design Decision:* Counters are denormalized on the Post document to allow O(1) read access for the feed, avoiding expensive `count()` queries on read.
*   **Comments:** Adjacency List pattern. Each comment stores a `parent_id` and `post_id`.
    *   *Trade-off:* Fast writes/updates. Tree reconstruction happens at the application level (O(n)).
*   **Votes:** Tracks unique user-target relationships to enforce "one vote per user".
*   **Notifications:** Stores event-driven alerts (`comment_reply`, `post_comment`).

### 3.2 Performance Optimization: The "Best" Sort
Calculating the Hacker News "Best" ranking involves a dynamic score based on time decay:
`Score = (Points - 1) / (Hours + 2)^1.8`

*   **Implementation:** **MongoDB Aggregation Pipeline**.
*   **Pipeline Stages:**
    1.  `$match`: Filter posts (search/tags).
    2.  `$addFields`: Dynamically calculate `score` using arithmetic operators (`$divide`, `$pow`, `$subtract`).
    3.  `$sort`: Order by the calculated `score`.
    4.  `$limit`: Pagination.
*   **Impact:** Offloads CPU-intensive math to the database engine, allowing the Node.js event loop to remain non-blocking.

---

## 4. Service Layer Design

### 4.1 Comment Threading Service
*   **Problem:** Storing comments as a flat list but rendering them as a nested tree.
*   **Solution:** Two-pass reconstruction algorithm.
    1.  Create a Map of all comments by ID.
    2.  Iterate through comments, attaching each to its parent's `replies` array in the Map.
    3.  Return only the root nodes.
*   **Soft Deletion:** Deleting a comment checks for descendants. If descendants exist, the comment is marked `is_deleted` (content masked) but the node remains to preserve the thread structure.

### 4.2 Atomic Voting Service
*   **Concurrency Control:** Uses MongoDB atomic operators (`$inc`) for updating point totals. This ensures correctness under high concurrency (no race conditions).
*   **Logic:**
    *   `Vote`: Update `Votes` collection (upsert/update).
    *   `Score`: Atomically increment/decrement `Post.points`.
    *   **Idempotency:** Re-casting the same vote acts as a "toggle" (removes the vote).

### 4.3 Notification System
*   **Trigger Model:** The system uses an event-driven approach within the service layer.
    *   When a **Comment** is created on a Post -> `post_comment` notification created for Post Author.
    *   When a **Reply** is created on a Comment -> `comment_reply` notification created for Parent Comment Author.
*   **Self-Action filtering:** Logic exists to prevent notifications if a user comments on their own post.
*   **Read State:** Notifications track `is_read` status. Users can mark individual items as read or "Mark All Read".
*   **Data Aggregation:** The `getNotifications` service uses `$lookup` (MongoDB Join) to populate related Post and User details, minimizing frontend round-trips.

---

## 5. Frontend Architecture

### 5.1 State Management
*   **Context API:** Used for global application state (User Session).
*   **Local State:** Used for transient data (Post lists, Form inputs) to minimize complexity.

### 5.2 Network Layer (Axios Interceptors)
*   **Request:** Automatically appends cookies (browser standard behavior with `withCredentials: true`).
*   **Response:** Global error handling.
    *   *401 Handler:* Intercepts 401s, attempts to call `/refresh` endpoint transparently, and retries the original request.
    *   *Loop Prevention:* Logic exists to detect and break infinite refresh loops if the session is truly invalid.

---

## 6. Infrastructure & DevOps

### 6.1 Containerization
*   **Docker Compose:** Orchestrates the full stack.
*   **Networking:** Internal bridge network allowing Backend ↔ Database communication without exposing DB ports to the host.
*   **Volumes:** Named volumes ensure data persistence across container restarts.

### 6.2 CI/CD Pipeline (GitHub Actions)
*   **Trigger:** Push/PR to `main`.
*   **Jobs:**
    1.  **Build:** Compiles TypeScript for both frontend and backend.
    2.  **Test:** Runs the full test suite (560+ tests) against an ephemeral MongoDB instance.
    3.  **Lint:** Verifies code style compliance.

---

## 7. Design Decisions & Trade-offs

| Decision | Alternative | Reason Chosen |
| :--- | :--- | :--- |
| **Express.js** | Next.js | Strict separation of backend/frontend concerns as requested by specs; cleaner MVC pattern implementation. |
| **MongoDB** | SQL (Postgres) | Flexible schema fits the JSON-like nature of posts/comments; Aggregation pipeline offers powerful analytics capabilities. |
| **HttpOnly Cookies** | LocalStorage | Critical security requirement. LocalStorage is vulnerable to XSS; cookies are not accessible to JS. |
| **Denormalization** | Normalization | `comment_count` and `points` are read frequently (Feed) but updated infrequently (Vote/Comment). Denormalization optimizes the Read path. |