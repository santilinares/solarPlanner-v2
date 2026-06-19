# AGENTS.md

This file is the canonical operating guide for any AI agent working in this repository. If another assistant, tool, or model touches this project, it should read and follow this file first.

For human-facing project documentation, use `README.md`. For human contribution workflow, use `CONTRIBUTING.md`. This file translates those expectations into direct rules for AI-assisted development.

## Project Overview

Solar Planner v2 is a thesis project that helps homeowners, farmers, and small businesses evaluate solar panel investments. Prioritize working, maintainable solutions that can be explained clearly in an academic context.

The stack is:

- Frontend: Angular 21, standalone components, signals, lazy loading, OnPush.
- Backend: Node.js, Express, TypeScript.
- Database: MongoDB through Mongoose.
- Auth: JWT access tokens and refresh tokens.
- Validation: Zod at the HTTP boundary and Mongoose at the persistence layer.
- UI: PrimeNG as the primary component library.

## Core Agent Rules

1. Read the relevant files before changing code. Do not guess from filenames alone.
2. Plan before implementing. State affected files and the approach, then wait for user approval when the user has not already approved the work.
3. Prefer existing project patterns over new abstractions.
4. Keep changes focused on the user's request.
5. Do not overwrite or revert user changes unless explicitly asked.
6. Ask for clarification when missing context would make the change risky.
7. Stop after 3 failed implementation or verification attempts and suggest a fresh prompt with the current findings.
8. Update documentation when setup, scripts, environment variables, APIs, or workflows change.
9. Add an entry to `santi-agent-interactions.md` after successful code or documentation changes.

## AI Development Log

For every prompt that successfully adds or changes code or project documentation, update `santi-agent-interactions.md` as the final development step.

Treat the file as a lightweight development blog. Each entry should include:

- date
- topic
- prompt summary
- what was achieved
- full prompt, when useful
- affected files
- relevant reasoning notes

Keep entries concise but useful for a future evaluator, maintainer, or thesis review.

## Local AI Skills

The repository contains local skills under `.agents/skills/`.

### `mongodb-tfg`

Path: `.agents/skills/mongodb-tfg/SKILL.md`

Use this skill whenever the task involves:

- MongoDB schema design
- Mongoose and TypeScript model decisions
- embedding vs referencing
- indexes and query performance
- MongoDB Atlas migration
- database decisions that need academic justification for a TFG

The skill prioritizes conventional, well-documented MongoDB patterns that are feasible for a thesis project. Read the skill file before making MongoDB recommendations or changes.

## Commands

### Root

```bash
npm run install:all    # Install client and server dependencies
npm run start          # Run client and server concurrently
npm run build          # Build both projects
npm run test           # Run server and client tests
npm run lint           # Lint both projects
```

### Client (`client/`)

```bash
npm run dev            # Angular dev server at localhost:4200
npm start              # Angular dev server using ng serve
npm run build          # Build Angular app
npm test               # Jest tests
npm run test:watch     # Jest watch mode
npm run typecheck      # TypeScript check only
npm run lint           # ESLint
npm run format         # Prettier
```

### Server (`server/`)

```bash
npm run dev            # ts-node dev server at localhost:1235
npm run dev:watch      # nodemon with auto-restart
npm run build          # Compile TypeScript
npm start              # Run compiled server
npm test               # Vitest run
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Coverage report
npm run seed:panels    # Populate CEC panel catalog into MongoDB
npm run check:relations # Check model/data relationships
npm run lint           # ESLint
npm run format         # Prettier
```

Single server test file:

```bash
cd server
npm test -- user.service.test.ts
```

## Architecture

### Client Structure

Client code lives in `client/src/app/`.

- `core/`: singleton services, guards, interceptors, models, validators, and utilities.
- `features/`: lazy-loaded feature areas: `visitor`, `user`, and `admin`.
- `layouts/`: visitor, user, and admin layout wrappers.
- `shared/`: reusable components and widgets.
- `app.routes.ts`: main routing with lazy-loaded feature routes.
- `app.config.ts`: Angular providers and PrimeNG theme setup.

Path aliases include `@app`, `@core`, `@shared`, `@features`, and `@environments`.

### Server Structure

Server code lives in `server/src/`.

Use the existing layered flow:

```text
routes -> controllers -> services -> models
```

- `routes/`: route definitions and route-level middleware.
- `controllers/`: thin HTTP handlers.
- `services/`: business logic.
- `models/`: Mongoose models.
- `schemas/`: Zod validation schemas.
- `config/`: database, JWT, and email configuration.
- `middleware/`: auth, CORS, validation, rate limiting, and error handling.
- `data/`: static data and seed inputs.
- `utils/`: response helpers, async handler, logging utilities.

All API routes are prefixed with `/api`.

## Server Conventions

- Keep controllers thin. Move business logic to services.
- Wrap async controllers with `asyncHandler`.
- Use response helpers from `server/src/utils/response.ts`.
- Throw `AppError` for operational errors that should become HTTP responses.
- Validate request bodies and query strings with Zod middleware.
- Keep persistence validation in Mongoose schemas.
- Use explicit TypeScript interfaces and types.
- Protect ownership-sensitive operations in services or middleware.
- Keep environment variables in `server/.env.example` when adding new config.

## Angular Coding Standards

- Always use `ChangeDetectionStrategy.OnPush` on components.
- Use standalone components only. Do not add `standalone: true` in Angular 21 decorators.
- Use `input()` and `output()` signal functions instead of `@Input()` and `@Output()`.
- Use `inject()` instead of constructor injection.
- Use native control flow: `@if`, `@for`, and `@switch`.
- Do not use `*ngIf` or `*ngFor`.
- Prefer `class` bindings over `ngClass`.
- Prefer `style` bindings over `ngStyle`.
- Do not use `@HostBinding` or `@HostListener`; use `host: {}` in the decorator.
- Use `NgOptimizedImage` for static images.
- Prefer Reactive Forms over template-driven forms.
- Use `providedIn: 'root'` for singleton services.
- Avoid `::ng-deep` unless no practical alternative exists.

## UI Guidelines

- Use PrimeNG for UI components by default.
- Use Material Icons rather than PrimeNG Icons.
- Use custom components only when PrimeNG lacks the component or when custom code clearly reduces complexity.
- Keep screens consistent with the existing app style.
- Build actual usable workflows, not marketing-style placeholders.
- For frontend changes, verify that the UI works at the relevant viewport sizes when practical.

## Data Model Notes

```text
User --< Project >-- Panel (optional)
                `-- Cultivar (optional, agrivoltaic only)
```

- Projects store `prodToday`, `nextProd`, and `previousProd` as `IProductionPoint[]`.
- Production arrays are refreshed by `SchedulerService`.
- `ISystemLosses` stores inverter efficiency, wiring losses, soiling, mismatch, and related values.
- Project economic fields include `installationCost`, `segment`, and `albedo`.
- Project analytics include capacity factor, performance ratio, annual savings, payback, ROI, degradation-aware yearly savings, and installation cost source.

## Production Calculation Rules

Do not replace the existing physical models with flat constants.

- Inverter efficiency uses a PVWatts V5-style curve in `calculateInverterEfficiency`.
- Bifacial irradiance uses an isotropic sky view factor in `calculateEffectiveIrradiance`.
- Monofacial behavior should remain the fallback when `bifacialityFactor = 0`.

Any change to production math should include focused tests and a clear reasoning note.

## Key API Routes

All routes are under `/api`.

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | public | Register |
| `POST` | `/auth/login` | public | Login |
| `POST` | `/auth/google` | public | Google OAuth |
| `POST` | `/auth/refresh` | public | Refresh access token |
| `POST` | `/auth/password/reset-request` | public | Send reset email |
| `POST` | `/auth/password/reset` | public | Reset with token |
| `GET` | `/users/me` | user | Current user profile |
| `PATCH` | `/users/:id/profile` | user | Update profile |
| `PATCH` | `/users/:id/password` | user | Change password |
| `GET` | `/users` | admin | Paginated user list |
| `PATCH` | `/users/:id/role` | admin | Promote or demote user |
| `DELETE` | `/users/:id` | admin | Delete user and cascade projects |
| `POST` | `/projects/estimate` | public | One-off solar estimate |
| `POST` | `/projects` | user | Create project |
| `GET` | `/projects` | user | Paginated project list |
| `GET` | `/projects/dashboard` | user | User dashboard stats |
| `GET` | `/projects/:id` | user | Project details |
| `PUT` | `/projects/:id` | user | Update project |
| `DELETE` | `/projects/:id` | user | Delete project |
| `GET` | `/projects/:id/sun-path` | user | Sunrise, sunset, noon altitude |
| `GET` | `/projects/:id/plan` | user | Generate plan/report |
| `POST` | `/projects/:id/config/optimal` | user | Calculate optimal panel config |
| `POST` | `/projects/:id/refresh-production` | user | Force refresh from PVGIS/ENTSO-E |
| `GET` | `/projects/:id/analytics` | user | Capacity factor, payback, ROI, annual savings |
| `GET` | `/projects/admin/dashboard` | admin | Admin stats |
| `GET/POST/PUT/DELETE` | `/panels` | user/admin | Panel CRUD |
| `GET/POST/PUT/DELETE` | `/cultivars` | user/admin | Cultivar CRUD |

## External APIs

| Service | Auth | Purpose |
| --- | --- | --- |
| PVGIS | none | Solar production estimates |
| Open-Meteo | none | Weather and forecast data |
| ENTSO-E | `ENTSOE_API_KEY` | Electricity prices by country |
| Google OAuth | client ID | User authentication |

Environment variables are documented in `server/.env.example` and `README.md`.

## Testing Guidance

Use the narrowest verification that gives confidence.

- Server service, schema, middleware, and production-math changes should usually include Vitest coverage.
- Client guard, interceptor, service, and component behavior should use Jest tests where practical.
- Run `npm run typecheck` for Angular type-sensitive changes.
- Run root `npm run build`, `npm run test`, and `npm run lint` for broad or cross-cutting changes.
- Documentation-only changes do not require build/test runs, but commands and links should be checked against the repo.

## Relationship With `CONTRIBUTING.md`

Use `CONTRIBUTING.md` as the human workflow reference. AI agents should also apply it, especially:

- keep changes focused
- avoid secrets and local files
- update docs when behavior changes
- run relevant checks
- follow PR checklist expectations even if no PR is being opened

If `AGENTS.md` and `CONTRIBUTING.md` ever conflict, pause and ask the user which rule should be canonical, then update the docs to remove the conflict.

## Final Checklist for Agents

Before finishing a task, verify:

- the requested change is actually complete
- affected files are limited to the intended scope
- user changes were not reverted
- relevant tests, lint, typecheck, or build were run, or skipped with a clear reason
- documentation was updated if needed
- `santi-agent-interactions.md` has a new entry for successful code or documentation changes
- the final response names changed files and verification performed
