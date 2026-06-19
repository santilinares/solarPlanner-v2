# Contributing to Solar Planner v2

Thanks for improving Solar Planner v2. This project favors working, maintainable solutions over unnecessary abstraction. Keep changes focused, verify them locally, and follow the existing architecture before introducing new patterns.

## Development Workflow

1. Start from an up-to-date branch.
2. Install dependencies with `npm run install:all` from the repository root.
3. Create `server/.env` from `server/.env.example`.
4. Run MongoDB locally or connect to MongoDB Atlas.
5. Start the app with `npm run start`.
6. Make a focused change.
7. Run the relevant checks.
8. Update documentation when behavior, setup, or public APIs change.

## Branches and Commits

- Use short, descriptive branch names.
- Keep commits focused on one logical change.
- Write commit messages in the imperative mood when possible, for example `Add project analytics tests`.
- Do not include secrets, generated credentials, local `.env` files, or dependency caches.

## Project Conventions

### General

- Prefer existing local patterns over new abstractions.
- Keep changes scoped to the feature or bug being addressed.
- Use TypeScript types intentionally; avoid `any` unless there is a clear boundary reason.
- Validate data at the edge of the system.
- Add or update tests when changing behavior.
- Do not replace the existing solar production physical models with flat constants.

### Angular Client

The client lives in `client/`.

- Use standalone components.
- Use `ChangeDetectionStrategy.OnPush` on every component.
- Use `input()` and `output()` signal functions instead of `@Input()` and `@Output()`.
- Use `inject()` instead of constructor injection.
- Use native Angular control flow: `@if`, `@for`, and `@switch`.
- Prefer Reactive Forms.
- Use PrimeNG as the primary UI library.
- Use Material Icons where icons are needed.
- Keep reusable logic in `core/` or `shared/` only when it is genuinely reused.
- Use path aliases such as `@core`, `@shared`, `@features`, and `@environments`.

Useful commands:

```bash
cd client
npm run dev
npm run typecheck
npm test
npm run lint
npm run format
```

### Express Server

The server lives in `server/`.

- Follow the existing flow: routes -> controllers -> services -> models.
- Keep controllers thin.
- Put business logic in services.
- Use Zod schemas for request validation.
- Use Mongoose schemas for persistence validation.
- Wrap async controllers with `asyncHandler`.
- Use response helpers from `server/src/utils/response.ts`.
- Throw `AppError` for operational errors that should produce expected HTTP responses.
- Keep all API routes under `/api`.

Useful commands:

```bash
cd server
npm run dev
npm test
npm run test:coverage
npm run lint
npm run build
```

## Environment Setup

Create `server/.env` from the example:

```bash
cp server/.env.example server/.env
```

Required local values include:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXP`
- `REFRESH_TOKEN_SECRET`
- `REFRESH_TOKEN_EXP`
- `FRONTEND_URL`
- SMTP configuration for password reset flows
- production refresh settings

Optional integrations:

- `ENTSOE_API_KEY` for electricity price data.
- Google OAuth client configuration for Google login.

Never commit `.env` files or real credentials.

## Database and Seed Data

The application uses MongoDB through Mongoose. For local development, you can run MongoDB with Docker:

```bash
docker run -d -p 27017:27017 --name solarplanner-mongodb mongo:latest
```

Seed the panel catalog after configuring the server:

```bash
cd server
npm run seed:panels
```

## Tests

Use the narrowest checks that give confidence for your change:

- Server service, schema, and middleware changes should include Vitest coverage.
- Client component, guard, interceptor, or service behavior should include Jest coverage where practical.
- Shared or cross-cutting changes should run the root checks.

Root checks:

```bash
npm run lint
npm run test
npm run build
```

Single server test file:

```bash
cd server
npm test -- user.service.test.ts
```

## Pull Request Checklist

Before opening a PR or merging a change, confirm:

- The change is focused and explained clearly.
- Relevant tests pass.
- Linting passes for touched areas.
- The project builds when build-impacting files changed.
- New environment variables are documented in `server/.env.example` and `README.md`.
- API changes are reflected in documentation and client services.
- No secrets, local files, or generated artifacts were committed by accident.

## Documentation

Update documentation whenever you change:

- installation or setup steps
- scripts
- environment variables
- API routes or request/response behavior
- user-facing workflows
- architectural decisions that future contributors must know

For agent-assisted development, add a progress entry to `santi-agent-interactions.md` after successful code or documentation changes.
