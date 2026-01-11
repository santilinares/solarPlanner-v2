# Solar Planner v2.0 - Client (Angular 21)

Modern Angular 21 standalone components application for solar farm planning and management.

## 🚀 Features

- **Angular 21** with standalone components (no NgModules)
- **Strict TypeScript** configuration
- **Angular Material** UI components
- **Leaflet** maps with drawing capabilities (free tier)
- **Highcharts** for data visualization
- **JWT authentication** with guards and interceptors
- **Lazy-loaded** feature modules
- **Jest** testing framework
- **ESLint + Prettier** code quality

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                    # Singleton services, guards, interceptors
│   │   ├── guards/              # Auth & role guards
│   │   ├── interceptors/        # JWT interceptor
│   │   ├── services/            # Core HTTP services
│   │   └── models/              # Domain interfaces
│   ├── shared/                  # Reusable components & widgets
│   │   ├── components/          # Header, footer, sidebar
│   │   └── widgets/             # Map, charts
│   ├── features/                # Feature modules (lazy-loaded)
│   │   ├── visitor/             # Public pages
│   │   ├── user/                # User dashboard & projects
│   │   └── admin/               # Admin panel
│   └── layouts/                 # Layout wrappers
│       ├── visitor-layout/
│       ├── user-layout/
│       └── admin-layout/
├── environments/                # Environment configs
└── assets/                      # Static assets
```

## 🔧 Setup Instructions

### Prerequisites
- Node.js 22.x LTS
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Development server (http://localhost:4200)
npm start

# Production build
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

## 🌍 Environment Configuration

Create environment files based on your needs:

**src/environments/environment.ts** (development):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:1235',
  markerIcon: 'https://image.flaticon.com/icons/png/128/2427/2427035.png'
};
```

**src/environments/environment.prod.ts** (production):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourproduction.com',
  markerIcon: 'https://image.flaticon.com/icons/png/128/2427/2427035.png'
};
```

## 🛣️ Routing

- `/` - Landing page (visitor)
- `/login` - Login page
- `/registration` - User registration
- `/forgot_password` - Password reset request
- `/reset_password/:id/:token` - Password reset form
- `/projects` - User dashboard (protected)
- `/projects/add` - Add new project (protected)
- `/projects/all` - View all user projects (protected)
- `/projects/:id` - View project details (protected)
- `/panels/all` - View panels (protected)
- `/admin` - Admin dashboard (admin only)
- `/admin/projects` - Manage all projects (admin only)
- `/admin/users` - Manage users (admin only)
- `/admin/panels` - Manage panels (admin only)

## 🔐 Authentication

JWT tokens stored in localStorage. Interceptor automatically attaches `Authorization: Bearer <token>` header to all API requests.

### Guards
- **AuthGuard**: Protects user routes
- **AdminGuard**: Protects admin routes (extends AuthGuard with role check)

## 📦 Key Dependencies

### Core
- `@angular/core` ^21.0.0
- `@angular/router` ^21.0.0
- `@angular/forms` ^21.0.0

### UI
- `@angular/material` ^21.0.0
- `@angular/cdk` ^21.0.0

### Mapping (Free Tier)
- `leaflet` ^1.9.4
- `leaflet-draw` ^1.0.4
- `@turf/turf` ^7.0.0

### Charts
- `highcharts` ^11.2.0
- `highcharts-angular` ^4.0.0

### PDF Generation
- `jspdf` ^2.5.1

### Testing
- `jest` ^29.7.0
- `jest-preset-angular` ^13.1.4

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

## 📝 Code Style

Project uses ESLint + Prettier. Configuration files:
- `.eslintrc.js` - ESLint rules
- `.prettierrc.json` - Prettier formatting

## 🚧 TODO / Future Enhancements

- [ ] Implement full Leaflet map integration with polygon drawing
- [ ] Add jsPDF plan generation logic
- [ ] Implement all Highcharts configurations
- [ ] Add comprehensive unit tests
- [ ] Add E2E tests with Playwright
- [ ] Implement refresh token rotation
- [ ] Add progressive web app (PWA) support
- [ ] Implement state management (signals or NgRx if needed)
- [ ] Add internationalization (i18n)
- [ ] Optimize bundle size and lazy loading
- [ ] Add Docker deployment configuration

## 📚 Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [Angular Material](https://material.angular.io/)
- [Leaflet Documentation](https://leafletjs.com/)
- [Highcharts Angular](https://www.highcharts.com/blog/products/highcharts-angular/)
- [Jest Documentation](https://jestjs.io/)

## 🤝 Contributing

Follow the coding standards and ensure all tests pass before submitting changes.

## 📄 License

Private project for thesis purposes.
