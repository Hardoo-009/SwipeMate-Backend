# SwipeMate — Backend API 🚀

SwipeMate is a high-performance backend application built with **Node.js**, **Express.js**, **MongoDB**, and **Redis**, designed to power a developer-focused networking and matchmaking application (similar to Tinder for developers). It enables developers to discover peers, exchange connection requests (`interested` / `ignored`), manage relationships (`accepted` / `rejected`), view matched connections, and edit developer profiles.

---

## 🌟 Key Engineering & Architectural Highlights

- **Stateful Token Invalidation with Redis**: Uses **JWT** tokens sent via secure `httpOnly` cookies for stateless request authentication. On logout, tokens are blacklisted in **Redis** with an exact TTL matching the remaining token expiration time (`exp` payload).
- **Matchmaking & Recommendation Engine**: Designed an algorithm (`/user/feed`) utilizing MongoDB query operators (`$nin`, `$ne`, `$or`) to compute a user's match pool dynamically while filtering out:
  - Already connected users (`accepted`).
  - Pending connection requests (`interested`).
  - Self-ignored developers (`ignored`).
  - Users with active **30-day rejection cooldowns**.
- **Rejection Cooldown Lifecycle**: Implemented logic where rejected connection requests lock the relationship for 30 days. After 30 days, the cooldown automatically expires, placing the developer back into the match pool for potential reconnects.
- **Database Integrity & Schema Optimizations**:
  - **Compound Indexes**: Indexed `{ fromUserId: 1, toUserId: 1 }` on `ConnectionRequest` schema to guarantee relationship query speed and uniqueness.
  - **Mongoose Pre-Save Hooks**: Native schema middleware preventing self-connection requests at the database layer.
  - **Data Sanitization**: Response data projection to ensure password hashes and internal fields are never exposed.
- **Parallel Database & Cache Bootstrapping**: Uses `Promise.all()` to guarantee synchronous initialization of MongoDB and Redis before accepting incoming server traffic.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime & Framework**: Node.js, Express.js
- **Database & ORM**: MongoDB, Mongoose
- **In-Memory Caching & Session Blacklist**: Redis Client (`redis`)
- **Authentication & Security**: JSON Web Tokens (`jsonwebtoken`), `bcrypt`, `cookie-parser`, `cors`
- **Validation**: `validator`
- **Environment & Tools**: `dotenv`, `nodemon`

---

## 📂 Project Structure

```
SwipeMate/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection handler
│   │   └── redis.js             # Redis client configuration
│   ├── middlewares/
│   │   └── checkvalidmiddleware.js # JWT verification & Redis blacklist check middleware
│   ├── models/
│   │   ├── connectionrequest.js # Mongoose schema for connection status & compound index
│   │   └── user.js              # User schema, password hashing & schema methods
│   ├── routes/
│   │   ├── auth.js              # Signup, login, logout & token blacklisting
│   │   ├── profile.js           # View & edit user profile routes
│   │   ├── request.js           # Send, ignore, accept & reject connection requests
│   │   └── user.js              # User connections, received/sent requests & discovery feed
│   └── utils/
│       └── validate.js          # Validation helpers for signup and profile updates
├── src/app.js                   # Application entry point & server bootstrap
├── package.json
└── README.md
```

---

## 📡 API Reference Overview

### 🔑 Authentication (`/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/signup` | Registers a new user, hashes password, sets JWT cookie | ❌ |
| `POST` | `/auth/login` | Authenticates credentials and sets `httpOnly` JWT cookie | ❌ |
| `POST` | `/auth/logout` | Clears cookie & adds token to Redis blacklist with TTL | `YES` |

### 👤 Profile Management (`/profile`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/profile/view` | Fetches logged-in developer's profile (excl. password) | `YES` |
| `PATCH` | `/profile/edit` | Validates & updates allowed profile fields (`skills`, `about`, `photoUrl`, etc.) | `YES` |

### 🤝 Connection Requests (`/request`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/request/send/:status/:toUserId` | Send request with status (`interested` or `ignored`) | `YES` |
| `POST` | `/request/review/:status/:requestId` | Review incoming request with status (`accepted` or `rejected`) | `YES` |

### ⚡ User Feed & Connections (`/user`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/user/requests/received` | Gets all pending incoming connection requests (`interested`) | `YES` |
| `GET` | `/user/requests/sent` | Gets all requests sent by the logged-in user | `YES` |
| `GET` | `/user/connections` | Gets list of accepted connections/matches | `YES` |
| `GET` | `/user/feed?page=1&limit=30` | Paginated developer discovery feed excluding active relationships & cooldowns | `YES` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB instance (Local or Atlas)
- Redis instance

### Installation & Execution

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/SwipeMate-Backend.git
   cd SwipeMate-Backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DB_CONNECTION_SECRET=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Run the application**:
   - Development mode:
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```

---

## 🛡️ Security & Best Practices Implemented

- **Password Hashing**: `bcrypt` with salt rounds of 10.
- **XSS Protection**: JWT is dispatched exclusively via `httpOnly` secure cookies.
- **Payload Validation**: Strict check against unauthorized key mutations during profile updates.
- **Re-play Prevention**: Invalidates logged-out JWTs via Redis TTL blacklisting.
