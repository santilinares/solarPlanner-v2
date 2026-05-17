# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Solar Planner v2 — A thesis project that helps homeowners, farmers, and small businesses evaluate investing in solar panels. Prioritize agility and working solutions over over-engineering.

## Interactions
For all of the prompts that result in adding new code successfully, fill in a markdown file [santi-agent-interactions.md](./santi-agent-interactions.md) that serves as registry of all of the progress made using an AI agent. Treat is as a blog, stating the date, topic, a summary of the prompt a summary of what was achieved, the full prompt, affected files and part of the reasoning made by the AI agent to fulfill the need requested. Add this the final step of every development 

## Commands

### Root (run both services)
```bash
npm run install:all    # Install deps for client and server
npm run start          # Run client + server concurrently
npm run build          # Build both projects
npm run lint           # Lint both projects
```

### Client (Angular — `client/`)
```bash
npm run dev            # ng serve at localhost:4200
npm test               # Karma/Jasmine tests
npm run typecheck      # TypeScript check only
npm run lint           # ESLint
npm run format         # Prettier
```

### Server (Express — `server/`)
```bash
npm run dev            # ts-node dev server at localhost:1235
npm run dev:watch      # nodemon with auto-restart
npm test               # Vitest (headless)
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Coverage report
npm run seed:panels    # Populate CEC panel catalog into MongoDB
npm run lint           # ESLint
npm run format         # Prettier
```

### Running a single test file (server)
```bash
cd server && npm test -- user.service.test.ts
```

## Architecture

### Stack
- **Frontend:** Angular 21 (standalone components, signals, lazy loading, OnPush)
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB via Mongoose ODM
- **Auth:** JWT access tokens + refresh tokens, stored in localStorage
- **Validation:** Zod at HTTP layer (Express) + Mongoose schema at DB layer

### Client structure (`client/src/app/`)
- `core/` — Singleton services (`auth`, `user`, `project`, `panel`, `file`), guards (`auth`, `admin`, `unsaved-changes`), and interceptors (`jwt`, `auth-refresh`, `api-response`)
- `features/` — Lazy-loaded feature areas: `visitor/` (public pages), `user/` (dashboard), `admin/` (admin panel)
- `layouts/` — Layout wrappers: `visitor-layout`, `user-layout`, `admin-layout`
- `shared/` — Reusable components and widgets
- `app.routes.ts` — Main routing with lazy loading per feature
- `app.config.ts` — Angular providers + PrimeNG theme setup

Path aliases: `@app`, `@core`, `@shared`, `@features`, `@environments`

### Server structure (`server/src/`)
- `routes/` → `controllers/` (thin) → `services/` (thick business logic) → `models/`
- `schemas/` — Zod validation schemas (user, project, panel, cultivar)
- `config/` — Database, JWT, email configuration
- `middleware/` — Auth, CORS, validation, rate limiting, error handling
- `data/` — Static data files: `capex-benchmarks-eu.ts` (CAPEX €/kWp for 10 EU countries), `albedo-presets.ts` (ground reflectance constants), `cec-panels-subset.json` (CEC module catalog), `seed-panels.ts` (seed script)
- All API routes prefixed with `/api`

### Auth flow
- JWT attached via `jwt.interceptor` on every request
- Token refresh handled by `auth-refresh.interceptor`
- Mongoose User model has instance methods: `verifyPassword()`, `generateJwt()`, `generateRefreshToken()`
- Route protection via `authGuard` and `adminGuard`
- Auth middleware attaches `req.userId` and `req.userRole` (`'user' | 'admin'`) to all protected requests

### Server utilities
- **`asyncHandler(fn)`** — wraps every controller to forward async errors to Express error middleware; all controllers use it
- **Response helpers** (`utils/response.ts`) — `success()`, `created()`, `noContent()`, `fail()`, `unauthorized()`, `forbidden()`, `notFound()`, `serverError()`; use these instead of `res.json()` directly
- **`AppError`** — operational error class; throw `new AppError(statusCode, message)` in services; caught automatically by the central error middleware
- **Validation middleware** — `validateBody(zodSchema)` and `validateQuery(zodSchema)` factories; applied in routes before controllers; return 400 with Zod error details on failure

### Key API routes
All routes are under `/api`. Role annotations: `[public]` = no auth, `[user]` = auth required, `[admin]` = admin only.

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | public | Register (rate-limited) |
| POST | `/auth/login` | public | Login (rate-limited) |
| POST | `/auth/google` | public | Google OAuth |
| POST | `/auth/refresh` | public | Refresh access token |
| POST | `/auth/password/reset-request` | public | Send reset email |
| POST | `/auth/password/reset` | public | Reset with token |
| GET | `/users/me` | user | Current user profile |
| PATCH | `/users/:id/profile` | user | Update profile |
| PATCH | `/users/:id/password` | user | Change password |
| GET | `/users` | admin | Paginated user list |
| PATCH | `/users/:id/role` | admin | Promote/demote user |
| DELETE | `/users/:id` | admin | Delete user (cascades projects) |
| POST | `/projects/estimate` | public | One-off solar estimate (no save) |
| POST | `/projects` | user | Create project |
| GET | `/projects` | user | Paginated project list |
| GET | `/projects/dashboard` | user | User dashboard stats |
| GET | `/projects/:id` | user | Project details |
| PUT | `/projects/:id` | user | Update project |
| DELETE | `/projects/:id` | user | Delete project |
| GET | `/projects/:id/sun-path` | user | Sunrise/sunset/noon altitude |
| GET | `/projects/:id/plan` | user | Generate plan/report |
| POST | `/projects/:id/config/optimal` | user | Calculate optimal panel config |
| POST | `/projects/:id/refresh-production` | user | Force refresh from PVGIS/ENTSO-E |
| GET | `/projects/:id/analytics` | user | Capacity factor, payback, ROI, annual savings |
| GET | `/projects/admin/dashboard` | admin | Admin stats |
| GET/POST/PUT/DELETE | `/panels` | user/admin | Panel CRUD |
| GET/POST/PUT/DELETE | `/cultivars` | user/admin | Cultivar CRUD (agrivoltaic crops) |

### Data model relationships
```
User ──< Project >── Panel (optional)
                └── Cultivar (optional, agrivoltaic only)
```
- Projects store `prodToday`, `nextProd`, `previousProd` as `IProductionPoint[]` (hourly kWh arrays) refreshed nightly by `SchedulerService` (node-schedule)
- `ISystemLosses` subdocument on Project holds inverter efficiency, wiring losses, soiling, mismatch, etc.
- `IProject` economic fields: `installationCost` (€ total, user-provided or benchmark-estimated), `segment` (`residential | commercial | utility | agrivoltaic`), `albedo` (ground reflectance [0-1], default 0.20 for grass)
- `ProjectAnalytics` (returned by `GET /projects/:id/analytics`) includes `capacityFactor`, `performanceRatio`, `annualSavingsEur`, `paybackYears`, `roi25Years`, `annualSavingsPerYear` (25-year array with degradation), `installationCostUsed`, `installationCostSource` (`'user' | 'benchmark'`)

### External APIs
| Service | Auth | Purpose |
|---------|------|---------|
| PVGIS | None (free) | Solar production estimates |
| ENTSO-E | API key (`ENTSOE_API_KEY`) | Electricity prices by country |
| Open-Meteo | None (free) | Weather/forecast data |
| Google OAuth | Client ID in `environment.ts` | User authentication |

Environment variables template: `server/.env.example`

### Background jobs
`SchedulerService` runs nightly to refresh `prodToday`, `nextProd`, and `previousProd` for all projects. Refresh threshold controlled by `PRODUCTION_REFRESH_THRESHOLD_H` env var.

### Production calculation models
`production.service.ts` uses two physical models — do not replace with flat constants:
- **Inverter efficiency** — PVWatts V5 curve (`calculateInverterEfficiency`): dynamic η based on DC load factor (ζ = P_dc / P_dc0); flat at `etaNom` only when clipping (ζ ≥ 1).
- **Bifacial irradiance** — isotropic sky view factor (`calculateEffectiveIrradiance`): `G_eff = GTI + bifaciality × albedo × GHI × (1−cos(tilt))/2`; falls back to monofacial when `bifacialityFactor = 0`.

## Angular Coding Standards (enforced)

- **Always** `ChangeDetectionStrategy.OnPush` on every component
- **Standalone components only** — do NOT set `standalone: true` inside decorators (it's the default in Angular 21)
- Use `input()` / `output()` signal functions, not `@Input()` / `@Output()` decorators
- Use `inject()` function, not constructor injection
- Native control flow: `@if`, `@for`, `@switch` — never `*ngIf`, `*ngFor`
- `class` bindings instead of `ngClass`; `style` bindings instead of `ngStyle`
- Do NOT use `@HostBinding` / `@HostListener` — use `host: {}` in the decorator instead
- Use `NgOptimizedImage` for static images (not for inline base64)
- Prefer Reactive Forms over Template-driven forms
- `providedIn: 'root'` for all singleton services
- Try not to use `@ngdeep` when possible since its **deprecated**.

## UI Libraries

- **Primary:** PrimeNG — use for all UI components
  - Use Material Icons rather than PrimeNG Icons
- **Fallback:** Custom components, only when PrimeNG lacks those components or when reduces complexity.
- MCP server available for PrimeNG docs: use `mcp__primeng__*` tools for component documentation

## Workflow Rules

1. **Plan first** — before implementing, state affected files and the approach; wait for approval
2. **Stop after 3 failed iterations** — suggest opening a new chat with a ready-to-use prompt
3. **Ask when context is missing** — do not guess or scan for the first apparent match
