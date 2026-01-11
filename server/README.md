# Solar Planner v2.0 - Server

Modern Node.js/Express/MongoDB backend with TypeScript, Zod validation, and JWT authentication.

## 🚀 Technology Stack

- **Runtime:** Node.js v22+ (LTS)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Validation:** Zod schemas for request/environment validation
- **Authentication:** Custom JWT (access tokens)
- **Password Hashing:** bcryptjs
- **Logging:** pino (structured JSON logging)
- **Security:** helmet, express-rate-limit, express-slow-down
- **Testing:** Jest with ts-jest

## 📁 Project Structure

```
server/
├── src/
│   ├── app.ts                      # Express app factory
│   ├── server.ts                   # HTTP server bootstrap
│   ├── config/                     # Configuration modules
│   ├── schemas/                    # Zod validation schemas
│   ├── models/                     # Mongoose models
│   ├── services/                   # Business logic layer
│   ├── controllers/                # Request handlers (thin layer)
│   ├── middleware/                 # Auth, validation, error handling
│   ├── routes/                     # API route definitions
│   ├── types/                      # TypeScript type definitions
│   ├── utils/                      # Helper utilities
│   └── env/                        # Environment variable validation
├── tests/                          # Test suites
├── .env.example                    # Environment variables template
├── package.json
└── tsconfig.json
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js v22+ installed
- MongoDB running locally or connection URI available
- npm or pnpm package manager

### Installation

1. **Clone the repository and navigate to server:**
   ```bash
   cd v2/server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your actual values:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Strong secret for JWT signing
   - `EMAIL_*`: Email service credentials
   - `FRONTEND_URL`: Client application URL (for CORS)

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:1235` (or your configured PORT)

### Build for Production

```bash
npm run build
npm start
```

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with ts-node |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint code with ESLint |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |

## 🔐 Architecture Overview

### Layered Design

1. **Routes** → Define endpoints and attach middleware
2. **Controllers** → Thin translation layer (req/res ↔ service)
3. **Services** → Business logic (no HTTP/DB specifics)
4. **Models** → Mongoose schemas and database interaction

### Validation Strategy

- **Zod schemas** validate all inbound data (body, params, query, env)
- **Mongoose models** handle database-specific concerns (indexes, hooks)
- Separation ensures validation happens *before* business logic

### Error Handling

- Central error middleware captures all exceptions
- Typed error objects with consistent format
- Async errors wrapped with `asyncHandler` utility

## 🔌 API Endpoints

### Authentication & Users
```
POST   /users                    - Register new user
POST   /auth/login               - Login (get JWT)
GET    /users/me                 - Current user profile
GET    /users                    - List users (admin)
GET    /users/:id                - User details (admin)
DELETE /users/:id                - Delete user (admin)
PATCH  /users/:id/profile        - Update profile
PATCH  /users/:id/password       - Change password
POST   /auth/password/reset-request  - Request password reset
POST   /auth/password/reset      - Apply password reset
```

### Projects
```
POST   /projects                 - Create project
GET    /projects                 - List/filter projects
GET    /projects/dashboard       - User dashboard stats
GET    /projects/admin/dashboard - Admin dashboard stats
GET    /projects/:id             - Project details
GET    /projects/:id/sun-path    - Sun path calculations
GET    /projects/:id/plan        - Generate plan data
POST   /projects/:id/config/optimal - Optimal panel config
DELETE /projects/:id             - Delete project
DELETE /projects/:id/admin       - Admin delete
```

### Panels
```
POST   /panels                   - Create panel
GET    /panels                   - List/filter panels
GET    /panels/:id               - Panel details
DELETE /panels/:id               - Delete panel
```

## 🧪 Testing

Run tests with:
```bash
npm test
```

Test structure:
- Unit tests for services and utilities
- Integration tests for API endpoints
- Mock MongoDB with in-memory database

## 🔒 Security Features

- **Helmet:** Security headers
- **Rate Limiting:** Prevent brute-force attacks
- **CORS:** Strict origin validation
- **JWT:** Stateless authentication
- **Password Hashing:** bcryptjs with salt rounds
- **Input Validation:** Zod schema validation on all inputs

## 📊 Logging & Observability

- **Logger:** pino (JSON structured logging)
- **Request Correlation:** X-Request-ID header tracking
- **Health Check:** `/health` endpoint
- **Metrics:** `/metrics` endpoint (Prometheus format - planned)

## 🚧 TODO / Deferred Features

- [ ] Refresh token implementation (rotation + revocation)
- [ ] Full Prometheus metrics integration
- [ ] Server-side PDF generation (evaluate pdf-lib)
- [ ] External time-series store for production data
- [ ] Docker configuration
- [ ] CI/CD pipeline
- [ ] Rate limiting customization per endpoint
- [ ] Advanced logging (correlation with tracing)

## 🐛 Troubleshooting

**MongoDB connection fails:**
- Verify MongoDB is running: `mongod --version`
- Check connection string in `.env`
- Ensure network access (firewall, localhost binding)

**TypeScript compilation errors:**
- Run `npm install` to ensure all type definitions are installed
- Check `tsconfig.json` settings match Node.js version

**Port already in use:**
- Change `PORT` in `.env` file
- Kill process using port: `lsof -ti:1235 | xargs kill` (macOS/Linux)

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Zod Documentation](https://zod.dev/)
- [JWT Best Practices](https://jwt.io/introduction)

## 📄 License

MIT License - See LICENSE file for details
