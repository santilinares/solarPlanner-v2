# Solar Planner v2.0 – AI Prompt Execution Playbook

This file converts the high-level architecture in `SOLAR-PLANNER-v2.0.md` into granular, copy‑paste prompt scripts you can feed to GitHub Copilot Chat (or Cursor / other agents) to iteratively scaffold the project with minimal ambiguity.

---
## 0. Usage Overview
1. Keep `SOLAR-PLANNER-v2.0.md` open (visible to the AI) – it acts as the master spec.
2. Work in phases; after each phase, run lint/build tests to catch drift early.
3. Use short, outcome‑oriented prompts (avoid mixing >1 unrelated objective).
4. Prefer: "Generate files X,Y with placeholders + TODO comments" over "Finish everything at once".
5. After generation, manually skim for: naming consistency, imports, path accuracy, async error handling.

---
## 1. Global Context Injection Prompt
Run FIRST so the model anchors on scope:
```
You have two folders: server (Node/Express/Mongoose/Zod) and client (Angular 18 standalone). Use the spec in SOLAR-PLANNER-v2.0.md. I will ask you for phase-wise scaffolding. Do NOT add extra dependencies beyond those listed. Acknowledge readiness only.
```

Expected reply: A brief confirmation; no code yet.

---
## 2. Phase 1 – Server Base Scaffolding
Prompt A:
```
Create initial server skeleton: server/package.json (scripts: dev with ts-node, build), tsconfig.json (ES2022, strict true, moduleResolution node16), .env.example (all vars from spec), README.md (setup + run). Do not implement business logic yet.
```
Prompt B:
```
Generate server/src/app.ts (Express app factory), server/src/server.ts (bootstrap + env load + Mongo connect placeholder), and server/src/config/database.config.ts (export async connectMongo(uri)). Use dotenv in server.ts only. Add TODO for graceful shutdown.
```
Prompt C:
```
Add server/src/env/index.ts that uses Zod to validate process.env for all required variables from the spec and exports a typed config object.
```

Quality Checks:
- Can `npm run dev` compile?
- Are missing env keys surfaced early?

---
## 3. Phase 2 – Validation & Models Layer
Prompt D:
```
Generate Zod schemas in server/src/schemas: user.schema.ts, project.schema.ts, panel.schema.ts, production.schema.ts per spec. Export both raw schemas and TypeScript types (infer). Keep only structures from spec; mark optional fields clearly.
```
Prompt E:
```
Generate Mongoose models: user.model.ts, project.model.ts, panel.model.ts, production.model.ts (subdocument). Add static or instance methods stubs for verifyPassword() and generateJwt() with TODO implementations. Avoid business logic; just types + schema + exports.
```
Prompt F:
```
Create server/src/types/express.d.ts to augment Express Request with userId, userRole. Provide interface declarations only.
```

Review: Ensure no circular imports; schema vs model separation intact.

---
## 4. Phase 3 – Services Layer
Prompt G:
```
Create service stubs: auth.service.ts, user.service.ts, project.service.ts, panel.service.ts, email.service.ts. Each exports a class with async methods signatures only (register, login, getProfile, createProject, etc.) returning Promises with inferred types (use schema types). Add TODO comments; no logic yet.
```

Prompt H:
```
Add central error model: server/src/utils/response.ts with helpers (success(data), fail(code, message, details?)). Keep minimal.
```

---
## 5. Phase 4 – Middleware & Routing
Prompt I:
```
Implement middleware: auth.middleware.ts (verifyJwtToken, verifyUserJwtToken, verifyAdminJwtToken, verifyPasswordResetJwtToken placeholders), validation.middleware.ts (function zValidate(schema, target: 'body'|'query'|'params')), cors.middleware.ts (use env.FRONTEND_URL), error.middleware.ts (final error handler formatting). Add TODO in JWT functions.
```
Prompt J:
```
Create routes: user.routes.ts, project.routes.ts, panel.routes.ts mapping endpoints from spec to controller function names. Add index.ts to aggregate and mount /users, /projects, /panels.
```
Prompt K:
```
Generate controller stubs (user.controller.ts, project.controller.ts, panel.controller.ts) with JSDoc describing each endpoint. Controllers call service stubs only; wrap each in asyncHandler utility.
```
Prompt L:
```
Add asyncHandler utility (try/catch wrapper) in server/src/utils/asyncHandler.ts.
```

Smoke Test: Import routes in app.ts, mount under root, run dev; ensure 404 fallback and error middleware order (error last).

---
## 6. Phase 5 – Client Workspace Setup
Prompt M (run outside AI in terminal first):
```
ng new client --standalone --routing --style=scss --strict
```
Prompt N:
```
Adjust client package.json: add @angular/material, @angular/google-maps, highcharts, highcharts-angular. Generate environments with apiUrl and keys placeholders as per spec.
```
Prompt O:
```
Scaffold core folder: core/guards (auth.guard.ts, admin.guard.ts), core/interceptors/jwt.interceptor.ts, core/services (auth.service.ts, user.service.ts, project.service.ts, panel.service.ts, file.service.ts) with method signatures only, returning Observables with placeholder types.
```

---
## 7. Phase 6 – Client Feature & Layout Structure
Prompt P:
```
Create layouts: visitor-layout, user-layout, admin-layout as standalone components (HTML placeholders, minimal SCSS). Configure top-level routing for lazy loading feature folders.
```
Prompt Q:
```
Scaffold visitor feature pages (landing-page, login, register, forgot-password, reset-password) with reactive form skeleton for auth forms; no styling yet.
```
Prompt R:
```
Scaffold user feature pages (dashboard, add-project, view-project, user-projects, panel-list) with placeholder components and TODO comments for future map/chart integration.
```
Prompt S:
```
Scaffold admin feature pages (admin-dashboard, projects-list, users-list, panels) with basic table placeholder structures.
```

---
## 8. Phase 7 – Shared Components & Widgets
Prompt T:
```
Generate shared/components: header, footer, sidebar (standalone) + simple nav markup; ensure header consumes AuthService for role-based links.
```
Prompt U:
```
Generate widgets: map (Google Maps basic display + polygon drawing TODO), spline-chart, column-chart, multiaxes-chart with Highcharts config placeholders exported via @Input() options.
```

---
## 9. Phase 8 – Auth Flow Wiring
Prompt V:
```
Implement login and register forms (reactive), AuthService login/register methods calling apiUrl endpoints; store JWT in localStorage; jwt.interceptor attaches Authorization header; guards parse JWT (use light decode via atob) to check role.
```
Prompt W:
```
Implement basic logout (clear token + redirect) and auto-redirect to /login on failed auth checks.
```

---
## 10. Phase 9 – Minimal Testing & Verification
Prompt X:
```
Add Jest or Vitest config for server (if desired) and one test: user registration returns token; project creation guarded by auth. Provide minimal test harness (in tests/). If skipping now, add TODO list instead.
```
Prompt Y:
```
Add Angular unit test skeleton for AuthService (token persistence) and AuthGuard (route blocking).
```

---
## 11. Phase 10 – Hardening & TODO Backlog
Prompt Z:
```
Add README TODO section: logging integration, PDF generation library choice (e.g. pdf-lib), rate limiting (express-rate-limit), production collection externalization, refresh tokens endpoint, metrics /health.
```

---
## 12. Post-Generation Consistency Checklist
- All server imports use relative paths without typos.
- Controllers never perform DB logic directly.
- Services never parse Express req/resp objects.
- Validation middleware applied to create/update endpoints.
- Guards/interceptor compiled successfully (ng serve). 
- Map & chart components isolated (no direct API calls yet).
- Environment variables matched `.env.example` keys.

---
## 13. Sample Combined Prompt (For Bulk Generation – Use Sparingly)
```
Using the spec, generate server/src/middleware/{auth.middleware.ts,validation.middleware.ts,error.middleware.ts,cors.middleware.ts} and server/src/routes/{user.routes.ts,project.routes.ts,panel.routes.ts} plus controller stubs referencing service classes. No business logic; just skeletons + TODO comments.
```

---
## 14. When to Prefer Other Tools
| Tool | Strength | When To Use | Caveat |
|------|----------|-------------|--------|
| GitHub Copilot | Inline + context aware per file | Iterative, controlled layering | Less autonomous bulk refactor |
| Cursor AI | Multi-file bulk edits + agent tasks | Rapid large skeleton generation | Must review for spec drift |
| Google Antigravity | Experimental autonomous builds | Exploration / prototypes | Maturity & reliability vary |

Recommendation: Start with Copilot for precision; optionally switch to Cursor for repetitive expansion once patterns stable.

---
## 15. Gaps Identified in Current Spec (Optional Enhancements)
The original spec is strong but you may add:
- Explicit TypeScript interface shapes for Angular domain models (User, Project, Panel).
- Chosen PDF generation library (pdf-lib or jsPDF) & endpoint contract.
- Logging library decision (pino vs winston) + log format.
- Rate limiting + helmet security tasks.
- Testing framework choice (Jest vs Vitest) + minimal config directives.
- ESLint + Prettier configuration intentions.
- Git hooks (lint-staged) for consistency.
- Deployment target assumptions (Dockerfile, environment separation).

---
## 16. Fast Start Command Snippets (Terminal)
```
# From repo root
mkdir server client
cd server
npm init -y
npm install express mongoose bcryptjs jsonwebtoken cors dotenv nodemailer moment-timezone geolib axios zod

cd ../client
ng new client --standalone --routing --style=scss --strict
npm install @angular/material @angular/google-maps highcharts highcharts-angular
```

---
## 17. Maintenance Prompts (After Initial Build)
```
Refactor project.service.ts: implement createProject with ProjectCreateSchema validation, duplicate name check, and Mongoose save.
```
```
Add refresh token endpoint design (but do not code) – propose secure rotation flow given current access-only implementation.
```
```
Generate Dockerfile for server with multi-stage build (builder + slim runtime) using Node 22, plus brief README section.
```

---
## 18. Failure Recovery Prompt
If generation produced mixed logic & scaffolding:
```
Rollback to pure skeleton: Strip business logic from services and controllers; retain method signatures + TODO markers only. Provide diff patches.
```

---
## 19. Final Integration Prompt
Run at near completion:
```
Audit the codebase for violations of the layered architecture (controllers doing DB work, services using req/resp). List corrections only – no code changes yet.
```

---
## 20. Done Criteria
You can declare scaffolding “complete” when:
- All listed files exist with coherent imports.
- Dev server starts (`npm run dev`) and Angular builds (`ng serve`).
- Sample register/login flow returns token (stub or real).
- Guards block unauth routes; interceptor attaches Authorization.
- No TypeScript errors in either workspace.

---
Feel free to extend this playbook as the project evolves.
