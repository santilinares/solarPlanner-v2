# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Solar Planner v2 — A thesis project that helps homeowners, farmers, and small businesses evaluate investing in solar panels. Prioritize agility and working solutions over over-engineering.

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
npm test               # Jest tests
npm run typecheck      # TypeScript check only
npm run lint           # ESLint
npm run format         # Prettier
```

### Server (Express — `server/`)
```bash
npm run dev            # ts-node dev server at localhost:1235
npm test               # Vitest
npm run test:watch     # Vitest watch mode
npm run lint           # ESLint
npm run format         # Prettier
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
- All API routes prefixed with `/api`

### Auth flow
- JWT attached via `jwt.interceptor` on every request
- Token refresh handled by `auth-refresh.interceptor`
- Mongoose User model has instance methods: `verifyPassword()`, `generateJwt()`, `generateRefreshToken()`
- Route protection via `authGuard` and `adminGuard`

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
