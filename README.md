# Solar Planner v2

Solar Planner v2 is a full-stack thesis project for evaluating solar panel investments for homeowners, farmers, and small businesses. It combines project planning, photovoltaic production estimates, economic analysis, agrivoltaic options, and user/admin workflows in one web application.

The goal of the project is practical decision support: help a user understand whether a solar installation makes sense for a location, roof/land area, selected panel, expected production, installation cost, savings, payback, and long-term return.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
- [API Overview](#api-overview)
- [Testing and Quality](#testing-and-quality)
- [External Services](#external-services)
- [Contributing](#contributing)
- [License](#license)

## Features

- User registration, login, refresh tokens, password reset, and Google OAuth.
- Protected user dashboard with saved solar projects.
- Public one-off project estimation without saving a project.
- Solar production estimation using PVGIS and internal physical models.
- Weather and production refresh workflows using Open-Meteo and scheduled jobs.
- Electricity price integration through ENTSO-E when an API key is available.
- CAPEX benchmark estimation for supported European countries.
- Economic analytics including capacity factor, performance ratio, annual savings, payback, ROI, and 25-year degradation-aware savings.
- Panel catalog management with seeded CEC module data.
- Agrivoltaic cultivar support for agriculture-oriented projects.
- Admin area for users, projects, panels, and platform-level dashboard data.

## Tech Stack

| Area | Technology |
| --- | --- |
| Client | Angular 21, standalone components, signals, PrimeNG, PrimeFlex |
| Client charts/maps | Highcharts, Leaflet, Turf |
| Server | Node.js, Express 5, TypeScript |
| Database | MongoDB with Mongoose |
| Validation | Zod at the HTTP boundary, Mongoose at the data layer |
| Auth | JWT access tokens and refresh tokens |
| Background jobs | node-schedule |
| Testing | Jest for the client, Vitest for the server |
| Tooling | ESLint, Prettier, TypeScript |

## Repository Structure

```text
solarPlanner-v2/
|-- client/                 # Angular application
|   `-- src/
|       |-- app/
|       |   |-- core/       # Singleton services, guards, interceptors, models
|       |   |-- features/   # Visitor, user, and admin feature areas
|       |   |-- layouts/    # Visitor, user, and admin layout shells
|       |   `-- shared/     # Reusable components and widgets
|       |-- assets/
|       |-- environments/
|       `-- styles/
|-- server/                 # Express API
|   `-- src/
|       |-- config/         # Database, JWT, email configuration
|       |-- controllers/    # HTTP request handlers
|       |-- data/           # Static datasets and seed data
|       |-- middleware/     # Auth, validation, CORS, rate limits, errors
|       |-- models/         # Mongoose models
|       |-- routes/         # API route definitions
|       |-- schemas/        # Zod schemas
|       |-- services/       # Business logic
|       |-- types/
|       `-- utils/
|-- package.json            # Root scripts for both apps
|-- README.md
`-- CONTRIBUTING.md
```

## Prerequisites

- Node.js 20 or newer is recommended.
- npm.
- MongoDB, either local or hosted in MongoDB Atlas.
- Optional: Docker, if you prefer running MongoDB locally in a container.
- Optional: ENTSO-E API key for electricity price lookups.
- Optional: Google OAuth client ID for Google authentication.

## Getting Started

### 1. Install dependencies

From the repository root:

```bash
npm run install:all
```

This installs dependencies for both `client/` and `server/`.

### 2. Configure the server environment

Create `server/.env` from the example file:

```bash
cp server/.env.example server/.env
```

Then update the values for your local setup, especially `MONGODB_URI`, JWT secrets, email credentials, and any optional external API keys.

### 3. Start MongoDB

With Docker:

```bash
docker run -d -p 27017:27017 --name solarplanner-mongodb mongo:latest
```

Or start your local MongoDB service using your preferred installation.

### 4. Seed the panel catalog

```bash
cd server
npm run seed:panels
```

### 5. Run the application

From the repository root:

```bash
npm run start
```

The services run at:

- Client: `http://localhost:4200`
- Server: `http://localhost:1235`

## Environment Variables

The server reads configuration from `server/.env`.

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | Yes | Express server port. Defaults to `1235` in local examples. |
| `NODE_ENV` | Yes | Runtime environment, usually `development` or `production`. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign access tokens. |
| `JWT_EXP` | Yes | Access token lifetime, for example `15m`. |
| `REFRESH_TOKEN_SECRET` | Yes | Secret used for refresh tokens. |
| `REFRESH_TOKEN_EXP` | Yes | Refresh token lifetime, for example `7d`. |
| `FRONTEND_URL` | Yes | Allowed frontend origin, usually `http://localhost:4200`. |
| `EMAIL_HOST` | Yes | SMTP host for password reset emails. |
| `EMAIL_PORT` | Yes | SMTP port. |
| `EMAIL_USER` | Yes | SMTP username. |
| `EMAIL_PASS` | Yes | SMTP password or app password. |
| `ENTSOE_API_KEY` | Optional | ENTSO-E Transparency Platform API key. |
| `PRODUCTION_REFRESH_THRESHOLD_H` | Yes | Minimum age before refreshing production data. |
| `PRODUCTION_HISTORY_DAYS` | Yes | Number of historical production days to keep. |
| `PRODUCTION_FORECAST_DAYS` | Yes | Number of forecast days to request/store. |

Open-Meteo and PVGIS do not require API keys.

## Available Scripts

### Root

| Command | Description |
| --- | --- |
| `npm run install:all` | Install client and server dependencies. |
| `npm run start` | Run the server and client concurrently. |
| `npm run build` | Build both projects. |
| `npm run test` | Run server and client tests. |
| `npm run lint` | Run server and client linters. |

### Client

Run these from `client/`.

| Command | Description |
| --- | --- |
| `npm run dev` | Start Angular in development mode. |
| `npm start` | Start Angular with `ng serve`. |
| `npm run build` | Build the Angular app. |
| `npm test` | Run Jest tests. |
| `npm run test:watch` | Run Jest in watch mode. |
| `npm run typecheck` | Run the Angular TypeScript check without emitting files. |
| `npm run lint` | Run ESLint. |
| `npm run format` | Format client source files with Prettier. |

### Server

Run these from `server/`.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with `ts-node`. |
| `npm run dev:watch` | Start the API with `nodemon`. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm start` | Run the compiled server from `dist/`. |
| `npm test` | Run Vitest once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:coverage` | Generate coverage output. |
| `npm run seed:panels` | Seed the panel catalog. |
| `npm run check:relations` | Check model/data relationships. |
| `npm run lint` | Run ESLint for server source files. |
| `npm run format` | Format server source files with Prettier. |

## Architecture

### Client

The Angular application is organized by feature and uses modern Angular patterns:

- Standalone components.
- Signals for reactive state.
- Lazy-loaded feature areas.
- Functional guards and interceptors.
- PrimeNG as the primary UI component library.
- Path aliases such as `@app`, `@core`, `@shared`, `@features`, and `@environments`.

Important client areas:

- `core/`: singleton services, guards, interceptors, models, validators, and utilities.
- `features/visitor/`: public pages such as landing, login, register, and password reset.
- `features/user/`: authenticated dashboard and project workflows.
- `features/admin/`: admin dashboard and management screens.
- `layouts/`: shell components for visitor, user, and admin sections.
- `shared/`: reusable UI components and widgets.

### Server

The Express API follows a layered structure:

```text
routes -> controllers -> services -> models
```

- Routes define URL structure and middleware.
- Controllers translate HTTP requests into service calls.
- Services contain business logic.
- Models define persistence through Mongoose.
- Zod schemas validate request bodies and query strings.
- Central error middleware handles operational errors consistently.

Controllers should use the response helpers from `server/src/utils/response.ts` instead of calling `res.json()` directly.

### Production Models

Solar production logic should preserve the physical models already present in the codebase:

- Inverter efficiency uses a PVWatts V5-style curve based on DC load factor.
- Bifacial irradiance uses an isotropic sky view factor and falls back to monofacial behavior when bifaciality is zero.

Avoid replacing these calculations with flat constants.

## API Overview

All server routes are mounted under `/api`.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register a user. |
| `POST` | `/auth/login` | Public | Log in and receive tokens. |
| `POST` | `/auth/google` | Public | Authenticate with Google OAuth. |
| `POST` | `/auth/refresh` | Public | Refresh access token. |
| `POST` | `/auth/password/reset-request` | Public | Request password reset email. |
| `POST` | `/auth/password/reset` | Public | Reset password with token. |
| `GET` | `/users/me` | User | Get current user profile. |
| `PATCH` | `/users/:id/profile` | User | Update user profile. |
| `PATCH` | `/users/:id/password` | User | Change password. |
| `GET` | `/users` | Admin | List users. |
| `PATCH` | `/users/:id/role` | Admin | Change a user's role. |
| `DELETE` | `/users/:id` | Admin | Delete a user and cascade related data. |
| `POST` | `/projects/estimate` | Public | Run a one-off solar estimate. |
| `POST` | `/projects` | User | Create a project. |
| `GET` | `/projects` | User | List the current user's projects. |
| `GET` | `/projects/dashboard` | User | Get dashboard statistics. |
| `GET` | `/projects/:id` | User | Get project details. |
| `PUT` | `/projects/:id` | User | Update a project. |
| `DELETE` | `/projects/:id` | User | Delete a project. |
| `GET` | `/projects/:id/sun-path` | User | Get sun path information. |
| `GET` | `/projects/:id/plan` | User | Generate a project plan/report. |
| `POST` | `/projects/:id/config/optimal` | User | Calculate optimal panel configuration. |
| `POST` | `/projects/:id/refresh-production` | User | Refresh production data. |
| `GET` | `/projects/:id/analytics` | User | Get economic and production analytics. |
| `GET` | `/projects/admin/dashboard` | Admin | Get admin dashboard statistics. |
| `GET/POST/PUT/DELETE` | `/panels` | User/Admin | Manage solar panels. |
| `GET/POST/PUT/DELETE` | `/cultivars` | User/Admin | Manage agrivoltaic cultivars. |

## Testing and Quality

Before submitting a change, run the checks that match the files you touched:

```bash
npm run lint
npm run test
npm run build
```

For narrower checks:

```bash
cd server
npm test -- user.service.test.ts

cd ../client
npm run typecheck
npm test
```

Documentation-only changes do not require building the full application, but links, commands, and environment variable names should still be checked against the repository.

## External Services

| Service | Purpose | API key |
| --- | --- | --- |
| PVGIS | Photovoltaic production estimates. | No |
| Open-Meteo | Weather and forecast data. | No |
| ENTSO-E | Electricity prices by country. | Yes |
| Google OAuth | Google login. | Yes |
| SMTP provider | Password reset emails. | Yes |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, coding standards, review checklist, and local setup notes.

## License

This project is licensed under the MIT License.
