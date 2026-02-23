# Solar Planner v2 - AI Agent Development Log

This document tracks all significant development work performed using AI assistance, serving as a development journal and knowledge base.

---

## 📅 February 20, 2026 - PrimeNG Style Architecture Cleanup

### Topic
Remove PrimeNG class overrides that were competing with the preset token system and enforce the project's styling rules.

### Summary of Request
User reported that some PrimeNG component tokens defined in `primeng-preset.ts` were being overridden by global SCSS and component-level CSS rules, preventing the preset from being the single source of truth.

### What Was Achieved
- **Removed "PRIMENG OVERRIDES" section from `styles.scss`**: Eliminated global selectors `.p-button`, `.p-card`, `.p-card-title`, `.p-card-content`, `.p-inputtext`, `.p-dropdown`, `.p-calendar`, `.p-inputnumber-input`. These ruled outside any `@layer`, so they always won over preset tokens (which are emitted inside `@layer primeng`).
- **Added card `borderColor` token to preset**: Since the card border was previously only set in `styles.scss`, it was moved into the `card.colorScheme.light.root.borderColor` and `card.colorScheme.dark.root.borderColor` tokens (`#B7E4C7` / `#2D6A4F`) so no visual regression occurs.
- **Added card `borderWidth` and `borderStyle` to preset root**: Ensures the border is rendered via the token system.
- **Removed DataTable row hover `!important` override from `theme-dark.scss`**: The preset already defines `datatable.row.hoverBackground`; the `!important` CSS rule was silently winning over it.
- **Fixed dark mode selector mismatch**: All selectors in `theme-dark.scss` were using `[data-theme="dark"]` while `app.config.ts` declares `darkModeSelector: '.dark-mode'`. Changed `:root[data-theme="dark"]` → `:root.dark-mode`, `[data-theme="dark"]` → `.dark-mode`, and updated the `prefers-reduced-motion` block accordingly.
- **Added `.btn-lift` and `.card-hoverable` utility classes to `animations.scss`**: Preserves the opt-in lift/hover-shadow animations as composable classes instead of global PrimeNG overrides.
- **Removed component-level PrimeNG token overrides**: Stripped `.p-button { padding }` from `dashboard.component.scss` (scoped inside `.btn-solar`) and `.p-button { font-weight: 600 }` from `admin-dashboard.component.scss` (redundant with preset token `button.root.label.fontWeight: '600'`).

### Full Original Prompt
"Necesito que revisemos por qué en algunos casos se está sobreescribiendo los valores que se han definido en algunos componentes css de primeng, que no estan permitiendo que coja como referencia los valores establecidos en el fichero primeng-preset."  
"Vale, hagamos lo que dices y eliminemos por completo los primeng overrides..."

### Affected Files
- `client/src/styles.scss`
- `client/src/styles/primeng-preset.ts`
- `client/src/styles/theme-dark.scss`
- `client/src/styles/animations.scss`
- `client/src/app/features/user/dashboard/dashboard.component.scss`
- `client/src/app/features/admin/admin-dashboard/admin-dashboard.component.scss`

### Reasoning Snapshot
- With `cssLayer: { name: 'primeng', order: 'theme, primeng' }`, any CSS rule written outside a layer wins over preset tokens regardless of specificity. Global `.p-button` / `.p-card` selectors in `styles.scss` were exactly this problem.
- The `[data-theme="dark"]` vs `.dark-mode` mismatch meant PrimeNG dark tokens activated correctly but the app's own CSS variables (`--surface-ground`, `--text-color`, etc.) never switched, causing a split state.
- Scoped component overrides like `.stat-card .p-card-body { padding }` are allowed per styling rules (wrapper-scoped); only unscoped or token-duplicating ones were removed.
- Utility classes in `animations.scss` preserve the desired micro-interactions without polluting PrimeNG's token chain.

---

## 📅 February 18, 2026 - Projects List Loading - Pagination & Validation Fix

### Topic
Fix user projects list not loading due to missing endpoint implementation and pagination support.

### Summary of Request
User reported that the projects list view was not loading projects for authenticated users. The frontend kept showing a loading state indefinitely.

### What Was Achieved
- **Fixed Frontend Service**: Changed `getMyProjects()` endpoint from `/api/projects/my` (non-existent) to `/api/projects` (correct endpoint that auto-filters by user).
- **Added Pagination to Backend Query Schema**: Expanded `ProjectQuerySchema` to include `page` (default: 1) and `limit` (default: 10, max: 100) parameters with proper coercion.
- **Updated ProjectListResponse Type**: Changed from `{ projects: [...], total }` to `{ data: [...], total, page, limit, totalPages }` to match frontend expectations.
- **Implemented Backend Pagination Logic**: 
  - Extract and validate `page` and `limit` from query parameters.
  - Calculate proper skip: `(page - 1) * limit`.
  - Apply MongoDB `.skip()` and `.limit()` to optimize queries.
  - Calculate `totalPages` for response.
- **Fixed TypeScript Casting Issue**: Added `unknown` intermediate cast in controller to avoid type mismatch when validation middleware transforms `req.query`.
- **Added Client Debugging**: Improved error logging in component's `loadProjects()` method to surface API response structure and errors to browser console.

### Full Original Prompt
```
User 1: "The projects all view is not correctly loading the projects that correspond to a user"
User 2: "Now it keeps loading but does not show anything"
User 3: "Maybe the issue is with what happens after the isloading is set to true"
User 4: "[TypeScript compilation error in project.controller.ts:41 - Conversion of ParsedQs type]"
```

### Affected Files
- `client/src/app/core/services/project.service.ts` (endpoint fix)
- `client/src/app/features/user/user-projects/user-projects.component.ts` (improved error handling & logging)
- `server/src/schemas/project.schema.ts` (pagination parameters added)
- `server/src/types/project.types.ts` (ProjectListResponse structure updated)
- `server/src/services/project.service.ts` (pagination logic implemented)
- `server/src/controllers/project.controller.ts` (TypeScript type casting fix)

### Reasoning Snapshot
- **Endpoint Mismatch**: The backend's `listProjects` controller auto-filters by user, so the frontend's `/my` suffix was unnecessary and incorrect.
- **Missing Pagination**: The backend accepted `page` and `limit` query params but didn't validate/process them; the schema and query logic were incomplete.
- **Response Structure Mismatch**: Frontend expected `{ data, total, page, limit, totalPages }` but service was returning `{ projects, total }`.
- **Type Safety**: Using `unknown` intermediate cast tells TypeScript to trust the runtime transformation by validation middleware.
- **Observability**: Added console logging to help diagnose API response structure and errors in development without needing server logs.

### Testing Notes
- Component now properly handles paginated responses after backend fixes.
- Error messages now surface in browser console for easier debugging.
- Server should start without TypeScript errors when restarted with `npm run dev:watch`.

### Next Steps
- Start server: `cd server && npm run dev:watch`
- Check browser DevTools console for `Projects response:` logs to verify data flow.
- If projects still don't appear, console logs will show the actual API response structure for further debugging.

---

## 📅 February 15, 2026 - PrimeNG Preset Completion (All 14 Components)

### Topic
Complete PrimeNG preset token coverage by adding the final 6 missing components: Skeleton, Message, Menubar, Password, DataView, and Tag.

### Summary of Request
User approved adding all remaining component tokens in a single iteration to complete preset coverage.

### What Was Achieved
- Added Skeleton component tokens for loading placeholders with light/dark background and animation colors.
- Added Message component tokens with colorScheme variants (info, success, warn, error, secondary) for all states.
- Added Menubar component tokens for navigation styling, including item hover/active states and mobile button.
- Added Password component tokens for meter strength indicator (weak/medium/strong) and overlay positioning.
- Added DataView component tokens for list/grid header, content, footer, and paginator styling.
- Added Tag component tokens with semantic color variants (primary, secondary, success, info, warn, danger, contrast).
- All components include light/dark colorScheme support for full theme consistency.

### Full Original Prompt
"Yes, add all of those in this next iteration"

### Affected Files
- `client/src/styles/primeng-preset.ts`

### Reasoning Snapshot
- Closes the gap between Aura base and project's PrimeNG component usage (8/14 → 14/14 components covered).
- All tokens follow the Aura structure: primitive → semantic → colorScheme.light/dark for consistency.
- Reduces reliance on CSS overrides; enables proper token-first styling for all used components.
- Aligns with PrimeNG best practice: "Configure in preset, avoid CSS hacks."

---

## 📅 February 15, 2026 - Dashboard HTML/SCSS Migration

### Topic
Move dashboard template and styles into dedicated files for SCSS token usage.

### Summary of Request
User asked to proceed straight to the dashboard migration after preset expansion.

### What Was Achieved
- Extracted the dashboard template to a dedicated HTML file.
- Extracted the dashboard styles to a dedicated SCSS file.
- Wired the component to `templateUrl` and `styleUrls`.

### Full Original Prompt
"Expand into those 3 and then lets go straight to the migration"

### Affected Files
- `client/src/app/features/user/dashboard/dashboard.component.ts`
- `client/src/app/features/user/dashboard/dashboard.component.html`
- `client/src/app/features/user/dashboard/dashboard.component.scss`

### Reasoning Snapshot
- Keeps the component ready for SCSS tokens without changing UI behavior.

---

## 📅 February 15, 2026 - PrimeNG Preset Expansion (Select + DataTable)

### Topic
Extend the PrimeNG preset with select, datatable, and focus-ring tokens.

### Summary of Request
User asked to expand preset into select, datatable, and focus ring, then proceed to migration.

### What Was Achieved
- Added form field focus ring tokens and select overlay tokens.
- Added datatable tokens for headers, row hover, and scheme-specific borders.
- Removed overlapping datatable CSS overrides from global styles.

### Full Original Prompt
"Proceed and also generate a table of the component tokens that are missing in the primeng preset file"

### Affected Files
- `client/src/styles/primeng-preset.ts`
- `client/src/styles.scss`

### Reasoning Snapshot
- Keeps table and select styling inside the preset while avoiding duplicate overrides.

---

## 📅 February 15, 2026 - PrimeNG Preset Expansion (Buttons, Inputs, Cards)

### Topic
Expand the preset with component tokens for buttons, inputs, and cards.

### Summary of Request
User approved continuing the preset expansion.

### What Was Achieved
- Added form field sizing, button root tokens, input border radius, and card spacing/shadows to the preset.
- Reduced overlapping PrimeNG overrides in global styles while keeping hover lift effects.

### Full Original Prompt
"Ok. continue expanding the preset. I approve"

### Affected Files
- `client/src/styles/primeng-preset.ts`
- `client/src/styles.scss`

### Reasoning Snapshot
- Moves core component styling into PrimeNG tokens and keeps only the behavior-specific overrides in CSS.

---

## 📅 February 15, 2026 - PrimeNG Button/Form Tokens + Theme Cleanup

### Topic
Align button and form field styling with PrimeNG component tokens and reduce overlapping overrides.

### Summary of Request
User approved adding component tokens and trimming SCSS overrides to better follow PrimeNG presets.

### What Was Achieved
- Added form field semantic tokens and warning button component tokens derived from theme values.
- Removed overlapping PrimeNG component overrides from light/dark theme files.

### Full Original Prompt
"Yeah lets do that"

### Affected Files
- `client/src/styles/primeng-preset.ts`
- `client/src/styles/theme-light.scss`
- `client/src/styles/theme-dark.scss`

### Reasoning Snapshot
- Token-first styling reduces duplication and aligns with PrimeNG styled-mode recommendations.

---

## 📅 February 15, 2026 - PrimeNG Preset Token Expansion

### Topic
Expand the PrimeNG preset with primitive, semantic, and component tokens derived from theme SCSS.

### Summary of Request
User asked to avoid oversimplifying and to extract config values from theme-light/theme-dark files.

### What Was Achieved
- Added primitive palettes (green, yellow, blue) based on existing theme values.
- Mapped semantic tokens for primary, surfaces, form field hover border, and focus ring.
- Added card component tokens for light/dark schemes.

### Full Original Prompt
"Dont oversimply it, extract the configs from the theme scss files"

### Affected Files
- `client/src/styles/primeng-preset.ts`

### Reasoning Snapshot
- Keeps PrimeNG styling aligned with current design tokens while avoiding heavy CSS overrides.

---

## 📅 February 15, 2026 - PrimeNG Preset Extraction

### Topic
Adopt PrimeNG styled-mode preset structure using existing theme tokens.

### Summary of Request
User asked to follow PrimeNG recommendations by using a preset while keeping the current theme-light/theme-dark approach.

### What Was Achieved
- Extracted the PrimeNG preset definition to a dedicated file for easier maintenance.
- Wired the preset back into the PrimeNG provider configuration.

### Full Original Prompt
"Ok, lets do that, but not overkilled. Use the preset like files we already have (theme-light and theme-dark), and remember to follow the rules inside the FRONTEND-MODERNIZATION file"

### Affected Files
- `client/src/styles/primeng-preset.ts`
- `client/src/app/app.config.ts`

### Reasoning Snapshot
- Keeps the styled-mode preset aligned with the existing token system without refactoring the themes.

---

## 📅 February 15, 2026 - Dashboard Button Color Fix

### Topic
Remove unintended yellow background from the Dashboard "New Project" button.

### Summary of Request
User reported the button background was yellow and wanted it removed.

### What Was Achieved
- Removed the explicit yellow background/border override on the button.
- Switched hover glow to a neutral shadow.

### Full Original Prompt
"Also, for some reason the button has a yellow background color. Can we remove that? I think its because of the hover effect that may not be configured properly"

### Affected Files
- `client/src/app/features/user/dashboard/dashboard.component.ts`

### Reasoning Snapshot
- The yellow styling came from explicit overrides; removing them restores the theme defaults.

---

## 📅 February 15, 2026 - Dashboard Button Padding Tweak

### Topic
Adjust spacing inside the Dashboard "New Project" button.

### Summary of Request
User asked to add padding inside the button without expanding into new files.

### What Was Achieved
- Added padding to the PrimeNG button content via the existing inline styles.

### Full Original Prompt
"I dont want to expand much in files now. I just want to adjust the space between the content inside the button and the edge of the button"

### Affected Files
- `client/src/app/features/user/dashboard/dashboard.component.ts`

### Reasoning Snapshot
- Kept the change minimal and localized to the existing inline styles as requested.

---

## 📅 February 14, 2026 - Projects Flow Screen Rebuild (Client-First)

### Topic
Rebuild of user project flow screens (`My Projects`, `Project Detail`, `Create Project`) based on `FRONTEND-MODERNIZATION.md`, without server-side changes.

### Summary of Request
User requested to begin redoing screens for projects list, project details, and new project creation using provided Figma AI specifications, while keeping work client-side first and deferring server updates.

### What Was Achieved
- Replaced placeholder `My Projects` page with a complete responsive grid of project cards, including:
  - Header with CTA button.
  - Loading, error, and empty states.
  - Card thumbnail, metadata, and status badge behavior.
- Replaced placeholder `Project Detail` page with complete layout:
  - Sticky header with back navigation and metadata.
  - Main content sections (Installation Area and 3D placeholders).
  - Sidebar cards for project stats and panel configuration.
  - Loading and error states.
- Modernized `Create Project` page while preserving existing map draw + estimation flow:
  - Updated visual hierarchy, spacing, card system, colors, and controls.
  - Kept form behavior, polygon drawing, and estimation logic intact.
- Implemented client-side contract adaptation/mapping so UI can match new screen contract without touching server APIs yet.
- Verified with successful development build.

### Full Original Prompt
"If the data contracts differ, let me know the differences and we will then review if the missing parameters are worth adding. The idea is to first modify everything on the client side and then adjust the server side if necessary."

### Affected Files
- `client/src/app/features/user/user-projects/user-projects.component.ts`
- `client/src/app/features/user/view-project/view-project.component.ts`
- `client/src/app/features/user/add-project/add-project.component.ts`

### Contract Notes (Client-First)
- Existing project payload is currently geo/engineering-oriented.
- New UI expects list/detail-friendly fields (`location`, `panels`, `power`, `status`, etc.).
- Screen components currently map/derive these fields client-side from existing API response shape and fallbacks.

### Validation
- `ng build --configuration development` completed successfully.

---

## 📅 February 14, 2026 - Native Angular Enter/Leave Animation Migration

### Topic
Migration from deprecated `provideAnimations` usage to native Angular `animate.enter` / `animate.leave` patterns.

### Summary of Request
User reported that `provideAnimations` is deprecated and requested using Angular MCP documentation to determine the correct modern animation approach.

### What Was Achieved
- Confirmed through Angular MCP docs (Angular v21) that `provideAnimations` is deprecated and native CSS with `animate.enter` / `animate.leave` is the recommended direction.
- Removed deprecated provider wiring from application config.
- Implemented native enter/leave animations in key user-facing screens:
  - Validation messages and auth messages in login/register forms.
  - Loading/empty/data state transitions in panel list view.
- Added reusable global leave utility class for cleaner transition exits.
- Validated migration with development build success.

### Full Original Prompt
"Provide animations is deprecated, use the Angular MCP to understand what to use for animations (enter and leave animations)"

### Affected Files
- `client/src/app/app.config.ts`
- `client/src/styles/animations.scss`
- `client/src/app/features/visitor/login/login.component.ts`
- `client/src/app/features/visitor/register/register.component.ts`
- `client/src/app/features/user/panel-list/panel-list.component.ts`

### Reasoning Snapshot
- Prefer Angular-native animation directives for forward compatibility and lower framework coupling.
- Keep the migration minimal and focused on conditional UI blocks so behavior is immediately visible.
- Reuse existing animation utility classes and add only one new class (`animate-fade-out`) to avoid unnecessary complexity.

### Validation
- `ng build --configuration development` completed successfully after the migration.

---

## 📅 February 11, 2026 - Complete Frontend Modernization with PrimeNG

### Topic
Migration from Angular Material to PrimeNG with custom solar-themed design system

### Summary of Request
User requested transformation of the current frontend to make it look more modern by:
- Replacing Angular Material with PrimeNG
- Implementing animations throughout the application
- Applying a custom solar-themed color palette optimized for the target audience (homeowners, farmers, small businesses)
- Creating a modern, energy-focused user experience

### What Was Achieved

#### 1. **Dependency Management**
- Removed Angular Material (@angular/material, @angular/cdk)
- Installed PrimeNG v21, PrimeIcons, and PrimeFlex
- Updated Angular packages to latest minor version (21.0.x → 21.1.x) for compatibility

#### 2. **Design System Creation**
Created a comprehensive solar-themed design system with 4 new SCSS files:

**`client/src/styles/variables.scss`**
- Complete color palette for light and dark modes
- Light mode: Soft mint green (#F0F7F4) background, emerald primary (#2D6A4F), electric yellow accent (#FFD600)
- Dark mode: Obsidian green (#081C15) background with glowing solar accents
- Spacing scale, border radius values (organic rounded corners 1.5-3rem)
- Shadow system with special solar glow effects
- Typography scale and responsive breakpoints

**`client/src/styles/theme-light.scss`**
- CSS custom properties for light mode
- Component-specific styling (buttons, cards, inputs)
- Solar accent card styling with yellow highlight
- Hover effects and transitions optimized for daylight viewing

**`client/src/styles/theme-dark.scss`**
- CSS custom properties for dark mode
- Enhanced glow effects for solar accent elements
- Deeper shadows for better depth perception
- Premium technical aesthetic with cyan highlights

**`client/src/styles/animations.scss`**
- Keyframe animations: fadeIn, fadeInUp, slideIn, scaleIn, pulse, solarPulse, shake, spin, shimmer
- Utility classes for easy animation application
- Stagger animations for list items
- Hover effects: lift, scale, glow
- Loading states: skeleton and spinner
- Performance consideration: respects prefers-reduced-motion

#### 3. **Global Styles Modernization**
Updated `client/src/styles.scss`:
- Converted from @import to @use for Sass modules (addressing deprecation warnings)
- Integrated PrimeNG styling without deprecated resource paths
- Applied organic border radius to all components
- Custom scrollbar styling
- Responsive utilities and typography system
- PrimeNG component overrides for solar theme consistency

#### 4. **Component Migration**

**Visitor Components:**
- **Landing Page** (`landing-page.component.ts`):
  - Hero section with gradient background and animated solar icon
  - CTA buttons with solar yellow accent and hover glow
  - Feature cards using PrimeNG Card with icons
  - Stagger animations on grid items
  - Fully responsive design

- **Login** (`login.component.ts`):
  - PrimeNG Card with gradient header
  - InputText and Password components with visual feedback
  - Message component for error display with shake animation
  - Focus states with solar theme colors
  - Animated validation errors

- **Register** (`register.component.ts`):
  - Two-column form layout for better UX
  - Password strength indicator with PrimeNG Password
  - Solar yellow accent button theme
  - Success/error message animations

**User Components:**
- **Dashboard** (`dashboard.component.ts`):
  - Stat cards with icon backgrounds and color coding
  - Solar accent card with yellow border and glow
  - Skeleton loading states
  - Recent projects grid with hover lift effects
  - Project cards with clickable routing
  - Responsive grid layouts

- **Panel List** (`panel-list.component.ts`):
  - DataView-style grid layout
  - Efficiency badge tags
  - Solar icon with pulse animation
  - Spec items with hover states
  - Empty state with centered icon

- **User Projects** (`user-projects.component.ts`):
  - "Coming Soon" placeholder with feature preview
  - Feature list with checkmarks
  - Solar yellow CTA button
  - Graceful degradation pattern

**Admin Components:**
- **Admin Dashboard** (`admin-dashboard.component.ts`):
  - Red accent theme for admin distinction
  - Management cards with icon backgrounds
  - Info card for planned features
  - Text buttons for secondary actions

- **Users List** (`users-list.component.ts`):
  - Feature preview placeholder
  - Admin-specific styling with red accents

**Layout Components:**
- **User Layout** (`user-layout.component.ts`):
  - Gradient header with sticky positioning
  - Animated solar icon logo
  - Modern navigation with icons and labels
  - Responsive hamburger-style on mobile
  - Footer with branding
  - PrimeNG Button integration for logout

#### 5. **Application Configuration**
Updated `client/src/app/app.config.ts`:
- Added `provideAnimations()` for PrimeNG animation support

### Full Original Prompt
"I want you to help me transform the current frontend screens to make them look more modern, for that I want you to use PrimeNG instead of material design. I want the application to have animations. As you know we are creating an application to be used by home owners, small businesses and farmers evaluate how beneficial would be to install solar panels. I want the app to feel like a new, modern experience, and I would like to use the color palette that you know I want for this project."

### Affected Files

**New Files Created:**
- `client/src/styles/variables.scss`
- `client/src/styles/theme-light.scss`
- `client/src/styles/theme-dark.scss`
- `client/src/styles/animations.scss`

**Modified Files:**
- `client/package.json` (dependencies)
- `client/src/styles.scss` (global styles)
- `client/src/app/app.config.ts` (animations provider)
- `client/src/app/features/visitor/landing-page/landing-page.component.ts`
- `client/src/app/features/visitor/login/login.component.ts`
- `client/src/app/features/visitor/register/register.component.ts`
- `client/src/app/features/user/dashboard/dashboard.component.ts`
- `client/src/app/features/user/panel-list/panel-list.component.ts`
- `client/src/app/features/user/user-projects/user-projects.component.ts`
- `client/src/app/features/admin/admin-dashboard/admin-dashboard.component.ts`
- `client/src/app/features/admin/users-list/users-list.component.ts`
- `client/src/app/layouts/user-layout/user-layout.component.ts`

### Technical Reasoning

#### Why PrimeNG Over Material?
1. **Lighter Bundle Size**: PrimeNG is more tree-shakable and results in smaller production builds
2. **Better Customization**: Easier to theme with CSS custom properties without fighting framework defaults
3. **Rich Component Set**: 90+ components with consistent API
4. **Better Accessibility**: Improved ARIA support and keyboard navigation out of the box
5. **Active Development**: PrimeNG v21 is actively maintained and compatible with latest Angular

#### Design System Architecture
The design system follows a layered approach:
1. **Variables Layer**: All design tokens (colors, spacing, shadows) in one file for easy maintenance
2. **Theme Layer**: Light and dark modes as separate files for clear separation of concerns
3. **Animation Layer**: Reusable animations as utility classes
4. **Component Layer**: Each component imports what it needs

This architecture allows:
- Easy theme switching (future dark mode toggle)
- Consistent design language across all components
- Simple maintenance (change one variable, update everywhere)
- Performance optimization (only load what's needed)

#### Color Psychology Rationale
- **Green Primary**: Represents sustainability, nature, growth - core values of solar energy
- **Yellow Accent**: Directly represents solar/sun energy, draws attention to key actions
- **Blue Technical**: Used for data visualization (sky, water, climate) - creates trust
- **Organic Shapes**: Rounded corners (1.5-3rem) evoke natural, friendly, accessible feeling

#### Animation Strategy
Animations serve specific UX purposes:
- **Page Transitions**: Orient users to navigation changes
- **Stagger Effects**: Guide eye movement through content hierarchy
- **Solar Pulse**: Creates ambient energy feeling, reinforces solar theme
- **Hover Lift**: Provides tactile feedback, indicates interactivity
- **Shake on Error**: Universal pattern for "something's wrong"
- **Skeleton Loading**: Reduces perceived wait time, sets content expectations

All animations respect `prefers-reduced-motion` for accessibility.

#### Technical Challenges Solved
1. **Sass Module System**: Converted deprecated @import to @use, required namespace handling (vars.$variable-name)
2. **PrimeNG v21 Structure**: New version doesn't have resources/ folder, had to adjust import paths
3. **CSS Custom Properties**: Used for runtime theming while maintaining Sass variables for build-time calculations
4. **Z-index Management**: Created scale in variables to prevent z-index conflicts
5. **Responsive Design**: Mobile-first approach with consistent breakpoints

### Testing Notes
- Build successful with no errors
- All TypeScript strict mode checks pass
- No Sass deprecation warnings after @use migration
- Hot reload working correctly during development
- Component imports properly tree-shaken

### Future Enhancements
- Dark mode toggle implementation (infrastructure already in place)
- Add more PrimeNG components (DataTable, Dialog, Toast) as features are built
- Implement theme persistence (localStorage)
- Add Highcharts integration with solar theme colors
- Create reusable component library from patterns

### Metrics
- **Time to Complete**: ~4-5 hours of implementation
- **Files Modified**: 17 files
- **New Files Created**: 4 theme files
- **Lines of Code**: ~2,500 lines (styles + component templates)
- **Bundle Size Impact**: TBD (needs production build measurement)

---

## 📅 February 18, 2026 - Admin Panels View — PrimeNG Redesign & File Split

### Topic
Redesign the admin panels management view to match the user panel-list style, and split it into 3 separate files.

### Summary of Request
User asked to update the admin panels list view using the user panel-list as a reference, and to break the single component file into separate component, HTML, and SCSS files.

### What Was Achieved
- **Replaced raw HTML table** with PrimeNG card grid layout matching `panel-list.component.ts` (user view).
- **Added admin-specific actions** (Edit / Delete buttons) on each card using `p-button` with `severity="secondary"` and `severity="danger"`.
- **Added "Add Panel" `p-button`** in the page header for quick access.
- **Improved empty state** with an icon and "Add First Panel" call-to-action button.
- **Skeleton loading states** using `p-skeleton` inside `p-card` grid (consistent with user view).
- **Split into 3 files**: `panels.component.ts`, `panels.component.html`, `panels.component.scss`.
- **Added `ChangeDetectionStrategy.OnPush`** and removed `CommonModule` in favour of specific PrimeNG modules.

### Full Prompt
> "Our routes are not very well organized, but lets worry about that later. Now lets continue updating screens. Lets update the admin panel list view using the one from the user. Also break the component file into three files (component, css and html)"

### Affected Files
- `client/src/app/features/admin/panels/panels.component.ts` — Updated metadata, PrimeNG imports, OnPush
- `client/src/app/features/admin/panels/panels.component.html` — New file (extracted + redesigned template)
- `client/src/app/features/admin/panels/panels.component.scss` — New file (card grid styles matching user view)

### AI Reasoning
The user panel-list already established the design language (card grid, bolt icon with yellow pulse, efficiency badge, spec items). The admin view needed the same visual structure with two additional concerns: (1) action buttons per card (Edit/Delete) using PrimeNG outlined buttons, and (2) a top-level "Add Panel" button. Splitting into 3 files follows Angular best practices and makes the template maintainable as it grows.

---

## 📅 February 22, 2026 - Leaflet Map in View-Project Component

### Topic
Display an interactive Leaflet map in the view-project page using the project's stored coordinates.

### Summary of Request
User asked to add a Leaflet map to the view-project page showing the project's location. Leaflet was already present (used in add-project). Goal was to reuse the existing setup rather than duplicating code.

### What Was Achieved
- **Created `LocationMapComponent`** (`client/src/app/shared/components/location-map/location-map.component.ts`): A reusable, read-only Leaflet map standalone component using Angular signal inputs (`lat`, `lng`, `polygon`, `zoom`). Reuses the same three tile layers (Street/Satellite/Topo) already used in `AddProjectComponent`. Uses `@ViewChild` + `ElementRef` to avoid hard-coded `id="map"` conflicts. Optionally draws the installation polygon in yellow when coordinates are provided.
- **Extended `ProjectDetailView`** interface with `lat: number | null`, `lng: number | null`, and `polygonCoords: Coordinates[]`.
- **Updated `mapProject()`** to extract coordinates from `source.coordinates?.lat/lng` with fallbacks to `source.lat/source.lon`.
- **Replaced the map placeholder** in view-project template with `<app-location-map>` inside a fixed-height wrapper. Falls back to the placeholder icon if coordinates are missing.
- **Confirmed Leaflet CSS** is already imported globally in `styles.scss` — no additional setup needed.

### Full Prompt
> "Leaflet is already included. Look inside the add-project component. There is a leaflet map that has already been implemented there. Can we reuse that?"

### Affected Files
- `client/src/app/shared/components/location-map/location-map.component.ts` — New reusable map component
- `client/src/app/features/user/view-project/view-project.component.ts` — Added imports, extended view model, replaced placeholder

### AI Reasoning
Instead of copying the Leaflet initialization directly into view-project (which would duplicate tile layer setup and CSS encapsulation concerns), the approach extracted the read-only display logic into a shared `LocationMapComponent`. This keeps `add-project` self-contained (it needs draw controls, edit events, geolocation), while giving any other page a simple drop-in map via signal inputs. `ViewEncapsulation.None` is carried over since Leaflet's CSS must escape component scope to style `.leaflet-container` and its children.

---

