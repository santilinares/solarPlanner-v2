# 🚀 Solar Planner v2.0 - Full-Stack Migration Guide

## AI Prompt for Creating Solar Planner v2.0 (Full-Stack Angular 18 + Node.js)

I need you to create a complete full-stack solar energy planning application from scratch using modern technologies. Work autonomously to scaffold both the backend and frontend with all necessary structure, middleware, and configurations.

## 🎯 PROJECT OVERVIEW

**Application Name:** Solar Planner v2.0
**Purpose:** A solar farm planning system where users can draw areas on a map, calculate solar panel configurations, estimate energy production, and generate PDF plans. Supports multi-role authentication (Admin, User, Visitor).

## 🔧 TECHNOLOGY STACK

### Server (was Backend):
- **Node.js** (latest LTS with Node v22)
- **Express.js** (latest version)
- **MongoDB** via **Mongoose** (ODM for schema + hooks; validated again at request layer with Zod)
- **Architecture:** Layered (Routes → Controllers → Services → Models) + dedicated **schemas/** for Zod validation
- **Authentication:** Custom JWT (access token only for now) with bcryptjs password hashing (no Passport.js)
- **Validation:** Zod schemas for all inbound payloads (request body, params, query, env vars)
- **Error Handling:** Central error middleware + typed error objects
 - **Logging:** `pino` (JSON structured) via wrapper `server/src/utils/logger.ts` + request correlation header (`X-Request-ID`).
 - **Security Hardening:** `helmet`, `express-rate-limit`, `express-slow-down` (applied to login), strict CORS origin from env.
 - **Observability:** `/health` endpoint (basic status) + planned Prometheus metrics with `prom-client` exposed at `/metrics`.
 - **Planned Refresh Tokens:** Deferred cookie-based rotation (see section below).
 - **PDF Plan Data:** Server returns structured plan data JSON; client assembles PDF with jsPDF.

### Client (was Frontend):
- **Angular 21** (latest stable) with **Standalone Components**
- **TypeScript** (strict mode)
- **Angular Material** (latest)
- **Mapping (Free stack):** Leaflet + OpenStreetMap tiles + leaflet-draw + turf.js (cost-free; Google Maps optional later).
- **Charts:** Highcharts with highcharts-angular
- **Architecture:** Feature-first + core/shared separation; lazy-loaded route segments; presentation vs feature pages; optional signals for state
 - **Testing:** Jest (`jest-preset-angular` on client) unified with server Jest + ts-jest.
 - **PDF Generation:** `jsPDF` client-side.

## 📁 REQUIRED FOLDER STRUCTURE

### Server Structure (Revised):
```
server/
├── src/
│   ├── app.ts                      # Express app setup (replaces index.js)
│   ├── server.ts                   # HTTP server bootstrap (replaces start.js)
│   ├── config/
│   │   ├── database.config.ts      # Mongo connection
│   │   ├── jwt.config.ts           # JWT settings & helpers
│   │   └── email.config.ts         # Nodemailer configuration
│   ├── schemas/                    # Zod input & env schemas
│   │   ├── user.schema.ts
│   │   ├── project.schema.ts
│   │   ├── panel.schema.ts
│   │   └── production.schema.ts
│   ├── models/                     # Mongoose models (.ts)
│   │   ├── user.model.ts
│   │   ├── project.model.ts
│   │   ├── panel.model.ts
│   │   └── production.model.ts
│   ├── services/                   # Business logic (no DB / HTTP specifics)
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── project.service.ts
│   │   ├── panel.service.ts
│   │   └── email.service.ts
│   ├── controllers/                # Thin translation layer req→service
│   │   ├── user.controller.ts
│   │   ├── project.controller.ts
│   │   └── panel.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts      # JWT verification (user/admin variants)
│   │   ├── validation.middleware.ts# Zod schema binding
│   │   ├── cors.middleware.ts
│   │   └── error.middleware.ts     # Central error + formatting
│   ├── routes/
│   │   ├── index.ts                # Aggregates feature routers
│   │   ├── user.routes.ts
│   │   ├── project.routes.ts
│   │   └── panel.routes.ts
│   ├── types/                      # Shared TS interfaces & augments
│   │   ├── express.d.ts            # Request typing extensions
│   │   ├── user.types.ts
│   │   ├── project.types.ts
│   │   └── panel.types.ts
│   ├── utils/                      # Helpers (async handler, etc.)
│   │   ├── asyncHandler.ts
│   │   ├── response.ts
│   │   └── logger.ts               # (placeholder, dependency added later)
│   └── env/                        # Parsed & validated env exports
│       └── index.ts
├── tests/                          # Unit / integration tests
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

### Client Structure (Revised):
```
client/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── admin.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   └── jwt.interceptor.ts
│   │   │   └── services/
│   │   │       ├── auth.service.ts
│   │   │       ├── user.service.ts
│   │   │       ├── project.service.ts
│   │   │       ├── panel.service.ts
│   │   │       └── file.service.ts
│   │   │   ├── models/              # Domain interfaces (new)
│   │   │   │   ├── user.model.ts
│   │   │   │   ├── project.model.ts
│   │   │   │   ├── panel.model.ts
│   │   │   │   ├── production-point.model.ts
│   │   │   │   └── auth-token.model.ts
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── header/
│   │   │   │   ├── footer/
│   │   │   │   └── sidebar/
│   │   │   └── widgets/
│   │   │       ├── map/              # Google Maps component
│   │   │       ├── spline-chart/     # Highcharts line chart
│   │   │       ├── column-chart/     # Highcharts column chart
│   │   │       └── multiaxes-chart/  # Highcharts multi-axis
│   │   ├── features/
│   │   │   ├── visitor/              # Public pages (lazy-loaded)
│   │   │   │   ├── landing-page/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── forgot-password/
│   │   │   │   └── reset-password/
│   │   │   ├── user/                 # User dashboard (lazy-loaded)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── add-project/
│   │   │   │   ├── view-project/
│   │   │   │   ├── user-projects/
│   │   │   │   └── panel-list/
│   │   │   └── admin/                # Admin panel (lazy-loaded)
│   │   │       ├── admin-dashboard/
│   │   │       ├── projects-list/
│   │   │       ├── users-list/
│   │   │       └── panels/
│   │   └── layouts/
│   │       ├── visitor-layout/       # Public layout
│   │       ├── user-layout/          # Authenticated user layout
│   │       └── admin-layout/         # Admin layout
│   └── environments/
│       ├── environment.ts
│       └── environment.prod.ts
```

## 📊 DATA LAYER (Schemas vs Models)

We separate **validation schemas** (Zod) from **persistence models** (Mongoose). Zod ensures all inbound data is structurally sound before hitting business logic. Mongoose handles database-specific concerns (indexes, hooks, relations).

### Zod Schemas (`server/src/schemas/*.schema.ts`)
```ts
// user.schema.ts
import { z } from 'zod';

export const UserRoleEnum = z.enum(['user','admin']);
export const AuthMethodEnum = z.enum(['local','google']);

export const UserCreateSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
});

export const UserLoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
});

export const UserUpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(120),
});

export const PasswordResetRequestSchema = z.object({ email: z.string().email().toLowerCase() });
export const PasswordResetApplySchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

// panel.schema.ts
export const PanelCreateSchema = z.object({
  name: z.string().min(2),
  capacity: z.number().positive(), // Watts
  height: z.number().positive(),
  width: z.number().positive(),
  technology: z.enum(['Monocrystalline','Polycrystalline','Thin film']),
  type: z.enum(['global','personal']),
});

// production.schema.ts (subdocument validation for energy points)
export const ProductionPointSchema = z.object({
  dateTime: z.date(),
  pv: z.number().nonnegative(), // kWh or Wh depending on resolution
});

// project.schema.ts
export const GeoPointSchema = z.object({ lat: z.number(), lon: z.number() });

export const ProjectCreateSchema = z.object({
  name: z.string().min(2),
  area: z.array(GeoPointSchema).min(3), // polygon requires ≥3 points
  tilt: z.number().min(0).max(90),
  direction: z.string().min(1),           // e.g. "south"
  rawSpacing: z.number().positive().optional(),
  panelNumber: z.number().int().positive(),
  panelId: z.string().optional(),
});

export const ProjectQuerySchema = z.object({
  owner: z.string().optional(),
  country: z.string().optional(),
  from: z.coerce.date().optional(),  // date filters
  to: z.coerce.date().optional(),
});
```

### Mongoose Models (`server/src/models/*.model.ts`)
```ts
// user.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  method: 'local' | 'google';
  local?: { email?: string; password?: string; saltSecret?: string };
  google?: { email?: string };
  fullName: string;
  role: 'user' | 'admin';
  createdAt: Date;
  verifyPassword(password: string): Promise<boolean>;
  generateJwt(): string;
}

const UserSchema = new Schema<IUser>({
  method: { type: String, enum: ['local','google'], required: true },
  local: {
    email: { type: String, lowercase: true },
    password: { type: String },
    saltSecret: { type: String },
  },
  google: { email: { type: String, lowercase: true } },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

// project.model.ts
import { ProductionPointSchema as ProdZod } from '../schemas/production.schema';
interface IProductionPoint { dateTime: Date; pv: number; }
export interface IProject extends Document {
  name: string;
  area: { lat: number; lon: number }[];
  lat?: number; // derived center
  lon?: number;
  surface?: number; // derived area m²
  country?: string;
  timezone?: string;
  currency?: string;
  price?: number;
  tilt: number;
  direction: string;
  azimuth?: number;
  rawSpacing?: number;
  panelNumber: number;
  panel?: mongoose.Types.ObjectId;
  owner?: mongoose.Types.ObjectId;
  prodToday?: IProductionPoint[];
  nextProd?: IProductionPoint[];
  previousProd?: IProductionPoint[];
  installDate: Date;
}

const ProductionSubSchema = new Schema<IProductionPoint>({
  dateTime: { type: Date, required: true },
  pv: { type: Number, required: true },
},{ _id: false });

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  area: [{ lat: Number, lon: Number }],
  lat: Number,
  lon: Number,
  surface: Number,
  country: String,
  timezone: String,
  currency: String,
  price: Number,
  tilt: { type: Number, required: true },
  direction: { type: String, required: true },
  azimuth: Number,
  rawSpacing: Number,
  panelNumber: { type: Number, required: true },
  panel: { type: Schema.Types.ObjectId, ref: 'Panels' },
  owner: { type: Schema.Types.ObjectId, ref: 'Users' },
  prodToday: [ProductionSubSchema],
  nextProd: [ProductionSubSchema],
  previousProd: [ProductionSubSchema],
  installDate: { type: Date, default: Date.now },
});

// panel.model.ts
export interface IPanel extends Document {
  name: string;
  capacity: number;
  height: number;
  width: number;
  technology: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
  type: 'global' | 'personal';
  owner?: mongoose.Types.ObjectId;
}

const PanelSchema = new Schema<IPanel>({
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  height: { type: Number, required: true },
  width: { type: Number, required: true },
  technology: { type: String, enum: ['Monocrystalline','Polycrystalline','Thin film'], required: true },
  type: { type: String, enum: ['global','personal'], required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'Users' },
});

export const UserModel = mongoose.model<IUser>('Users', UserSchema);
export const ProjectModel = mongoose.model<IProject>('Projects', ProjectSchema);
export const PanelModel = mongoose.model<IPanel>('Panels', PanelSchema);
```

### Production Data Rationale
"Production" is modeled as embedded subdocuments (arrays of time-series points) inside a Project for faster retrieval of recent / forecast data tied to a specific site. If volume grows large or analytics expand, migrate to a dedicated `production_records` collection with indexing on `projectId + dateTime`.

## 🛣️ API ROUTES & ENDPOINTS (Unversioned + Query Filters)

Removed explicit version prefix for simplicity. Versioning can be added later (e.g. `/v2/`) if breaking changes arise.

### Users (`/users` & `/auth`)
```
POST   /users                              - Register (local)
POST   /auth/login                         - Login (email/password)
POST   /auth/google                        - Google OAuth (future)
GET    /users/me                           - Current user profile (auth)
GET    /users                              - List users (admin) filters: ?role=user&email=alice@example.com
GET    /users/:id                          - User details (admin)
DELETE /users/:id                          - Delete user (admin)
PATCH  /users/:id/profile                  - Update full name (self/admin)
PATCH  /users/:id/password                 - Update password (self)
POST   /auth/password/reset-request        - Request password reset (email)
POST   /auth/password/reset                - Apply reset (token + newPassword)
```

### Projects (`/projects`)
```
POST   /projects                           - Create project
GET    /projects                           - List OR filter projects (?id=abcd1234 &owner=uid&country=ES&from=2024-01-01&to=2024-02-01)
  • If ?id= is present: return single project (shortcut to GET /projects/:id)
GET    /projects/dashboard                 - User dashboard aggregates
GET    /projects/admin/dashboard           - Admin dashboard aggregates
GET    /projects/:id                       - Project details
GET    /projects/:id/sun-path              - Sun path calculations
GET    /projects/:id/plan                  - Generate PDF plan
POST   /projects/:id/config/optimal        - Compute optimal panel configuration
DELETE /projects/:id                       - Delete (owner)
DELETE /projects/:id/admin                 - Admin delete override
GET    /projects/admin/summary             - Admin project summary counts
```

### Panels (`/panels`)
```
POST   /panels                             - Create panel (user/admin)
GET    /panels                             - List panels (?id=xyz&type=global|personal&owner=uid)
  • If ?id= is present: return single panel (shortcut to GET /panels/:id)
GET    /panels/:id                         - Panel details
DELETE /panels/:id                         - Delete (owner/admin)
```

### Auth Token Format
Bearer token in `Authorization` header. Potential future refresh endpoint: `/auth/refresh`.

### Refresh Token Strategy (Deferred)
- Post-MVP: introduce `POST /auth/refresh` returning new access token + rotated refresh cookie.
- Refresh token: httpOnly, Secure, SameSite=Strict cookie; stored hashed in Redis or DB with userId + expiry.
- Rotation invalidates previous token (prevents replay).
- Access tokens remain short-lived (15–30m) to minimize risk.
- Logout or compromise: mark refresh token record revoked.

## 🔐 MIDDLEWARE REQUIREMENTS

### JWT Helper Middleware (jwtHelper.js):
Create three middleware functions:

1. **verifyJwtToken** - Basic JWT verification, extracts user _id
2. **verifyUserJwtToken** - Verify JWT + ensure role is 'user'
3. **verifyAdminJwtToken** - Verify JWT + ensure role is 'admin'
4. **verifyPasswordResetJwtToken** - Special verification for password reset tokens

All should:
- Extract token from `Authorization: Bearer <token>` header
- Return 403 if no token
- Return 500 if token invalid
- Attach decoded `req._id` and continue to next()

### CORS Middleware:
- Allow credentials
- Accept requests from frontend origin (configurable via env)
- Allow methods: GET, POST, PUT, DELETE
- Allow headers: Content-Type, Authorization

## 🎨 FRONTEND REQUIREMENTS

### Routing Structure:
```
/                           → VisitorLayout → LandingPage
/login                      → VisitorLayout → Login
/registration               → VisitorLayout → Register
/forgot_password            → VisitorLayout → ForgotPassword
/reset_password/:id/:token  → VisitorLayout → ResetPassword

/projects                   → UserLayout (AuthGuard) → Dashboard
/projects/add               → UserLayout (AuthGuard) → AddProject
/projects/all               → UserLayout (AuthGuard) → UserProjects
/projects/:id               → UserLayout (AuthGuard) → ViewProject
/panels/all                 → UserLayout (AuthGuard) → PanelList

/admin                      → AdminLayout (AdminGuard) → AdminDashboard
/admin/projects             → AdminLayout (AdminGuard) → ProjectsList
/admin/users                → AdminLayout (AdminGuard) → UsersList
/admin/panels               → AdminLayout (AdminGuard) → Panels

/404                        → NotFound component
```

### Authentication Flow:
1. **JWT Storage:** Store token in localStorage
2. **HTTP Interceptor:** Automatically attach `Authorization: Bearer <token>` to all requests
3. **Auth Guard:** Check if token exists and is valid before allowing access to protected routes
4. **Admin Guard:** Extends Auth Guard, decode JWT to verify role === 'admin'
5. **Auto Redirect:** Redirect to /login if token expired or invalid

### Services Required:

**AuthService:**
- login(email, password): Observable<{token: string}>
- register(fullName, email, password): Observable<{token: string}>
- logout(): void (clear localStorage)
- isAuthenticated(): boolean
- getToken(): string | null
- getUserRole(): 'user' | 'admin' | null (decode JWT)

**ProjectService:**
- createProject(projectData): Observable<Project>
- getAllProjects(): Observable<Project[]>
- getProjectById(id): Observable<Project>
- deleteProject(id): Observable<any>
- getDashboardStats(): Observable<Stats>
- generatePlan(id): Observable<Blob> (for PDF download)
- calculateOptimalConfig(params): Observable<Config>

**PanelService:**
- getAllPanels(): Observable<Panel[]>
- getUserPanels(): Observable<Panel[]>
- createPanel(panelData): Observable<Panel>
- deletePanel(id): Observable<any>

**UserService:**
- getUserProfile(): Observable<User>
- updateProfile(fullName): Observable<User>
- updatePassword(oldPassword, newPassword): Observable<any>
- getAllUsers(): Observable<User[]> (Admin only)
- deleteUser(id): Observable<any> (Admin only)

**FileService:**
- downloadPDF(projectId): Observable<Blob>

## 🧩 Angular Domain Interfaces (Client `core/models`)

Interfaces mirror server responses without sensitive fields (e.g. passwords). They are consumed by services and components for type safety.

```ts
// user.model.ts
export interface User {
  _id: string;
  fullName: string;
  email?: string; // local method
  role: 'user' | 'admin';
  method: 'local' | 'google';
  createdAt: string; // ISO
}

// production-point.model.ts
export interface ProductionPoint {
  dateTime: string; // ISO
  pv: number;
}

// panel.model.ts
export interface Panel {
  _id: string;
  name: string;
  capacity: number;
  height: number;
  width: number;
  technology: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
  type: 'global' | 'personal';
  owner?: string;
}

// project.model.ts
export interface Project {
  _id: string;
  name: string;
  area: { lat: number; lon: number }[];
  lat?: number;
  lon?: number;
  surface?: number;
  country?: string;
  timezone?: string;
  currency?: string;
  price?: number;
  tilt: number;
  direction: string;
  azimuth?: number;
  rawSpacing?: number;
  panelNumber: number;
  panel?: Panel | string;
  owner?: User | string;
  prodToday?: ProductionPoint[];
  nextProd?: ProductionPoint[];
  previousProd?: ProductionPoint[];
  installDate: string;
}

// auth-token.model.ts
export interface AuthTokenPayload {
  _id: string;
  role: 'user' | 'admin';
  exp: number; // epoch seconds
}
```

Steps to add:
1. Create the model files under `client/src/app/core/models/`.
2. Update services to return typed Observables (e.g. `Observable<Project[]>`).
3. Use interfaces in components for inputs/state.
4. Optionally add DTO variants later (`ProjectCreateDto`).

## 🗺️ GOOGLE MAPS INTEGRATION

Replaced with free, cost-safe stack for thesis longevity.

### Free Mapping Stack (Chosen)
- **Leaflet** for interactive map rendering (OpenStreetMap tiles).
- **leaflet-draw** for polygon creation/editing (solar farm boundaries).
- **turf.js** for geospatial calculations (area, centroid, potential future sun-path approximations).
- Store polygon coordinates as received; derive centroid/area server-side or client-side as needed.
- Optional future enhancement: Google Maps integration if proprietary features (advanced elevation, Places API) become necessary.

### Features
- Draw / edit / delete farm boundary polygons.
- Marker for project center (centroid derived via turf).
- Display user projects as markers loaded from API.
- Click marker → navigate to project details.
- Basic address search can be added later using Nominatim (OpenStreetMap) to remain free.

## 📈 CHARTING REQUIREMENTS

Use Highcharts for data visualization:

1. **Spline Chart** - Energy production over time (hourly)
2. **Column Chart** - Daily production comparison
3. **Multi-axes Chart** - Compare multiple metrics (production, efficiency, temperature)

## 🎨 UI/UX REQUIREMENTS

- **Angular Material Theme:** Indigo-Pink or custom theme
- **Responsive Design:** Mobile-first approach with flex layout
- **Layout Components:**
  - Header: Logo, user menu, logout
  - Sidebar: Navigation menu (collapsible on mobile)
  - Footer: Copyright, links
- **Dialogs:** Use MatDialog for:
  - Change password
  - Confirm delete actions
  - Display detailed information

## ⚙️ ENVIRONMENT CONFIGURATION

### Server (.env):
```
PORT=1235
MONGODB_URI=mongodb://localhost:27017/solarplanner
JWT_SECRET=your-secret-key-here
JWT_EXP=24h
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:4200
GOOGLE_MAPS_API_KEY=your-google-api-key
SOLCAST_API_KEY=your-solcast-api-key (for solar radiation data)
```

### Client (environment.ts):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:1235',
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY_HERE',
  markerIcon: 'https://image.flaticon.com/icons/png/128/2427/2427035.png'
};
```

## 📦 KEY NPM PACKAGES

### Server:
```json
{
  "express": "latest",
  "mongoose": "latest",
  "bcryptjs": "latest",
  "jsonwebtoken": "latest",
  "cors": "latest",
  "dotenv": "latest",
  "nodemailer": "latest",
  "moment-timezone": "latest",
  "geolib": "latest",
  "axios": "latest",
  "zod": "latest",
  "pino": "latest",
  "helmet": "latest",
  "express-rate-limit": "latest",
  "express-slow-down": "latest",
  "prom-client": "latest"
}
```

### Client:
```json
{
  "@angular/core": "^21.0.0",
  "@angular/material": "^21.0.0",
  "leaflet": "latest",
  "leaflet-draw": "latest",
  "turf": "latest",
  "highcharts": "latest",
  "highcharts-angular": "latest",
  "jspdf": "latest"
}
```

### Server Dev Dependencies:
```json
{
  "typescript": "latest",
  "ts-node": "latest",
  "@types/node": "latest",
  "jest": "latest",
  "ts-jest": "latest",
  "@types/jest": "latest",
  "eslint": "latest",
  "@typescript-eslint/parser": "latest",
  "@typescript-eslint/eslint-plugin": "latest",
  "prettier": "latest",
  "lint-staged": "latest",
  "husky": "latest"
}
```

### Client Dev Dependencies:
```json
{
  "jest": "latest",
  "jest-preset-angular": "latest",
  "@types/jest": "latest",
  "ts-jest": "latest"
}
```

### Tooling Configuration Snippet (package.json additions):
```json
{
  "lint-staged": {
    "*.{ts,js,tsx,jsx,css,scss,html,json,md}": ["eslint --fix", "prettier --write"]
  }
}
```

Add Husky pre-commit hook:
```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

Example ESLint config excerpt:
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  parserOptions: { project: ['./tsconfig.json'] },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
};
```

## ✅ DELIVERABLES

Please create:

1. ✅ **Server scaffolding** (TypeScript) with models, schemas (Zod), services, controllers, routes, middleware, config
2. ✅ **Client scaffolding** with Angular 21 standalone components, feature folders, services, guards, interceptors
3. ✅ **README files** for both frontend and backend with setup instructions
4. ✅ **package.json** for both with all dependencies
5. ✅ **.env.example** with all required environment variables
6. ✅ **Basic component templates** for all pages (can be minimal, I'll enhance them later)
7. ✅ **Routing configuration** with lazy loading for feature modules
8. ✅ **JWT interceptor** automatically attaching tokens
9. ✅ **Auth and Admin guards** properly implemented
10. ✅ **Logging (pino) setup**
11. ✅ **Security middleware (helmet + rate limit + slow down)**
12. ✅ **Free mapping stack (Leaflet + leaflet-draw + turf.js)**
13. ✅ **Jest testing (server & client)**
14. ✅ **Tooling (ESLint + Prettier + Husky + lint-staged)**
15. ✅ **Domain interfaces (client models)**
16. ✅ **Refresh token strategy documented (deferred)**
17. ✅ **Observability plan (/health, /metrics)**

## 🎯 IMPORTANT NOTES

- Use **standalone components** in Angular 21 (not NgModules)
- Implement **lazy loading** for all feature routes
- Follow **layered architecture** (Routes → Controllers → Services → Models) on server
- Use **async/await** for backend async operations
- Add **JSDoc comments** to all controller functions
- Use **TypeScript strict mode** on frontend
- All forms should use **Reactive Forms** (FormBuilder, FormGroup)
- Implement proper **error handling** in all services
- Use **HttpErrorResponse** for HTTP error handling

Work autonomously and create the complete project structure. Ask clarifying questions only if something is fundamentally ambiguous, otherwise make reasonable decisions and proceed.

---

## 🚀 Implementation Roadmap

### Phase 1: Project Setup
1. Generate new Angular 21 workspace (client)
2. Scaffold server TypeScript structure (app.ts / server.ts)
3. Configure MongoDB connection
4. Add Zod schemas + validation middleware
5. Set up environment configurations

### Phase 2: Core Infrastructure
1. Implement authentication (custom JWT only)
2. Create client HTTP interceptor
3. Build auth/admin guards
4. Set up CORS middleware
5. Add centralized error handling

### Phase 3: Feature Migration
1. **Visitor Module**: Landing, Login, Register, Password Reset
2. **User Module**: Dashboard, Projects, Panels
3. **Admin Module**: Admin Dashboard, User Management, Project Management
4. **Shared Components**: Header, Footer, Sidebar
5. **Widgets**: Map, Charts

### Phase 4: Testing & Optimization
1. Test all authentication flows
2. Verify CRUD operations
3. Test role-based access control
4. Performance optimization
5. Lazy loading verification

---

## 📚 Additional Resources

- [Angular 21 Documentation](https://angular.io/docs)
- [Angular Material](https://material.angular.io/)
- [Express.js Guide](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Best Practices](https://jwt.io/introduction)
- [Highcharts Angular](https://www.highcharts.com/blog/products/highcharts-angular/)
- [Google Maps Angular](https://github.com/angular/components/tree/main/src/google-maps)

---
## 🔍 Pending Decisions & Gaps (To Finalize)
Most gaps resolved. Remaining deferred items:

| Item | Status | Next Action |
|------|--------|-------------|
| Docker & Deployment | Deferred | Add multi-stage Dockerfiles + Nginx/Express static serving after MVP. |
| Server-side PDF rendering | Deferred | Evaluate need for heavy reports; consider pdf-lib on server. |
| External production time-series store | Deferred | Migrate to dedicated collection/DB when volume warrants. |
| Full metrics dashboard | Deferred | Integrate Prometheus + Grafana after initial metrics prove useful. |
| Refresh token implementation | Planned | Implement rotation + revocation post security review. |

All other decisions documented above.
