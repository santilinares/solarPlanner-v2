# Solar Planner v2 - AI Agent Development Log

This document tracks all significant development work performed using AI assistance, serving as a development journal and knowledge base.

---

## 📅 April 15, 2026 - Priority 1 API Integrations (Foundation for Production Data)

### Topic
Implemented all four Priority 1 backend API integrations for the Solar Planner v2 thesis project: country resolution, timezone resolution, electricity price lookup, and Solcast PV production forecasts.

### Summary of Request
User requested implementation of Priority 1 tasks (1.1-1.4) from the deferred features implementation plan. These integrations are foundational for production data and unlock Priority 2 (data display & nightly refresh).

### What Was Achieved

#### 1.1 Country Resolution
- Reverse-geocoded `(lat, lon)` → country name using `country-reverse-geocoding` package
- Added `resolveCountry()` private method with fallback to user-provided data
- Integrated into `createProject()` call chain (runs synchronously)

#### 1.2 Timezone Resolution
- Resolved IANA timezone from `(lat, lon)` using `geo-tz` package
- Added `resolveTimezone()` private method with UTC fallback
- Critical for Priority 2's nightly scheduler (3:47 AM local-time jobs)

#### 1.3 Electricity Price & Currency Lookup
- Integrated World Bank OpenAPI for electricity prices (free, no auth required)
- Added `fetchElectricityPrice()` with region-specific fallback pricing table:
  - Spain: €0.32/kWh, Germany: €0.38/kWh, France: €0.18/kWh, US: $0.14/kWh, Brazil: ₩0.08/kWh
- Graceful error handling: logs warnings, always falls back to defaults so API failures never block project creation
- Future iterations can add country-specific API sources (EU energy bulletin, World Bank dashboard)

#### 1.4 Solcast Integration with Realistic Mock Data
- Implemented `fetchSolcastData()` with two branches:
  - **Real API path:** Calls Solcast forecasts + estimated_actuals endpoints, aggregates hourly → daily
  - **Mock data path:** Generates realistic synthetic production curves based on:
    - Solar geometry (latitude-based day length calculation)
    - Bell curve production peaking at solar noon
    - Daily variation (cloudy/sunny days simulated as 60-100% of theoretical)
    - Proper timezone-aware data formatting
- Data returned: `prodToday` (hourly forecasts for today), `nextProd` (6-day ahead daily aggregates), `previousProd` (6-day historical daily aggregates)
- Environment flag `USE_MOCK_SOLCAST=true` enables mock data for development (avoids 10-request/day Solcast free tier limit)

#### Integration Points
- Modified `createProject()` to call all 4 APIs in parallel after geospatial field calculation
- All API calls wrapped in error handling; failures log warnings but never block project creation
- Updated project document with resolved `country`, `timezone`, `currency`, `price`, `prodToday`, `nextProd`, `previousProd`
- Project model already had all required fields (`IProject` interface) — no schema migration needed

#### Infrastructure
- Created `server/src/env.ts` — environment variable validation layer
  - Validates required vars on server startup
  - Exposes `USE_MOCK_SOLCAST` flag for development
  - Ready to add more API keys (future World Bank, EU sources)
- Updated `server/.env.example` and `server/.env` with Solcast and mock data config
- Added TypeScript type declaration (`server/src/types/country-reverse-geocoding.d.ts`) for untyped package

### Full Prompt
"Follow the implementation plan detailed in the markdown file i am passing you as context. Since most of these implementations are big, I would like you to take on the priority one tasks in this chat (1.1 - 1.4), not more than that."

After planning & approval: "Yes, lets go"

User feedback on approach:
1. Realistic mock data generation (solar geometry-based)
2. Warnings on API failures with fallback to defaults
3. World Bank API for electricity prices (free, covers most countries); region-specific APIs (Spain, EU) can be added in follow-up PRs

### Affected Files
- `server/package.json` — Added: `country-reverse-geocoding@0.2.2`, `geo-tz@8.1.6`
- `server/src/env.ts` — **NEW**: Environment variable validation
- `server/src/types/country-reverse-geocoding.d.ts` — **NEW**: TypeScript type declarations
- `server/src/services/project.service.ts` — Added 7 new private methods + modified `createProject()`:
  - `resolveCountry()` — reverse geocoding
  - `resolveTimezone()` — IANA timezone lookup
  - `fetchElectricityPrice()` — World Bank API + fallback prices
  - `fetchRealSolcastData()` — Real Solcast API calls
  - `generateMockSolcastData()` — Realistic synthetic production data
  - `extractTodayProduction()` — Transform Solcast response
  - `aggregateProductionByDay()` — Hourly → daily aggregation
- `server/.env.example` — Updated with Solcast and mock config
- `server/.env` — Configured `USE_MOCK_SOLCAST=true` for development
- `santi-agent-interactions.md` — This entry

### Code Quality
- ✅ TypeScript: `npx tsc --noEmit` passes (no compilation errors)
- ✅ Linting: `npm run lint` passes for project.service.ts (no new errors)
- ✅ Build: `npm run build` succeeds
- ✅ Package management: Both new packages installed and locked in `package-lock.json`

### Reasoning Snapshot

**API Integration Pattern:**
- Each API integration is isolated in a private method, making testing and future enhancements straightforward
- All 4 integrations run in parallel inside `createProject()` for efficiency
- Error handling is non-blocking: API failures log warnings but always complete with fallback data
- This pattern ensures that a temporary API outage (e.g., Solcast unavailability) never prevents users from creating projects

**Mock Data Realism:**
- Solar geometry calculation (`declinationRad`, `cosH`, sunrise/sunset) derives from actual solar position formulas
- Bell curve production (sine wave from sunrise to sunset) matches physical PV behavior
- Day-to-day variation (random 60-100% of theoretical) simulates real weather impact
- Production values scale with capacity (kW) and are properly rounded to 2 decimals
- This ensures developers testing with mock data get realistic numbers, not obviously synthetic values

**World Bank API Choice:**
- Free tier, no API key required (reduces config overhead)
- Covers ~190 countries (nearly all user locations)
- Returns well-structured JSON with electricity prices in USD
- Future iterations can add region-specific sources (Spain gov API, EU ENTSO-E) without breaking existing code
- This layered approach balances immediate functionality with extensibility

**Development Flag (`USE_MOCK_SOLCAST`):**
- Solcast free tier: 10 requests/day
- Mock flag lets developers test project creation without hitting quota
- Flag can be set per-environment: `true` in dev/test, `false` in staging/prod (with valid API key)
- Gracefully degrades: if real API fails, automatically falls back to mock data with warning

---

## 📅 March 15, 2026 - Logout Action Fix in User Dock

### Topic
Fixed the user dock logout action that appeared unresponsive.

### Summary of Request
User reported that clicking logout did nothing and asked why and how to fix it.

### What Was Achieved
- Identified incorrect event binding on logout button in user layout.
- Updated the button binding:
  - From: `(onClick)="logout()"`
  - To: `(click)="logout()"`
- Kept existing logout service behavior (token cleanup + redirect).

### Full Prompt
"When I try to log out nothing happens, why is that? How can we fix it?"

"Aprrove"

### Affected Files
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- In this template, `pButton` is used as a directive on a native button element, so it must use native Angular click binding (`click`).
- `onClick` did not trigger the component method, which made logout appear broken.

---

## 📅 March 10, 2026 - User Projects Grid Aligned with Panel List Auto-Fill Mechanism

### Topic
Updated the `My Projects` card grid to use the same responsive CSS grid mechanism as the panel list view.

### Summary of Request
User asked whether the projects page should use the same mechanism as panel list, then approved applying the change.

### What Was Achieved
- Replaced fixed breakpoint-based grid columns in `UserProjectsComponent`:
  - From: `1` column base, `2` at `768px+`, `5` at `1024px+`
  - To: `repeat(auto-fill, minmax(18.75rem, 1fr))`
- Kept explicit mobile behavior at `max-width: 768px` with `grid-template-columns: 1fr`.
- Result: smoother responsive scaling and consistency with panel list card behavior.

### Full Prompt
"Can we update the project list view so that it uses the same mechanism? Or the mechanism used in the project list view is better?"

"approve"

### Affected Files
- `client/src/app/features/user/user-projects/user-projects.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- The auto-fill/minmax pattern adapts naturally to any available width, avoids abrupt breakpoint jumps, and keeps both list pages behaviorally consistent.

---

## 📅 March 10, 2026 - Enum-Safe Admin Role Check in User Layout

### Topic
Resolved TypeScript ESLint enum comparison error in the unified user layout.

### Summary of Request
User asked what the lint issue meant, then approved applying the fix.

### What Was Achieved
- Updated admin role comparison in `UserLayoutComponent` to use enum-safe comparison:
  - From: `role === 'admin'`
  - To: `role === UserRole.ADMIN`
- Added `UserRole` import from `@core/models`.
- Preserved fallback `this.authService.isAdmin()` behavior.

### Full Prompt
"What is this issue?"

"approve"

### Affected Files
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- `currentUser()?.role` is typed as `UserRole`; comparing it to a raw string literal triggers `@typescript-eslint/no-unsafe-enum-comparison`.
- Comparing against `UserRole.ADMIN` keeps typing consistent and removes the lint error safely.

---

## 📅 March 10, 2026 - Reposition Add Panel Button Under Header Subtitle

### Topic
Moved the admin-only `Add Panel` action from the right side of the panel page header to directly below the subtitle text.

### Summary of Request
User requested placing the `Add Panel` button below the descriptive paragraph.

### What Was Achieved
- Updated panel list header template:
  - Moved `Add Panel` button inside the left text block under subtitle.
- Adjusted button styling for vertical spacing and inline placement.
- Fixed a strict typing regression found during validation:
  - Replaced string role check with enum-safe check (`UserRole.ADMIN`).
- Verified diagnostics: no compile errors in edited file.

### Full Prompt
"Can you move the add panel button to below the paragraph?"

"approve"

### Affected Files
- `client/src/app/features/user/panel-list/panel-list.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Grouping the primary admin action under the section description improves visual hierarchy and keeps related context/action together.

---

## 📅 March 10, 2026 - Move Panel Modal Actions to Header and Remove Close Icon

### Topic
Relocated panel modal action buttons (`Cancel`, `Update/Create`) to the `p-dialog` header and removed the default close (`x`) icon.

### Summary of Request
User requested moving update/cancel actions into the modal header and removing the `x` exit button.

### What Was Achieved
- Updated `p-dialog` behavior:
  - Set `[closable]="false"` to remove the default close icon.
  - Replaced string header with `pTemplate="header"` for custom header content.
- Added header action area with:
  - `Cancel` button (calls `onCancel()`)
  - `Update Panel` / `Create Panel` button (calls `onSubmit()` and preserves disabled/loading states)
- Removed old action button row from the bottom of the form.
- Added responsive styles for header action wrapping on smaller screens.
- Verified diagnostics: no compile errors in the edited file.

### Full Prompt
"Can you move the update panel and cancel buttons to the p-dialog-header and remove the exit button (x)"

"approve"

### Affected Files
- `client/src/app/features/admin/panels/panel-form.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Header actions improve discoverability and keep modal controls fixed at the top while the content scrolls.

---

## 📅 March 10, 2026 - Edit Panel Modal Boundary Containment Fix

### Topic
Prevented the edit panel form card from overflowing outside the PrimeNG modal boundaries.

### Summary of Request
User reported the edit panel card was going outside modal limits and requested strict prevention.

### What Was Achieved
- Enforced modal content containment:
  - `p-dialog` content now uses fixed viewport-safe constraints:
    - `max-height: 80vh`
    - `overflow-y: auto`
    - `overflow-x: hidden`
- Added defensive width constraints across form layout to prevent horizontal overflow:
  - `min-width: 0`, `max-width: 100%`, and `box-sizing` on core wrappers (`panel-form`, `step-card`, `form-grid`, `form-field`, `field-group`).
  - PrimeNG controls now have strict `width/max-width/min-width` constraints.
  - Added `overflow-x: hidden` on dialog content scope.
- Improved action row resilience:
  - `flex-wrap: wrap` for action buttons on constrained widths.

### Full Prompt
"Ok, but the edit panel card is going out of the boundaries of the modal. Prevent that at all costs."

"Ok, lets try"

### Affected Files
- `client/src/app/features/admin/panels/panel-form.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Overflow came from unconstrained nested grid/card elements and dialog content overflow settings; adding hard width constraints plus modal-level overflow policy prevents escape in both edit and create modes.

---

## 📅 March 10, 2026 - UI Refresh Blocker Fix (Dashboard Template Compile Error)

### Topic
Resolved a dashboard template typing error that was blocking clean client recompilation and making recent UI changes appear not reflected.

### Summary of Request
User reported that recent styling changes were not visible in the UI even with servers running.

### What Was Achieved
- Identified active compile error in dashboard greeting template:
  - `user()?.name` was invalid for the `User` model.
- Updated `DashboardComponent` to expose authenticated user signal to template.
- Updated greeting binding to a valid field:
  - `user()?.firstName || 'User'`.
- Re-validated diagnostics: no errors in touched files.

### Full Prompt
"No changes are reflecting in the UI"

"Try Again"

"The servers are running with no issues"

### Affected Files
- `client/src/app/features/user/dashboard/dashboard.component.ts`
- `client/src/app/features/user/dashboard/dashboard.component.html`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Angular compile errors can stop/interrupt hot updates, which makes unrelated style changes look like they are not applied.

---

## 📅 March 10, 2026 - Panel Modal Styling Aligned with Configure-Project Forms

### Topic
Adjusted the panel create/edit modal form styles to mirror the visual language used in `configure-project` form cards for consistency.

### Summary of Request
User requested replicating styling from `configure-project` forms so the panel modal looks consistent, while deferring full shared-style extraction to a later phase.

### What Was Achieved
- Refined panel form layout to match configure-project patterns:
  - Introduced `step-card` visual wrapper (same border, radius, subtle shadow behavior).
  - Added `step-card-header` with icon/title/subtitle hierarchy.
  - Reworked field layout using `form-grid` + `form-field` structure.
  - Added `field-error` and `field-hint` styles aligned with configure-project typography and spacing.
  - Styled dimensions section as nested card/group with consistent radius, border, and background treatment.
- Preserved PrimeNG-based controls and modal behavior from previous modernization.
- Confirmed diagnostics: no compile errors in touched files.

### Full Prompt
"Would it be possible to replicate the styling used in the configure-project component for the forms? I want it to look consistent. Actually, I have the goal of unifying all of these styling being used in different places in a common file, but that is not for now."

"Yes, that would be nice"

### Affected Files
- `client/src/app/features/admin/panels/panel-form.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Reusing existing visual tokens/patterns (`step-card`, form grid rhythm, hint/error system) achieves immediate consistency and reduces UI drift before extracting shared styles in a future refactor.

---

## 📅 March 10, 2026 - Remove Obsolete Admin Panels Component + PrimeNG Modal Modernization

### Topic
Removed the obsolete admin-only panels page component and modernized the panel create/edit popup to PrimeNG while preserving unified role-based panel management.

### Summary of Request
User requested deleting the old admin panel component before continuing, then modernizing the create/edit panel modal using PrimeNG.

### What Was Achieved
- Removed obsolete admin panels page component files:
  - `features/admin/panels/panels.component.ts`
  - `features/admin/panels/panels.component.html`
  - `features/admin/panels/panels.component.scss`
- Modernized `PanelFormComponent` popup UI with PrimeNG:
  - Replaced custom overlay markup with `p-dialog`.
  - Replaced native inputs/select with PrimeNG `pInputText`, `p-inputNumber`, and `p-select`.
  - Replaced custom buttons with PrimeNG `pButton`.
- Improved form behavior:
  - Added signal `effect` to reset/patch form whenever the selected panel changes (fixes stale edit values across modal opens).
  - Added explicit validation helper methods and `markAllAsTouched()` on invalid submit.
  - Kept the same `save`/`cancel` output contract so parent integration remains unchanged.

### Full Prompt
"Yes, but before, remove the admin panel component. Then modernize the modal"

### Affected Files
- `client/src/app/features/admin/panels/panels.component.ts` (deleted)
- `client/src/app/features/admin/panels/panels.component.html` (deleted)
- `client/src/app/features/admin/panels/panels.component.scss` (deleted)
- `client/src/app/features/admin/panels/panel-form.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- With unified panel routes already in place, the separate admin panels page became dead code and safe to remove.
- PrimeNG form/dialog components align this modal with the rest of the app UI and simplify consistent theming/accessibility behavior.

---

## 📅 March 9, 2026 - Unified Panels View with Role-Based CRUD Visibility

### Topic
Merged admin panel management into the standard panel listing screen and made create/edit/delete controls visible only for admin role/type users.

### Summary of Request
User requested unifying panel view and admin panel view into one screen and showing management actions (add/modify/delete) conditionally based on user role/type.

### What Was Achieved
- Unified management route to the user panel list view:
  - `/projects/management/panels` now loads `PanelListComponent`.
- Extended `PanelListComponent` with role-based behavior:
  - Added `isAdmin` computed signal from authenticated user role/JWT.
  - Added admin-only UI actions:
    - `Add Panel` button in header
    - `Add First Panel` in empty state
    - Per-panel `Edit` and `Delete` buttons
- Reused existing panel form modal for create/update from unified screen:
  - Integrated `PanelFormComponent` in `PanelListComponent`.
  - Added modal state/handlers for add/edit/save/delete flows.
- Preserved read-only browse experience for non-admin users.

### Full Prompt
"Ok, I think the next step is to unify the panel view and the admin panel view into one (the panel view). And then add the visibility of adding a panel/modifying panels/deleting panels, based on the user type/role"

"Ok. The second phase can include a modernization of the edit/create panel pop-up using primeng"

### Affected Files
- `client/src/app/app.routes.ts`
- `client/src/app/features/user/panel-list/panel-list.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Reusing one panel screen removes duplicated panel logic and keeps permissions centralized in role-derived UI state.
- Admin route protection is still maintained by `adminGuard` while visibility in shared UI is role-driven.

---

## 📅 March 9, 2026 - Unified Role-Driven Authenticated Layout (No `/admin` Endpoints)

### Topic
Merged admin and user navigation into a single authenticated layout (`UserLayoutComponent`) and moved admin screens under non-`/admin` routes with role-based dock visibility.

### Summary of Request
User requested using one layout for both user and admin, showing admin actions in the dock only for admin users, changing profile icon/label in admin mode, and activating admin mode based on user role/type.

### What Was Achieved
- Removed dedicated `/admin` route tree and `AdminLayoutComponent` usage.
- Added admin-managed routes under user routes:
  - `/projects/management`
  - `/projects/management/projects`
  - `/projects/management/users`
  - `/projects/management/panels`
- Kept `adminGuard` on management routes for role-based protection.
- Updated `UserLayoutComponent` to use role-driven UI:
  - Added `isAdmin` computed signal based on authenticated user role/JWT.
  - Added admin-only dock buttons that render only for admins.
  - Made profile entry dynamic in admin mode (`Admin Profile` + admin-style icon).
- Remapped admin feature links to new non-`/admin` paths.
- Removed obsolete file:
  - `client/src/app/layouts/admin-layout/admin-layout.component.ts`

### Full Prompt
"Can we unify the user and admin layouts in one so that we only use the user layout adding visibility to buttons in the dock only if you are admin? And for example, modify the profile icon when in admin mode. The admin mode must activate based on the user type"

"Ok, do it"

### Affected Files
- `client/src/app/app.routes.ts`
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `client/src/app/features/admin/admin-dashboard/admin-dashboard.component.html`
- `client/src/app/features/admin/users-list/users-list.component.ts`
- `client/src/app/layouts/admin-layout/admin-layout.component.ts` (deleted)
- `santi-agent-interactions.md`

### Reasoning Snapshot
- A single authenticated layout reduces navigation duplication and keeps role-based UX consistent.
- Guarded admin routes remain protected server-side and client-side while avoiding `'/admin'` endpoint debt.

---

## 📅 March 9, 2026 - Disable Editable Name Hover/Focus in View Mode

### Topic
Removed visual hover/focus underline feedback from the project name input while it is read-only in view mode.

### Summary of Request
User asked whether the effects could simply be disabled when read-only and then requested applying that change.

### What Was Achieved
- Added read-only specific CSS override for the project name input:
  - `.editable-name:read-only:hover, .editable-name:read-only:focus { border-bottom-color: transparent; }`
- Left editable/configure mode behavior untouched.

### Full Prompt
"Cant we just disable these when read-only?"

"apply"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- The template already toggles read-only with `[readonly]="isViewMode()"`, so targeting `:read-only` is the smallest and safest way to disable only view-mode effects.

---

## 📅 March 9, 2026 - Configure Mode Exit Button with Unsaved-Changes Confirmation

### Topic
Replaced configure-mode header navigation behavior by adding an `Exit Edit Mode` action in `step-nav-bar` and warning users about unsaved edits using PrimeNG ConfirmDialog.

### Summary of Request
User requested that in configure mode the `Back to Projects` button/link be removed, and a new `Exit Edit Mode` button be added in the step navigation bar alongside `Back`, with an alert if there are unsaved changes. User asked to use PrimeNG as much as possible.

### What Was Achieved
- Added a new `Exit Edit Mode` button next to `Back` inside `.step-nav-bar`.
- Added PrimeNG confirmation dialog flow before exiting when there are unsaved changes:
  - Uses `ConfirmationService` + `ConfirmDialogModule` + `<p-confirmDialog />`.
  - Shows warning dialog when `hasUnsavedChanges()` is true.
  - Navigates to the project view route on accept.
- Implemented `onExitEditMode()` in component logic.
- Removed the top "Back to Projects/Back to Project" link in configure mode by rendering it only in view mode.
- Updated step-nav styles to support the new left action group and responsive wrapping.

### Full Prompt
"Now, when in configure mode, remove the back to projects button and include a exit edit mode button that alerts you if you have unsaved changes. use primeng as much as possible for making the process easy. Add this button in the step-nav-bar div alongside with the back button."

"approve"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.html`
- `client/src/app/features/user/configure-project/configure-project.component.ts`
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Reusing PrimeNG's native confirmation API avoids custom modal logic and reduces maintenance risk.
- Keeping exit controls in `step-nav-bar` centralizes configure-mode actions in a single sticky control area.
- Conditional rendering of the back link by mode prevents redundant or conflicting navigation affordances in edit flow.

---

## 📅 March 9, 2026 - Responsive Configure Page Gutter + Step Nav Alignment

### Topic
Replaced fixed horizontal margins in `configure-project` with a shared responsive gutter and aligned step navigation controls to the same spacing system.

### Summary of Request
User wanted the configure-project view to use almost all available screen width while keeping an approximate 5rem edge spacing on large displays, but without a rigid solution that could generate tech debt. User also requested the same spacing behavior for the buttons inside `step-nav-bar`.

### What Was Achieved
- Introduced a single responsive spacing token on the component host:
  - `--configure-gutter: clamp(1rem, 4vw, 5rem);`
- Replaced fixed page margin (`margin: 0 5rem`) with fluid width + centered layout:
  - `width: min(100%, calc(100% - (var(--configure-gutter) * 2)))`
  - `margin-inline: auto`
- Applied the same gutter to the sticky navigation control row:
  - `.step-nav-bar { padding: 0.1rem var(--configure-gutter); }`
- Adjusted mobile breakpoint behavior to avoid spacing conflicts by resetting nav inline padding and preserving compact layout.

### Full Prompt
"I want the configure-project component to use almost all of the space in the screen available but leaving something like 5rem of margin. Help me set up in the best way that can adapt to different screens and cause less conflicts (so maybe adding 5rem of margin is not the solution). Apply the same config to the buttons in the step-nav-bar div"

"If this is a good practice for what i want, then yes, I dont want solutions that will generate me tech debt"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- A shared `clamp()` gutter centralizes horizontal spacing logic and scales across viewport sizes without relying on brittle fixed margins.
- Using one spacing token for both page content and top step navigation keeps visual alignment consistent and reduces future style drift.

---

## 📅 March 9, 2026 - Full-Width Sticky Configure Header

### Topic
Made the configure-mode sticky header break out of parent container constraints to span the full available width.

### Summary of Request
User wanted `.configure-sticky-header` to bypass the `max-width` and padding of both `.configure-page` and `.user-content`, sitting flush at the top of the viewport when scrolling.

### What Was Achieved
- Moved `.configure-sticky-header` outside `<section class="configure-page">` in the template so it's no longer constrained by max-width or inner padding.
- Applied negative margins (`-1.5rem` matching `.user-content` padding) to make the header extend edge-to-edge within the content area.
- Added `:host { display: block; }` to ensure the component host participates correctly in block layout for negative margins.
- Used bottom-only border-radius (`0 0 1rem 1rem`) and removed top border for a flush top-edge look.
- Adjusted the responsive `768px` breakpoint to match `.user-content`'s reduced padding (`1rem`) at that size.
- Verified diagnostics on edited files: no errors.

### Full Prompt
"I have modified the file myself. Basically the thing is I want the configure-sticky-header to use the whole available width and bypass the overall restriction of the configure-page div and the user-content div because I want the configure-sticky-header to be right at the vertical beginning of the page. How can we do that?"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.html`
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Moving the sticky header outside `.configure-page` avoids fighting `max-width: 80rem` and `margin: 0 auto`.
- Negative margins (`-1.5rem`) cancel out the `.user-content` padding, making the header span the full content column.
- `:host { display: block }` ensures the component host behaves as a block container so negative margins on children work correctly.

---

## 📅 March 9, 2026 - Sticky Configure Header + Stepper Placement

### Topic
Moved configure-mode navigation controls and step indicator into a sticky top header, with the stepper row immediately below it.

### Summary of Request
User requested that, in configure mode, `Back`/`Next` buttons and current-step indicator appear at the top like a header, with the stepper right below, and that this section remains visible while vertically scrolling.

### What Was Achieved
- Reworked configure-mode template structure:
  - Added a single sticky wrapper (`.configure-sticky-header`) containing:
    - Top navigation row (`Back`, step indicator, `Next`/`Save`).
    - Stepper row directly below using step buttons.
- Kept step panels in normal document flow while binding step changes to the same `activeStep` signal.
- Updated styles for sticky behavior and responsive layout of the new two-row header.
- Verified diagnostics on edited files: no errors.

### Full Prompt
"I want to modify in this component the location of the stepper and the back and next buttons when the configure mode is on. I want the back and next buttons, and the indicator of the current step to be on the top of the screen, like a header, and right below it the stepper. I want the header to move with the screen if there is vertical scroll"

"approve. There is no header on this user layout, so the first con wont appear"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.html`
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Grouping navigation and step controls in one sticky container ensures both remain visible during scrolling and matches the requested header-first layout.

---

## 📅 March 11, 2026 - Auto-Detected Location Flow + Current-Location Search Icon

### Topic
Improved the Add Project `Location & Area` step so the flow accepts browser auto-detected location (without requiring typed search), and added a current-location icon action inside the search field.

### Summary of Request
User requested that step progression should not require manually typing in the search bar if location is auto-detected, and asked to add a trailing Material Symbols icon (`location_searching`) inside the search input to set map center to current location. User also requested a visual style effect on the Search button when the search input is non-empty.

### What Was Achieved
- Extended `LocationMapComponent` with a new output event (`userLocationFound`) emitted from successful geolocation.
- Wired `AddProjectComponent` to consume map geolocation events and treat them as a valid selected location.
- Added `useCurrentLocation()` action in Add Project for explicit current-location selection from the input-end icon.
- Added reverse geocoding fallback flow so auto/manual current location resolves to readable address text when possible.
- Updated step validation for `Location & Area` to use resolved location data (`hasValidLocation`) instead of requiring typed search query.
- Added trailing icon button in the search input using Material Symbols:
  - `<span class="material-symbols-outlined">location_searching</span>`
- Added active visual state on Search button when input contains text (`search-action-btn-active`).
- Build verification completed successfully (no compile errors after changes).

### Full Prompt
"The location and area can step dont let me go to the next step if I dont put a location in the search bar. It should auto detect the location and use that as location as if it was the search bar location. Also I want to add an icon inside the search bar (end of the search bar) to set the map to the current location. Use this icon map: <span class=\"material-symbols-outlined\">location_searching</span>"

"Also, add a styling effect to the search button when something is added to the search bar (when not empty)"

### Affected Files
- `client/src/app/shared/components/location-map/location-map.component.ts`
- `client/src/app/features/user/add-project/add-project.component.ts`
- `client/src/app/features/user/add-project/add-project.component.html`
- `client/src/app/features/user/add-project/add-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Emitting geolocation from the shared map component keeps location acquisition reusable and avoids duplicate map-state assumptions.
- Validating on resolved location data (not input text) matches real UX intent: any reliably selected location should unlock step progression.
- A trailing location target icon in the search input keeps the geolocation affordance discoverable and contextually close to manual search.

---

## 📅 March 9, 2026 - Panel & Installation Card Structure Alignment

### Topic
Aligned `Panel & Installation` card structure with the other cards by replacing PrimeNG `p-card` with a single `div.step-card` wrapper.

### Summary of Request
User asked to match the card to the rest of the layout, avoiding `p-card` and using one main `div` container before its internal elements.

### What Was Achieved
- Replaced the container of `Panel & Installation`:
  - From: `<p-card class="step-card panel-installation-card"> ... </p-card>`
  - To: `<div class="step-card panel-installation-card"> ... </div>`
- Kept all inner content unchanged (`header`, `divider`, `form`).
- Verified HTML diagnostics: no errors.

### Full Prompt
"Great, now for some reason the Panel & Installation card has a different configuration than the other cards. Can you match it to how the other cards are designed? Not using the p-card and using only one div before indicating the elements held inside the card?"

"aplicalo"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.html`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Using the same structural pattern as the sibling cards improves visual consistency and avoids component-specific internal behavior.

---

## 📅 March 9, 2026 - Panel Name Info Icon

### Topic
Added an informational icon to the left of the selected panel name in the panel details header.

### Summary of Request
User requested adding PrimeIcons `pi-info-circle` to the left of `selectedPanelName()`.

### What Was Achieved
- Updated panel details header markup to include `pi pi-info-circle` before the panel name.
- Added minimal styles for proper icon-text alignment and spacing.
- Verified diagnostics on modified HTML/SCSS: no errors.

### Full Prompt
"On the left of the selectedPanelName I want to add this icon: pi-info-circle from primeng icons"

"aplicalo"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.html`
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- An inline-flex title wrapper keeps the icon aligned with the panel name and does not affect the subtitle layout below.

---

## 📅 March 9, 2026 - Wrapper Fix for Panel Info Card Sizing

### Topic
Replaced the nested PrimeNG card with a local wrapper to prevent width shrinkage after removing deep styling.

### Summary of Request
User reported the previous fix did not work and suggested adding a wrapper for the element that had relied on `ng-deep`.

### What Was Achieved
- Replaced nested `p-card` in panel details section with a plain wrapper `<div class="panel-info-card">`.
- Preserved existing content structure and styling intent (title, subtitle, tags).
- Reinforced wrapper sizing rules in SCSS:
  - `.panel-info-card { display: block; width: 100%; }`
  - `.panel-info-surface { width: 100%; display: block; box-sizing: border-box; }`
- Verified diagnostics on modified HTML/SCSS: no errors.

### Full Prompt
"Eso no está funcionando, quizás necesitamos hacer un wrapper para el elemento para el que antes usabamos ng-deep"

"ok"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.html`
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- A local wrapper removes dependence on PrimeNG internal structure, making width and spacing deterministic without `ng-deep`.

---

## 📅 March 9, 2026 - Panel Info Card Visual Polish (No ng-deep)

### Topic
Refined the panel detail card and tags visual style in the unified project screen and removed `ng-deep` usage from the component stylesheet.

### Summary of Request
User requested better styling for the new panel card/tags, required no `ng-deep`, asked to replace generic title with panel name, show `technology - dimensions` as paragraph, use value-only labels with `aria-label`, add PrimeNG icons/colors, and use a lighter gray card background with no shadow.

### What Was Achieved
- Updated panel detail card content:
  - Title now uses selected panel name.
  - Subtitle now uses `technology - dimensions`.
- Updated tags:
  - Value-only rendering (no label prefix text).
  - Added `aria-label` and tooltip with each label.
  - Added PrimeIcons and PrimeNG severities for colored chips.
- Updated card visuals:
  - Lighter gray surface (`var(--p-surface-100)`).
  - No box shadow.
- Removed all `ng-deep` selectors from `configure-project.component.scss`.
- Verified diagnostics on edited files: no errors.

### Full Prompt
"Ok, but lets add a bit of style to that card and the labels, they look awful. And DO NOT use ng-deep!!!

Instead of adding the Selected Panel Details title, directly use then name of the panel. Then add the technology and dimensions as a paragraph: technology - dimensions

For the labels, do not include their name, use the values directly and use aria-label for showing their name when hovering. Also add primeng icons to them and give them some colors based always based on what is defined with primeng. For the background of the card, use a ligher gray and remove the box-shadow"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts`
- `client/src/app/features/user/configure-project/configure-project.component.html`
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Kept the card as PrimeNG-based while moving visual control to a local surface wrapper to avoid deep selectors.
- Used PrimeNG `severity` + PrimeIcons to provide visual differentiation without custom token violations.

---

## 📅 March 9, 2026 - Unified Project View/Configure Mode

### Topic
Unified `view-project` and `configure-project` into a single route-driven component with `view` and `configure` modes.

### Summary of Request
User requested reusing the configure view for project viewing, hiding stepper/navigation in view mode, adding a panel detail sub-card using PrimeNG tags, and adding total project area in Live Capacity Preview for both modes.

### What Was Achieved
- Routed both `/projects/:id` and `/projects/:id/configure` to `ConfigureProjectComponent`.
- Added dual mode behavior inside `ConfigureProjectComponent`:
  - `configure` mode: full stepper + sticky step navigation + save flow.
  - `view` mode: no stepper header/navigation and read-only inputs.
- Updated header behavior by mode:
  - View mode shows `Back to Projects` and a `Configure` action button.
  - Configure mode preserves unsaved/saved status tag.
- Converted the Panel & Installation container to a PrimeNG `p-card`.
- Added nested panel information card under selected panel, using `p-tag` for:
  - Name, dimensions, efficiency, peak, technology, bifacial.
- Added `Project Total Area` to Live Capacity Preview for both modes.
- Verified diagnostics on changed files: no errors.

### Full Prompt
"I want to reuse the view I have created in the configure-project component for the view-project component. Basically I want it to look pretty much like the configure-project component but with a few tweaks:
1. The stepper and the navigation header (back and next and current step) wont show
2. For the panel and installation card (use primeng cards), we could add inside it a card just below the solar panel chosen that shows information about the panel like:
+ Name, dimensions, efficiency, peak, technology, if its bifacial. For these use primeng tags: p-tag.
3. In the live capacity preview add the total area of the project.

The thing is what I want to do is to unify the view-project component and the configure-component into one and add a configure mode and a view mode. When configure mode is toggled, the things I told you about on indication 1 will show. Therefore, what I told you on indications 2 and 3 should be part of both views.

Is this possible to do?"

"Ok, lets do it"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts`
- `client/src/app/features/user/configure-project/configure-project.component.html`
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `client/src/app/app.routes.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- A route-driven mode avoids duplicating two nearly identical UIs and keeps future maintenance in one place.
- Conditional rendering around stepper/nav satisfies view-mode requirements while preserving configure workflow.
- Derived signals were added for panel tag data and project area to keep template logic simple.

---

## 📅 March 8, 2026 - Dock Style Reuse (Brand + Toggle)

### Topic
Applied the same collapsed-state alignment config to the dock toggle and refactored to avoid repeating style code.

### Summary of Request
User asked to apply the same config used for `.dock-brand` to `.dock-toggle` and requested reusing settings rather than duplicating declarations.

### What Was Achieved
- In collapsed state (`.user-dock:not(.expanded)`), merged selectors into one shared rule:
  - `.dock-brand, .dock-toggle { justify-content: center; gap: 0; }`
- Kept behavior unchanged for expanded mode.
- Verified diagnostics on edited file: no errors.

### Full Prompt
"I want to apply the same config to the .dock-toggle class"

"approve. Can we reutilize the dock brand settings, like not repeting the code?"

### Affected Files
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Grouped selectors provide consistent behavior and eliminate style duplication while preserving scoped collapsed-only behavior.

---

## 📅 March 8, 2026 - Dock Brand Centering (Collapsed State)

### Topic
Centered the dock brand icon when the left dock is collapsed.

### Summary of Request
User reported the brand anchor looked left-pushed due to spacing/padding behavior and requested the icon to be centered.

### What Was Achieved
- Added collapsed-only style override for `.dock-brand`:
  - `justify-content: center`
  - `gap: 0`
- Preserved expanded-mode behavior (icon + label layout).
- Verified edited file diagnostics: no errors.

### Full Prompt
"The dock brand has something weird inside the anchor element, it has some kind of padding or gap on the right. I want it to be in the middle, not pushed to the left"

"approve"

### Affected Files
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- In collapsed mode, the brand text is hidden and the anchor still spans the dock width, so centering and removing the gap aligns the icon visually with the dock's icon-only design.

---

## 📅 March 8, 2026 - Dock Icon Spacing Fix (Collapsed Mode)

### Topic
Removed the extra right-side space around dock icons in collapsed mode while preserving expanded-mode alignment.

### Summary of Request
User observed remaining right-side space for dock icons and requested removing it.

### What Was Achieved
- Added collapsed-only style overrides in user layout dock:
  - `gap: 0` for `.dock-item`
  - `justify-content: center` for icon-only alignment
  - `min-width: 0` on icon element in collapsed mode
- Kept expanded mode spacing intact for icon + label readability.
- Verified edited file diagnostics: no errors.

### Full Prompt
"All of the icons in the dock have a remaining space in right. Can you remove that space? Did you add it for a specific reason?"

"approve"

### Affected Files
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- The original gap/min-width values were useful for expanded mode text alignment; scoped collapsed-only overrides remove unwanted icon spacing without regressing expanded layout.

---

## 📅 March 8, 2026 - Dock Toggle Alignment Polish

### Topic
Polished the dock toggle button alignment and visual style in the user layout.

### Summary of Request
User requested making the dock toggle button pinned to the left like the rest of dock actions and removing its border.

### What Was Achieved
- Updated `.dock-toggle` alignment from centered to left-aligned (`align-self: flex-start`).
- Removed the toggle border (`border: 0`) for a cleaner appearance.
- Verified edited layout file diagnostics: no errors.

### Full Prompt
"Good first iteration. Now I want to make the toggle menu button to be pined to the left like the rest of the buttons in the dock. Also, remove the border in that button"

"approved"

### Affected Files
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- Left alignment improves consistency with dock item alignment and visual rhythm.
- Border removal reduces visual noise and better matches the minimal dock style direction.

---

## 📅 March 8, 2026 - User Layout Vertical Dock Navigation

### Topic
Replaced the user top navigation with a left vertical dock inspired by PrimeNG and Canva, including a collapsible icon-only/expanded mode.

### Summary of Request
User requested a left-side vertical dock/menu for the user layout with simple icons, hover labels, optional expansion to icon + text, and inclusion of existing tabs (`dashboard`, `create project`, `project list`, `panels`, `settings`, and `profile`). User also requested that new components be created as single `.ts` files containing template and styles.

### What Was Achieved
- Rebuilt `user-layout` as a left vertical, collapsible dock:
  - Collapsed mode: icon-only navigation with tooltips.
  - Expanded mode: icon + label entries.
  - Active route highlighting and bottom profile/logout actions.
- Kept/added dock tabs:
  - Dashboard (`/projects`)
  - Create Project (`/projects/add`)
  - Project List (`/projects/all`)
  - Panels (`/panels/all`)
  - Settings (`/projects/settings`)
  - Profile (`/projects/profile`)
- Added new routed user pages as **single-file components** (`.ts` only with inline template/styles):
  - `settings.component.ts`
  - `profile.component.ts`
- Updated user child routes to include `settings` and `profile`.
- Ran frontend typecheck successfully after changes.

### Full Prompt
"I want to modify the user layout so that it uses a vertical dock on the left (either a dock or a menu but what i want is the simplicity of the dock icons - hover on the icon to see the name of the tab. It could be nice if the dock/menu could be expandable to show the icon + name.). And include in that dock the tabs I currently have (dashboard, create project, project list, panels, settings, and then a user profile or something)

https://primeng.org/dock
https://primeng.org/
https://www.canva.com/

I get the inspo from the primeng landing site example and from the canva vertical menu/dock (which is expandable)"

"For the new components, create only one file (the ts file) and include everything there"

### Affected Files
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `client/src/app/app.routes.ts`
- `client/src/app/features/user/settings/settings.component.ts`
- `client/src/app/features/user/profile/profile.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- A custom dock-style sidebar provided better control for collapsible behavior and Canva-like interaction than a default top menubar.
- PrimeNG tooltip integration preserves icon-only simplicity while keeping labels discoverable.
- New pages were implemented as single-file standalone components to match the explicit user constraint.

---

## 📅 March 8, 2026 - px to rem Migration (Final Layout + Visitor Sweep)

### Topic
Completed an additional sweep for layout shells and remaining visitor pages to align sizing units with the global scale strategy.

### Summary of Request
User approved continuing with the final suggested batch including layouts and visitor screens.

### What Was Achieved
- Converted dimensional `px` values to `rem` in:
  - `layouts/admin-layout.component.ts`
  - `layouts/user-layout.component.ts`
  - `layouts/visitor-layout.component.ts`
  - `visitor/landing-page.component.ts`
  - `visitor/forgot-password.component.ts`
  - `visitor/reset-password.component.ts`
- Converted where appropriate:
  - shadows and inset shadows
  - border-radius values
  - hero/visual block width and height values
  - max-width and grid min widths
  - text-shadow numeric dimensions
- Intentionally preserved `px` values for:
  - media-query breakpoints
  - border stroke widths/hairlines
  - letter-spacing micro-typography
- Diagnostics checked on all edited files: no errors.

### Full Prompt
"Yeah, do it"

### Affected Files
- `client/src/app/layouts/admin-layout/admin-layout.component.ts`
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `client/src/app/layouts/visitor-layout/visitor-layout.component.ts`
- `client/src/app/features/visitor/landing-page/landing-page.component.ts`
- `client/src/app/features/visitor/forgot-password/forgot-password.component.ts`
- `client/src/app/features/visitor/reset-password/reset-password.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- This pass targets shared shells and auth/landing surfaces where sizing consistency has high visible impact.
- Breakpoints and border strokes were kept fixed in pixels to avoid responsive threshold drift and maintain crisp edges.

---

## 📅 March 8, 2026 - px to rem Migration (Continuation Batch)

### Topic
Continued converting hardcoded dimensional `px` values to `rem` across additional user/admin/visitor screens.

### Summary of Request
User approved continuing the migration pass after the previous high-impact batch.

### What Was Achieved
- Converted dimensional `px` values to `rem` in the following files:
  - `user/dashboard.component.scss`
  - `user/panel-list.component.ts` (inline styles)
  - `admin/admin-dashboard.component.scss`
  - `admin/panels.component.scss`
  - `visitor/login.component.ts` (inline styles)
  - `visitor/register.component.ts` (inline styles)
- Included conversion of:
  - `minmax(...px, ...)` grid minimums
  - icon/card width and height values
  - border radius values
  - transform offsets
  - auth card max widths
- Intentionally preserved `px` values for:
  - media-query breakpoints
  - thin border strokes/hairlines
  - letter-spacing fine-tuning
- Ran diagnostics for all modified files: no errors.

### Full Prompt
"approved"

### Affected Files
- `client/src/app/features/user/dashboard/dashboard.component.scss`
- `client/src/app/features/user/panel-list/panel-list.component.ts`
- `client/src/app/features/admin/admin-dashboard/admin-dashboard.component.scss`
- `client/src/app/features/admin/panels/panels.component.scss`
- `client/src/app/features/visitor/login/login.component.ts`
- `client/src/app/features/visitor/register/register.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- This continuation keeps the unit system consistent with the global font-scale strategy while avoiding risky responsive shifts.
- Border and breakpoint `px` values were kept intentionally to preserve crisp rendering and stable layout thresholds.

---

## 📅 March 8, 2026 - px to rem Migration (High-Impact User Screens)

### Topic
Executed a focused migration from hardcoded `px` sizing values to `rem` units in key user-facing screens.

### Summary of Request
User approved proceeding with the next pass after global scaling, specifically to start converting hardcoded `px` sizing to `rem` units.

### What Was Achieved
- Converted dimensional `px` values to `rem` across 4 high-impact files:
  - `configure-project.component.scss`
  - `add-project.component.scss`
  - `view-project.component.ts` (inline styles)
  - `user-projects.component.ts` (inline styles)
- Updated major layout and UI dimensions including:
  - max/min widths and heights
  - card/map/placeholder sizes
  - border-radius values
  - transform offsets
  - shadow and blur dimensions
- Intentionally kept these in `px` for stability and predictable behavior:
  - media query breakpoints
  - thin border widths (`1px`, `2px`, `3px`)
  - separator hairlines
- Ran diagnostics on all edited files: no errors.

### Full Prompt
"Yeah, lets do it"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.scss`
- `client/src/app/features/user/add-project/add-project.component.scss`
- `client/src/app/features/user/view-project/view-project.component.ts`
- `client/src/app/features/user/user-projects/user-projects.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- This pass targeted the highest-impact user flows first to quickly improve consistency with the new root scaling strategy.
- Breakpoints and thin borders were preserved in `px` to avoid unintended responsive and visual regressions.

---

## 📅 March 8, 2026 - Global UI Scale Calibration (100% Zoom)

### Topic
Implemented an app-wide density adjustment so screens render at a comfortable size on browser zoom 100%.

### Summary of Request
User reported that UI elements looked too large at 100% zoom and requested a global fix equivalent to their current 80% zoom workaround.

### What Was Achieved
- Added a global root scale variable in `client/src/styles.scss`:
  - `--app-font-scale: 0.85` (desktop baseline)
- Applied scale through root font-size:
  - `html { font-size: calc(16px * var(--app-font-scale)); }`
- Added responsive safeguards to preserve readability on smaller screens:
  - `0.9` for widths `<= 1024px`
  - `0.95` for widths `<= 640px`
- Ran a scan for hardcoded `px` values in `client/src/app/**` to prepare next incremental conversion pass to `rem` where appropriate.

### Full Prompt
"Implement it. If there are hardcoded elements that use px as sizing, we will figure it out and adjust it to rem units"

### Affected Files
- `client/src/styles.scss`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- A root font-size scale is the lowest-risk global approach because the codebase already uses many `rem`-based sizes and PrimeNG tokenized spacing.
- Responsive overrides avoid over-shrinking text and touch targets on mobile devices.

---

## 📅 March 7, 2026 - Final Sweep (Feature Styles Token Hardening)

### Topic
Executed the final style sweep across feature components to remove remaining hardcoded hex/rgba values and fallback literals where practical.

### Summary of Request
User confirmed this would be the final sweep after the `configure-project` cleanup.

### What Was Achieved
- Replaced leftover hardcoded/fallback color values in feature components with PrimeNG Aura token values.
- Removed fallback literals from token declarations where safe:
  - `var(--p-primary-contrast-color, #fff)` → `var(--p-primary-contrast-color)`
  - `var(--p-shadow-*, <rgba fallback>)` → `var(--p-shadow-*)`
- Converted remaining white/black/rgba visual accents to token-safe equivalents using `color-mix(...)` where needed.
- Kept all `::ng-deep` usage scoped as `:host ::ng-deep` and unchanged in behavior.
- Confirmed no deprecated bridge token usage remained in `client/src/app/features/**`.

### Full Prompt
"OK. That will be the final sweep"

### Affected Files
- `client/src/app/features/visitor/login/login.component.ts`
- `client/src/app/features/visitor/register/register.component.ts`
- `client/src/app/features/visitor/landing-page/landing-page.component.ts`
- `client/src/app/features/user/add-project/add-project.component.scss`
- `client/src/app/features/visitor/forgot-password/forgot-password.component.ts`
- `client/src/app/features/visitor/reset-password/reset-password.component.ts`
- `client/src/app/features/admin/panels/panel-form.component.ts`
- `client/src/app/features/user/user-projects/user-projects.component.ts`
- `client/src/app/features/user/view-project/view-project.component.ts`

### Reasoning Snapshot
- The remaining issues were isolated cosmetic leftovers, so a small, direct sweep minimized risk while completing token consistency.
- Changes were limited to style declarations only to avoid business logic or template behavior impact.

---

## 📅 March 7, 2026 - Configure Project Token Cleanup (Sectioned Pass)

### Topic
Completed a section-by-section style cleanup for the high-impact `configure-project` feature component to align with PrimeNG Aura tokens.

### Summary of Request
User requested continuing the refactor on `feature/frontend-modernization` by targeting `client/src/app/features/user/configure-project/configure-project.component.ts` in safe chunks, avoiding logic/layout changes, and preferring `--p-*` tokens over bridge/hardcoded colors.

### What Was Achieved
- **Section A: Header + Step Nav + Step Indicators**
  - Replaced hardcoded header/nav/indicator colors with tokenized values (`--p-text-*`, `--p-primary-*`, `--p-content-border-color`).
  - Updated sticky nav translucent background/shadow using token-aware `color-mix(...)`.

- **Section B: Card Shells + Metadata-Adjacent Surfaces**
  - Migrated card backgrounds, borders, and shadows to token-based surfaces/borders.
  - Updated card heading/subtext and map container border to token equivalents.

- **Section C: Status Badges/Messages**
  - Migrated error, hint, map instruction/status, no-panel message, and optimal-config hint styles to semantic tokens (`--p-red-*`, `--p-green-*`, `--p-amber-*`, `--p-primary-*`).
  - Replaced hardcoded warning/success/info backgrounds with tokenized `color-mix(...)` variants.

- **Section D: Review/Summary + Capacity Highlights**
  - Refactored remaining review block colors/borders and total-capacity highlight styles to token-based gradients and text colors.
  - Migrated icon gradient palettes (panel/location/3D/capacity/general) from hardcoded values to semantic token gradients.

- **Validation**
  - Diagnostics run after each section: no TS/template/style errors in the edited file.
  - Target-file sweep confirms no remaining `#hex`, `rgba(...)`, or deprecated bridge tokens in `configure-project.component.ts`.

### Full Prompt
"You are continuing a style refactor in `solarPlanner-v2` on branch `feature/frontend-modernization`... Start with: `client/src/app/features/user/configure-project/configure-project.component.ts` and do one section at a time with small, verifiable patches."

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts`
- `santi-agent-interactions.md`

### Reasoning Snapshot
- The component is large and high-risk for visual regressions, so changes were intentionally split into small, independently validated style-only patches.
- Token-first replacements improve Aura theme consistency (light/dark) and reduce maintenance overhead from mixed palette sources.

---

## 📅 March 7, 2026 - Sweep Pass (Forgot/Reset/Admin Utility Views)

### Topic
Executed an additional sweep pass to modernize remaining low-complexity components with hardcoded color values.

### Summary of Request
User approved running the final sweep to clean leftover hardcoded colors and token inconsistencies.

### What Was Achieved
- **Forgot Password (`forgot-password.component.ts`)**
  - Replaced hardcoded colors with PrimeNG tokens (`--p-text-*`, `--p-content-border-color`, `--p-primary-*`, `--p-red-*`, `--p-green-*`).
  - Updated alert states and primary button colors to token-driven values.

- **Reset Password (`reset-password.component.ts`)**
  - Applied the same token migration pattern as forgot-password.
  - Replaced direct red/blue state colors with `--p-red-*` and `--p-primary-*` tokens.

- **Admin Projects List (`projects-list.component.ts`)**
  - Replaced placeholder hardcoded colors with `--p-surface-0` and `--p-text-muted-color`.

- **Admin Panel Form (`panel-form.component.ts`)**
  - Migrated modal, inputs, errors, and action button palette from hardcoded values to PrimeNG tokens.
  - Overlay and shadows updated to token-aware styles with safe fallbacks.

- Diagnostics run across all edited files: **no errors found**.

### Full Prompt
"Yeah, lets do that"

### Affected Files
- `client/src/app/features/visitor/forgot-password/forgot-password.component.ts`
- `client/src/app/features/visitor/reset-password/reset-password.component.ts`
- `client/src/app/features/admin/projects-list/projects-list.component.ts`
- `client/src/app/features/admin/panels/panel-form.component.ts`

### Reasoning Snapshot
- This pass prioritized smaller, isolated components for low-risk improvements and immediate token consistency.
- The large `configure-project.component.ts` still contains numerous intentional, branded hardcoded values and should be handled in a dedicated, carefully segmented pass to avoid visual regressions.

---

## 📅 March 7, 2026 - Medium Priority Cleanup (User + Admin Views)

### Topic
Continued component style refactor for medium-priority files with Aura token alignment and inline-style removal.

### Summary of Request
User asked to continue cleanup after high-priority components were completed.

### What Was Achieved
- **Users List (`users-list.component.ts`)**
  - Removed inline icon styles and replaced with semantic classes (`icon-danger`, `icon-success`, `hero-icon`).
  - Migrated deprecated bridge tokens:
    - `--text-color-secondary` → `--p-text-muted-color`
    - `--surface-hover` → `--p-content-hover-background`
    - `--red-500` usage replaced by `--p-red-500` class styling.
  - Reduced deep selectors to PrimeNG internal card body padding only.

- **User Projects (`user-projects.component.ts`)**
  - Migrated hardcoded color palette to PrimeNG tokens (`--p-text-color`, `--p-text-muted-color`, `--p-content-border-color`, `--p-primary-*`, `--p-yellow-*`).
  - Replaced static RGBA/hex status and card backgrounds with token-driven `color-mix(...)` gradients and surfaces.
  - Removed redundant `::ng-deep .btn-primary` hover override.

- **View Project (`view-project.component.ts`)**
  - Migrated hardcoded colors and gradients to PrimeNG token-based colors.
  - Converted error and placeholder visuals to token-aware `color-mix(...)` backgrounds.
  - Removed redundant `::ng-deep .btn-primary` hover override.

- **Add Project (`add-project.component.scss`)**
  - Performed focused token migration across key surfaces and semantic text states:
    - hardcoded surface/text/border colors → `--p-surface-*`, `--p-text-*`, `--p-content-border-color`, `--p-primary-*`.
  - Updated warning/info/success badges and map feedback blocks to token-based `color-mix(...)` backgrounds.
  - Replaced focus ring/hover accents with theme token equivalents (`--focus-ring`, Prime shadows).

- **Configure Project (`configure-project.component.ts`)**
  - Verified by search that deprecated bridge tokens and hardcoded inline color styles targeted by this cleanup were not present, so no changes were needed in this pass.

- Validation: diagnostics run on all modified files with **no errors found**.

### Full Prompt
"Ok, continue"

### Affected Files
- `client/src/app/features/admin/users-list/users-list.component.ts`
- `client/src/app/features/user/user-projects/user-projects.component.ts`
- `client/src/app/features/user/view-project/view-project.component.ts`
- `client/src/app/features/user/add-project/add-project.component.scss`

### Reasoning Snapshot
- This batch prioritized replacing hardcoded and bridge-token color usage in medium-priority views while preserving component behavior and markup structure.
- `configure-project` was intentionally left untouched after verification to avoid unnecessary churn in a large, already-modernized file.

---

## 📅 March 7, 2026 - Panel Views Cleanup (User + Admin)

### Topic
Continued Aura token migration and style cleanup for panel-related views (`panel-list`, admin `panels`, and `admin-dashboard`).

### Summary of Request
User requested to continue with the prioritized component cleanup sequence.

### What Was Achieved
- **User Panel List (`panel-list.component.ts`)**
  - Removed inline icon styles and replaced with semantic classes.
  - Migrated bridge token usage to PrimeNG tokens:
    - `--text-color-secondary` / `--text-color-muted` → `--p-text-muted-color`
    - `--surface-hover` → `--p-content-hover-background`
  - Replaced hardcoded RGBA yellow accent with token-derived `color-mix(...)`.
  - Reduced `::ng-deep` to PrimeNG internals for card body padding only.

- **Admin Panels (`panels.component.html`, `panels.component.scss`)**
  - Removed inline icon styles from template (`Manage Panels` header, empty-state, panel icon).
  - Applied same token migration pattern as user panel list.
  - Replaced RGBA backgrounds with token-derived `color-mix(...)`.
  - Reduced deep selectors to required PrimeNG internals (`.p-button` width in action buttons, empty-state `.p-card-body` padding).

- **Admin Dashboard (`admin-dashboard.component.html`, `admin-dashboard.component.scss`)**
  - Removed inline icon/background styles and introduced semantic classes (`icon-primary`, `icon-solar`, `icon-danger`, `stat-icon-*`).
  - Migrated bridge tokens:
    - `--text-color-secondary` → `--p-text-muted-color`
    - `--red-500` usage replaced with `--p-red-500` in styling classes
  - Replaced hardcoded RGBA backgrounds with token-driven `color-mix(...)`.
  - Reduced and scoped `::ng-deep` to PrimeNG internals (`.p-card-body`, `.p-card-content`).

- Verified all touched files with diagnostics: **no errors found**.

### Full Prompt
"Continue"

### Affected Files
- `client/src/app/features/user/panel-list/panel-list.component.ts`
- `client/src/app/features/admin/panels/panels.component.html`
- `client/src/app/features/admin/panels/panels.component.scss`
- `client/src/app/features/admin/admin-dashboard/admin-dashboard.component.html`
- `client/src/app/features/admin/admin-dashboard/admin-dashboard.component.scss`

### Reasoning Snapshot
- Both user/admin panel views shared repeated anti-patterns (inline styles, bridge tokens, broad deep selectors), so applying a single consistent token-first pattern reduced maintenance overhead.
- Deep selectors were retained only where PrimeNG internal DOM required targeted overrides.

---

## 📅 March 7, 2026 - Panel List Style Cleanup (Aura Token Alignment)

### Topic
Refactored panel list component styling to remove inline styles, migrate to PrimeNG tokens, and reduce `::ng-deep` to required internals only.

### Summary of Request
User asked to continue the style cleanup sequence after dashboard updates.

### What Was Achieved
- Removed inline icon styles from template and replaced with semantic classes (`icon-primary`, `empty-icon`, `panel-bolt-icon`).
- Migrated bridge token usage to PrimeNG Aura tokens:
  - `--text-color-secondary` / `--text-color-muted` → `--p-text-muted-color`
  - `--surface-hover` → `--p-content-hover-background`
- Replaced hardcoded yellow RGBA panel icon background with token-driven blend using `color-mix(...)`.
- Moved most styles out of deep selectors; kept `:host ::ng-deep` only for PrimeNG internal card body padding.
- Preserved templates, behavior, and business logic.

### Full Prompt
"Continue"

### Affected Files
- `client/src/app/features/user/panel-list/panel-list.component.ts`

### Reasoning Snapshot
- Token-first styling ensures consistency with Aura light/dark theming.
- Inline style removal improves maintainability and keeps templates cleaner.
- Deep selectors are minimized to only required PrimeNG internals, reducing style leakage.

---

## 📅 March 7, 2026 - Dashboard Style Cleanup (Aura Token Alignment)

### Topic
Refactored dashboard page styles to remove inline template styles, migrate to PrimeNG tokens, and reduce `::ng-deep` usage to PrimeNG internals only.

### Summary of Request
User requested to continue the component cleanup sequence after landing page updates.

### What Was Achieved
- Removed inline icon/background styles from `dashboard.component.html` and replaced them with semantic classes (`icon-primary`, `icon-solar`, `icon-blue`, `stat-icon-*`).
- Migrated bridge tokens to PrimeNG native tokens in `dashboard.component.scss`:
  - `--text-color-secondary` / `--text-color-muted` → `--p-text-muted-color`
  - `--surface-border` → `--p-content-border-color`
- Replaced hardcoded RGBA backgrounds with token-derived `color-mix(...)` values for better theme compatibility.
- Removed custom deep hover override for `.btn-solar` that used hardcoded green values.
- Reduced deep selectors to only required PrimeNG internals (`.p-card-body`) scoped under `:host ::ng-deep`.
- Preserved structure, behavior, and component logic.

### Full Prompt
"Continue"

### Affected Files
- `client/src/app/features/user/dashboard/dashboard.component.html`
- `client/src/app/features/user/dashboard/dashboard.component.scss`

### Reasoning Snapshot
- Inline template styles were centralised into SCSS classes to improve maintainability and consistency.
- PrimeNG Aura token equivalents were preferred over bridge aliases to align with the new styling baseline.
- `::ng-deep` remained only where PrimeNG internal structure requires it, minimizing style leakage.

---

## 📅 March 7, 2026 - Landing Page Style Cleanup (Aura Token Alignment)

### Topic
Refactored landing page component styles to remove inline styles, reduce `::ng-deep`, and use PrimeNG Aura tokens consistently.

### Summary of Request
User approved continuing the component cleanup sequence after typography updates, with the next target being `landing-page.component.ts`.

### What Was Achieved
- Removed all inline icon styles from template and replaced them with semantic CSS classes:
  - `hero-sun-icon`, `feature-icon`, `feature-icon-primary`, `feature-icon-solar`.
- Replaced bridge muted text token usage with PrimeNG token:
  - `var(--text-color-secondary)` → `var(--p-text-muted-color)`.
- Reduced `::ng-deep` usage to only PrimeNG internals (`.p-button`, `.p-card-header`, `.p-card-body`) and scoped it with `:host ::ng-deep`.
- Removed redundant hover border-radius overrides on `btn-solar`/`btn-outline` that duplicated PrimeNG button defaults.
- Kept visual behavior and structure intact while improving token consistency and maintainability.

### Full Prompt
"Yes, continue"

### Affected Files
- `client/src/app/features/visitor/landing-page/landing-page.component.ts`

### Reasoning Snapshot
- Inline styles were migrated to classes to centralize styling concerns and improve maintainability.
- `::ng-deep` was kept only where PrimeNG renders internal DOM outside straightforward component selectors.
- Aura-native tokens were preferred over bridge aliases where direct equivalents existed.

---

## 📅 March 7, 2026 - Primary Font Switch to Inter

### Topic
Changed the application typography baseline to use Inter as the primary font family.

### Summary of Request
User requested replacing the current primary font and using Inter across the application.

### What Was Achieved
- Updated Google Fonts import to Inter in `index.html`.
- Replaced fallback font stacks from Manrope to Inter in:
  - `theme-light.scss`
  - `theme-dark.scss`
  - global `body` declaration in `styles.scss`
- Verified touched files with diagnostics: no errors found.

### Full Prompt
"I want to use Inter as primary font"

### Affected Files
- `client/src/index.html`
- `client/src/styles/theme-light.scss`
- `client/src/styles/theme-dark.scss`
- `client/src/styles.scss`

### Reasoning Snapshot
- Keeping font import and fallback stacks aligned prevents inconsistent typography between token-driven and direct style usage.
- Using Inter in both token-level and body-level fallbacks ensures reliable rendering even if a PrimeNG font token is missing at runtime.

---

## 📅 March 7, 2026 - Global Typography Fix + Register Style Cleanup

### Topic
Fixed global font fallback behavior and continued visitor style cleanup by refactoring `register.component.ts` toward Aura token usage.

### Summary of Request
User requested fixing the app typography first because the UI was falling back to an undesirable default font, then continuing immediately with the register component style refactor.

### What Was Achieved
- Replaced Google Font import in `index.html` from Roboto to Manrope and added `fonts.googleapis.com` preconnect.
- Added robust fallback chain for font tokens in both theme bridge files:
  - `--font-family: var(--p-font-family, 'Manrope', 'Segoe UI', system-ui, sans-serif)`
- Added the same fallback at global usage site in `styles.scss` (`body { font-family: ... }`) to prevent browser-default fallback when token resolution fails.
- Refactored `register.component.ts` styles:
  - Consolidated fragmented `::ng-deep` usage into one scoped `:host ::ng-deep` block.
  - Migrated error token usage from `--red-500` to `--p-red-500`.
  - Removed redundant disabled button override block while preserving behavior and layout.
- Verified all touched files with diagnostics: no compile or style errors.

### Full Prompt
"Before that, we are using no fonts and is using a awful default one. After fixing that well continue with the register component"

### Affected Files
- `client/src/index.html`
- `client/src/styles/theme-light.scss`
- `client/src/styles/theme-dark.scss`
- `client/src/styles.scss`
- `client/src/app/features/visitor/register/register.component.ts`

### Reasoning Snapshot
- The root issue was token fallback: `body` depended on `--font-family`, which depended on `--p-font-family` without a hard fallback.
- Adding fallback at both token definition and usage levels ensures stable typography in all load orders and theme states.
- Register style refactor follows the same low-risk pattern used for visitor pages: keep visual behavior, reduce deep selector spread, and use PrimeNG native tokens directly.

---

## 📅 March 7, 2026 - Login Style Cleanup (Aura Token Alignment)

### Topic
Refactored `login.component.ts` styles to better align with PrimeNG Aura tokens and reduce `::ng-deep` footprint.

### Summary of Request
User approved starting the component-style cleanup plan from `login.component.ts` and requested migration toward PrimeNG `--p-*` tokens with safer scoped deep selectors.

### What Was Achieved
- Consolidated scattered deep overrides into a single scoped `:host ::ng-deep` block.
- Kept PrimeNG defaults where possible and retained only required internal overrides for card body/header and password/input internals.
- Migrated error color usage from bridge token `--red-500` to PrimeNG token `--p-red-500`.
- Removed redundant/dead style override block for `.btn-primary` disabled state.
- Preserved template structure, component logic, animations, and brand styling behavior.

### Full Prompt
"Pick up where we left off: Component Style Cleanup — Solar Planner v2 ... Ready to begin? Start with: 'Refactor login.component.ts to use PrimeNG Aura tokens and reduce ::ng-deep usage'"

### Affected Files
- `client/src/app/features/visitor/login/login.component.ts`

### Reasoning Snapshot
- PrimeNG Aura should remain the source of truth for component theming, so bridge-token usage was reduced where direct `--p-*` tokens are available.
- `::ng-deep` cannot be fully removed for PrimeNG internal DOM targets, but scoping under `:host` reduces global leakage.
- A style-only refactor minimizes regression risk while improving long-term maintainability for subsequent component cleanup steps.

---

## 📅 March 4, 2026 - Meta-editable Styled as p-tag Pills

### Topic
Styled `.meta-editable` wrappers to visually match `p-tag` using PrimeNG tag CSS variables.

### Summary of Request
User wanted to wrap meta-editables inside a `p-tag`. Since PrimeNG Tag doesn't support content projection for arbitrary form controls, `.meta-editable` was styled to match `p-tag` exactly using `--p-tag-*` CSS variables.

### What Was Achieved
- `.meta-editable` now uses `--p-tag-primary-background`, `--p-tag-primary-color`, `--p-tag-font-size`, `--p-tag-font-weight`, `--p-tag-padding`, and `--p-tag-rounded-border-radius` — visually identical to `p-tag` and auto-switches with light/dark.
- Embedded `p-select` and `p-inputnumber` rendered borderless/transparent so they blend into the tag pill.
- Labels inherit color/weight from the wrapper — zero hardcoded values.

### Full Prompt
"Would it be possible to wrap the meta-editables around a p-tag? and inside the p-tag include the label and the p-select/p-inputnumber"

### Affected Files
`client/src/app/features/user/configure-project/configure-project.component.ts`

---

## 📅 March 4, 2026 - Meta-editable Height Alignment with p-tag

### Topic
Sized the `p-select` and `p-inputnumber` inside the metadata strip to match the height of the `p-tag` pills.

### Summary of Request
User wanted the meta-editable form controls (currency select, energy price input) to be the same height as the `p-tag` chips in the metadata strip.

### What Was Achieved
- Matched `font-size` to `0.875rem` (same as `p-tag` root) for `.meta-editable`, its label, and the inner `p-select` / `p-inputnumber`.
- Set inner label padding to `0.25rem 0.5rem` (matching `p-tag`'s `padding` from the preset) on `.p-select-label` and `.p-inputnumber-input`.
- Bumped label `font-weight` to `700` to match `p-tag`'s weight.

### Full Prompt
"Great. Now can you customize the meta-editables and the p-select and p-inputnumber to that they have the same size as the p-labels (same height)"

### Affected Files
`client/src/app/features/user/configure-project/configure-project.component.ts`

---

## 📅 March 4, 2026 - Meta-chip & Meta-editable Dark/Light Theme Support

### Topic
Made the metadata strip in configure-project follow the PrimeNG dark/light theme automatically.

### Summary of Request
User asked to modify `meta-chip` and `meta-editable` so they follow the dark/light themes from the PrimeNG preset. Suggested using `p-tag` for the chips to avoid extra maintenance code.

### What Was Achieved
- **Replaced** custom `<div class="meta-chip">` elements with PrimeNG `<p-tag>` components (already imported via `TagModule`). Tags automatically pick up `tag.colorScheme.light/dark` tokens from the preset for theming.
- **Removed** ~15 lines of hardcoded `.meta-chip` / `.meta-chip i` CSS that used non-theme-aware colors (`var(--p-green-700)`, `var(--p-green-100)`).
- **Updated** `.meta-separator` background to `var(--p-content-border-color)` (theme-aware).
- **Updated** `.meta-editable label` color to `var(--p-text-muted-color)` (theme-aware).
- Zero new CSS classes or custom color logic — all theming delegated to PrimeNG design tokens.

### Full Prompt
"Can you modify the meta-chip and meta-editable so that they can follow the dark and light themes from the preset in primeng? Maybe you can use p-label for the meta-chips? I dont want to add extra code that makes this not mantainable"

### Affected Files
`client/src/app/features/user/configure-project/configure-project.component.ts`

### Reasoning
- `TagModule` was already imported. Using `<p-tag>` with `[rounded]="true"` replaces the custom chip markup.
- PrimeNG `p-tag` reads the `tag.colorScheme.light` / `tag.colorScheme.dark` tokens from the `SolarPreset`, so colors adapt automatically — no manual `@media (prefers-color-scheme)` or class toggles needed.
- The existing custom `.meta-chip` CSS hardcoded `var(--p-green-700)` / `var(--p-green-100)` which only looked correct in dark mode; deleting it in favor of the preset-driven Tag eliminates the issue entirely.
- For `meta-editable` labels and the separator, switching to `--p-text-muted-color` and `--p-content-border-color` achieves the same automatic theme adaptation without adding any component or wrapper.

---

## 📅 March 3, 2026 - Extract Shared Constants to project.constants.ts

### Topic
Identified and eliminated duplicated constant definitions in `configure-project.component.ts` by extracting them into a shared `project.constants.ts` file under `core/constants/`.

### Summary of Request
User confirmed that the last session had extracted components globally. They noticed the configure-project component was still +1100 lines and asked if it was actually using the global objects. After analysis, it was confirmed that `TimezoneOption`, `CurrencyOption`, `COUNTRY_TIMEZONE`, `COUNTRY_CURRENCY`, `orientationOptions`, `timezoneOptions`, and `currencyOptions` were all still locally duplicated in the component. User approved moving them to a new `project.constants.ts` constants file.

### What Was Achieved
- **Created `client/src/app/core/constants/project.constants.ts`** with all shared types and data:
  - Interfaces: `OrientationOption`, `TimezoneOption`, `CurrencyOption`
  - Maps: `COUNTRY_CURRENCY_MAP`, `COUNTRY_TIMEZONE_MAP`
  - Arrays: `ORIENTATION_OPTIONS`, `TIMEZONE_OPTIONS`, `CURRENCY_OPTIONS`
- **`configure-project.component.ts`**: Removed 3 local interface definitions + 2 private class record maps + 3 large options arrays (~90 lines). Now imports and references constants directly. Component reduced from **1459 → 1369 lines**.
- **`metadata-strip.component.ts`**: Removed locally-defined `CurrencyOption` and `TimezoneOption` interfaces; now imports from `project.constants.ts` and re-exports with `export type { ... }` for backward compatibility.
- Build passes with zero errors (`ng build --configuration=development` ✓).

### Full Prompt
"Yes, but add the constants under the name project.constants.ts"

### Affected Files
**New:** `client/src/app/core/constants/project.constants.ts`
**Modified:** `client/src/app/features/user/configure-project/configure-project.component.ts`, `client/src/app/shared/components/metadata-strip/metadata-strip.component.ts`

### AI Reasoning
The constants were duplicated between the previously extracted `MetadataStripComponent` and the parent `configure-project.component.ts`. Centralizing them in `core/constants/project.constants.ts` follows the feature-first + core/shared architecture: `core/` holds app-wide singletons and constants, while `shared/` holds reusable UI components. Using `export type { ... }` in `metadata-strip.component.ts` preserves the existing public API for any consumers that import types from there.

---

## 📅 March 3, 2026 - Configure-Project Component Refactoring (Phase 1–2)

### Topic
Refactored the `ConfigureProjectComponent` based on a detailed analysis document (`CONFIGURE-PROJECT-ANALYSIS.md`). Extracted reusable components, consolidated CSS into SCSS partials, and eliminated all 11 `::ng-deep` selectors using the PrimeNG PT (Pass Through) API.

### Summary of Request
User approved a 3-phase plan:
1. **Phase 1 (Quick Wins):** Extract `MetadataStripComponent` and `ReviewCardComponent`.
2. **Phase 2 (ng-deep Elimination):** Replace all `::ng-deep` with PT API bindings and global SCSS overrides.
3. **Phase 3 (SCSS Consolidation):** Extract shared styles into SCSS partial files.

### What Was Achieved
- **`MetadataStripComponent`** (`shared/components/metadata-strip/`) — encapsulates the metadata strip (country, timezone chips + currency select + energy price input). Uses `input()` signals and PrimeNG PT API bindings (`metaSelectPt`, `metaInputNumberPt`) with classes defined in `_meta-editable.scss`, replacing all 10 `::ng-deep` selectors targeting `.meta-editable`.
- **`ReviewCardComponent`** (`shared/components/review-card/`) — reusable review summary card accepting `title`, `icon`, `items[]`, optional `badge`, and `editButton`. Used 4 times in Step 2 replacing ~140 lines of inline template.
- **4 computed signals added** to `ConfigureProjectComponent`: `projectReviewItems`, `locationReviewItems`, `panelReviewItems`, `capacityReviewItems`, `capacityBadge` — each builds `ReviewItem[]` from existing signals, keeping logic in the component class.
- **`errorCardPt`** PT binding added, replacing the last `::ng-deep .error-card` selector.
- **7 SCSS partial files created:**
  - `styles/components/_metadata-strip.scss`
  - `styles/components/_review-card.scss`
  - `styles/components/_step-card.scss`
  - `styles/components/_step-navigation.scss`
  - `styles/layout/_forms.scss`
  - `styles/layout/_grids.scss`
  - `styles/layout/_spacing.scss`
  - `styles/primeng-overrides/_meta-editable.scss`
- **`styles.scss` updated** with `@use` imports for all 8 new partials (components, layout, primeng-overrides sections).
- **`ConfigureProjectComponent` styles array reduced** from ~1000 lines to ~300 lines (only component-specific, non-reusable styles remain inline).
- **Zero `::ng-deep` selectors** remain in the component.
- Build passes with no errors (`ng build --configuration=development` ✓).

### Full Prompt
> "Follow all of the recommendations detailed here, but not Location Search & Map Component extraction. Include: 2. Consolidate & Extract Shared Styles. Create a list for all the changes."
> [approved] "Yes, lets go"

### Affected Files
**New:** `client/src/app/shared/components/metadata-strip/metadata-strip.component.ts`, `client/src/app/shared/components/review-card/review-card.component.ts`, `client/src/styles/components/_metadata-strip.scss`, `client/src/styles/components/_review-card.scss`, `client/src/styles/components/_step-card.scss`, `client/src/styles/components/_step-navigation.scss`, `client/src/styles/layout/_forms.scss`, `client/src/styles/layout/_grids.scss`, `client/src/styles/layout/_spacing.scss`, `client/src/styles/primeng-overrides/_meta-editable.scss`

**Modified:** `client/src/app/features/user/configure-project/configure-project.component.ts`, `client/src/styles.scss`

### AI Reasoning
The component had grown to 1905 lines with 1000+ lines of inline CSS, which violated Angular's single-responsibility principle and made maintenance difficult. The approach prioritized:
1. Using Angular 21 `input()` signals in new components (vs `@Input()`) for the modern API.
2. Using PrimeNG's PT API for all PrimeNG overrides — avoids encapsulation violations that `::ng-deep` causes.
3. SCSS `@use` over `@import` (the latter is deprecated in Dart Sass) for all new partials.
4. Co-located styles: each extracted component could eventually have its own `.scss` file, but given the global nature of the overrides, the `styles/` folder structure was chosen for shared patterns.

---



### Topic
Restructured the configure-project flow: removed the dedicated General Info stepper step, made the project name always inline-editable in the header, and added a metadata strip (country, timezone, currency, energy price) that auto-populates from reverse geocoding when the user searches for a location.

### Summary of Request
User wanted country and timezone to auto-update based on project location. Currency should be auto-mapped from country (EUR default). Energy price stays user-entered. Project name should always be editable inline. The General Info step should be removed; its fields (currency, price, country, timezone) should appear as a compact strip above the Panel Setup cards.

### What Was Achieved
- **Eliminated Step 1 (General Info)** — stepper reduced from 3 steps to 2: Panel Setup → Review & Save.
- **Inline-editable project name** in the page header — styled as a heading with pencil hint; focus reveals a bottom border. No separate "name" field needed.
- **Metadata strip** added above the 2×2 grid in Panel Setup: shows Country (auto, read-only chip), Timezone (auto, read-only chip with human-readable label), Currency (auto-set but overridable dropdown), and Energy Price (user input).
- **Enhanced Nominatim address search** with `addressdetails=1&accept-language=en` — extracts `country` and `country_code` from results.
- **Country → Timezone mapping** (~30 countries) using static `COUNTRY_TIMEZONE` map; values match existing `timezoneOptions`.
- **Country → Currency mapping** (~30 countries) using static `COUNTRY_CURRENCY` map; defaults to EUR for unmapped countries.
- **`applyLocationMetadata()`** method patches country, timezone, and currency into the form whenever an address search succeeds.
- **`timezoneLabel` computed signal** resolves the raw timezone value to a human-readable label for display.
- **`hasUnsavedChanges`** now tracks country, timezone, currency, and price in addition to existing fields.
- Step navigation updated: "Step X of 2", labels adjusted, Review step edit buttons point to step 1.

### Full Original Prompt
"I think we could rethink some things related to the fields in the general information step. The country and timezone should update automatically when modifying the location of the project. For the currency we could have a mapping that sets a currency when the timezone is x (or the country) and use euro as default. Then for the energy price, that must be set by the user. The thing is, with this in mind, it does not make sense to have this step before the location setter. As for the project name, would it be possible to make the project name always editable? Like when showing the project name, make it always editable. So currency, price, country, timezone could be added to the panel setup as a strip on top of the location and area, and panel and instalation cards. Lets try that"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts` (template, styles, logic)

### Agent Reasoning
Removing the General Info step reduces friction — all configuration now happens in a single step with the metadata strip providing context. The inline-editable name gives constant visibility and editability without a dedicated form section. Auto-detecting country/timezone/currency from the Nominatim geocoding response eliminates manual data entry for fields that are derivable from the map location. The currency remains overridable because users in border regions or using foreign currencies may need to change it. Static mappings were chosen over external timezone APIs to keep the app dependency-free and fast (acceptable for a thesis project with ~30-country coverage).

---

## 📅 March 1, 2026 - Restructure Configure-Project Stepper

### Topic
Major restructure of the `configure-project` component to improve UX: reorganized stepper steps, added 2-column Panel Setup layout, sticky navigation, optimal config auto-calculation, and 3D view placeholder.

### Summary of Request
User wanted to restructure the configure-project stepper so that (1) General Info only contains general info (no map), (2) Panel Setup shows location/area, panel config, 3D placeholder, and live capacity preview in a 2×2 grid, (3) polygon changes auto-recalculate optimal panel config, (4) an Optimal/Custom badge indicates when the user deviates from the computed optimal, and (5) navigation buttons are always visible via a sticky top bar instead of being at the bottom.

### What Was Achieved
- **Step 1 (General Info)** now only contains the general information card (name, country, timezone, currency, energy price). The location map was moved out.
- **Step 2 (Panel Setup)** uses a **2×2 CSS grid layout**:
  - **Top-left**: Location & Area card with address search, editable Leaflet map, and polygon status.
  - **Top-right**: Panel & Installation card with panel selector, panel number, tilt, direction, azimuth, and row spacing.
  - **Bottom-left**: 3D Installation View placeholder card.
  - **Bottom-right**: Live Capacity Preview card with Optimal/Custom badge, panel stats, capacity, annual production estimate, and coverage %. Includes a "Restore optimal" link when a custom configuration is active.
- **Step 3 (Review & Save)** shows 4 summary cards (General Info, Location & Area, Panel & Installation, Capacity) in a 2×2 review grid, plus the total capacity highlight card.
- **Sticky navigation bar** placed between the header and stepper, always visible at the top. Contains Back/Next/Save buttons and a "Step X of 3 — Title" indicator. Navigation uses `activeStep.set()` instead of in-template `activateCallback`.
- **Optimal config auto-calculation**: when the user changes the polygon, panel selection, or tilt, the server's `/projects/calculate` endpoint is called to compute the optimal panel count. The result auto-fills the panel number field. If the user manually changes the panel number, the badge switches from "Optimal" to "Custom" with a restore link.
- **Form watchers** use `distinctUntilChanged()` and `debounceTime(500)` (for tilt) with `takeUntilDestroyed()` to avoid redundant API calls.
- Page max-width increased from 1080px to 1280px to accommodate the 2-column layout.
- Setup grid collapses to single column at ≤960px; form/review grids collapse at ≤768px.

### Full Original Prompt
"I want to modify the configure project component. The thing is, If we let the user redefine the area polygon, the most normal thing to do would be to recalculate the number of panels, row spacing, etc (optimal config). I think the proper way to do this would be to leave the general info tab only containing the general information card. Then I am thinking what to do in the panel setup part. Because I would like to add the following things as part of the setup: 1. Current location and area selected (that can be edited) 2. panel and installation card containing the chosen panel, number of panels given as per the optimal config, and the other values 3. Live capacity preview that changes depending on the configuration in the panel and installation card (that will change if the user changes the polygon area, but could also be modified if the user wants to. It could be nice to include some kind of indicator to show when the optimal config is showing in that card and when manual edition has been made) 4. 3D view of the installation (for now this could be just a placeholder). After this, a summary of the setup can be shown with a summary of this info (maybe cards of all the 4 steps described above). Another thing is. Either we avoid vertical scrolling in this whole configure-project component, or we reposition the back and next buttons to be on the top instead of at the bottom where the user might not see them."

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts` (full rewrite)

### Agent Reasoning
Keeping 3 stepper steps (rather than 4-5) minimizes cognitive load while reorganizing content: Step 1 is lightweight general info, Step 2 packs the core technical config into a space-efficient 2×2 grid, and Step 3 provides a full summary. The sticky nav bar solves the "hidden buttons" problem without forcing no-scroll constraints. Auto-calculating optimal config on polygon/panel/tilt changes creates the "smart recalculation" UX the user described, while the Optimal/Custom badge and restore link give transparency and control over manual overrides. The `fetchOptimalConfig(autoApply)` pattern lets the initial load establish the optimal baseline without overriding the user's saved configuration.

---

## 📅 February 28, 2026 - Configure Project Map Loading Fix

### Topic
Fix map rendering issues in `configure-project` where the Leaflet map was not loading properly inside the stepper layout.

### Summary of Request
User reported: "For some reason the map in the configure-project component is not loading properly" and approved applying a targeted fix.

### What Was Achieved
- **Stabilized map initialization in shared Leaflet component** by adding post-render size invalidation passes (`invalidateSize`) after map creation.
- **Added `ResizeObserver` support** in `LocationMapComponent` to automatically invalidate map size whenever host/container dimensions change (e.g., stepper panel render/layout changes).
- **Improved map recenter robustness** by invalidating size before `flyTo` when the address-search center input changes.
- **Added geolocation fallback in Configure Project** using `[centerOnUser]="mapLat() == null || mapLng() == null"` to avoid starting at `0,0` when no project coordinates exist.
- **Lifecycle cleanup added** for timers and observer disconnection in `ngOnDestroy`.

### Full Original Prompt
"For some reason the map in the configure-project component is not loading properly"

### Affected Files
- `client/src/app/shared/components/location-map/location-map.component.ts`
- `client/src/app/features/user/configure-project/configure-project.component.ts`

### Agent Reasoning
Leaflet often initializes incorrectly when its container is hidden or not fully measured (common in steppers/tabs/cards), producing blank or partially rendered maps. The root-cause fix is to trigger `invalidateSize()` after mount and on container size changes rather than only at initial `setView`. A small caller fallback was added so missing project coordinates do not force an initial center at Gulf of Guinea (`0,0`).

---

## 📅 Current Session - Project Infrastructure Analysis Updated (Fixes Documented)

### Topic
Updated `PROJECT-INFRASTRUCTURE-ANALYSIS.md` to reflect the optimized architecture after fixing critical bugs in the project management system.

### Summary of Request
User asked to "redo the project infrastructure analysis" after completing fixes to the project CRUD operations and geospatial field handling.

### What Was Achieved

**Documentation Updated in `PROJECT-INFRASTRUCTURE-ANALYSIS.md`:**

All sections were completely rewritten to reflect the optimized state:

1. **Section 3: Design Principles & Trade-offs** — Documented the advantages and trade-offs of on-demand geospatial field calculation
2. **Section 4: CRUD Operations Summary** — Added comprehensive table showing all project operations working with proper authorization
3. **Section 5: Communication Flow Examples** — Three flow diagrams showing the now-fixed workflow:
   - Flow #1: Create Project (on-demand calculation in response)
   - Flow #2: Update Project with area change
   - Flow #3: Update Project without area (graceful null handling)
4. **Section 6: Summary of Changes & Fixes** — Detailed before/after code examples for 5 critical issues fixed:
   - Issue #1: updateProject() now uses findByIdAndUpdate instead of create
   - Issue #2: Null check for optional area parameter
   - Issue #3: Refactored to on-demand geospatial calculation (not stored in DB)
   - Issue #4: updateProject() controller handler added
   - Issue #5: PUT /projects/:id route added and properly scoped
5. **Section 7: Architecture Summary** — Updated to show all 6 layers are ✅ fixed
6. **Section 8: Data Consistency Matrix** — Revised to show lat/lon/surface calculated on-demand, not persisted
7. **Conclusion** — Changed from "Critical bugs identified" to "Fixed & Optimized" with production-ready status

### Full Original Prompt
"Can you redo the project infrastructure analysis?"

### Affected Files
- `PROJECT-INFRASTRUCTURE-ANALYSIS.md` — Complete documentation refresh

### Agent Reasoning
The analysis document identified 5 critical bugs in an earlier session. After code fixes were implemented and tested, the document needed updating to serve as a reference for the optimized architecture. Key design principle documented:

**On-Demand Calculation Pattern:** `lat`, `lon`, and `surface` are now calculated from `area` polygon on every response transformation (via `calculateGeospatialFields()`) instead of being persisted in the database. Benefits:
- Single source of truth (area polygon only)
- Guaranteed data consistency (impossible to become stale)
- Minimal storage overhead
- Simple update logic (no sync complexity)

---

## 📅 February 24, 2026 - Fix Dashboard Total Production Always Showing Zero

### Topic
`totalProduction` on the user dashboard was always `0` and never updated automatically.

### Summary of Request
User noticed "Total Production" was stuck at 0 and asked why it wasn't updating automatically.

### What Was Achieved

**Root cause identified (two layers):**
1. **Server:** `getUserDashboard` and `getAdminDashboard` both computed `totalProduction` by summing `prodToday[].pv` across projects. However, `prodToday` is never written by any part of the application (no scheduler, no external API call, no update endpoint), so the array is always empty and the sum is always `0`.
2. **Client:** `DashboardComponent.ngOnInit` loaded stats once and never re-fetched, so even if server data changed the UI would not reflect it.

**Changes applied:**

- **Server `getUserDashboard` and `getAdminDashboard`** — replaced the dead `prodToday` sum with a capacity-based annual production estimate using the same formula already present in `generatePlanData`: `capacityKW × peakSunHours × 365 × 0.85`. Peak sun hours are derived from the project's latitude (`max(2, 5.5 − |lat| × 0.02)`), falling back to `4 h` when latitude is absent.
- **`DashboardComponent`** — added `OnDestroy`, a `POLL_INTERVAL_MS = 60_000` constant, and a `setInterval` started in `ngOnInit` that calls `loadDashboard()` every 60 seconds. The interval is cleared in `ngOnDestroy` to prevent memory leaks.
- **Dashboard HTML** — updated the card header from "Total Production" → "Est. Annual Production" and the unit from `kWh` → `kWh / year` to correctly reflect that the value is an estimate, not a live reading.

### Full Original Prompt
"The total production is not updating automatically. Can we fix it? What is it dependant on?"

### Affected Files
- `server/src/services/project.service.ts` — `getUserDashboard` and `getAdminDashboard` methods
- `client/src/app/features/user/dashboard/dashboard.component.ts`
- `client/src/app/features/user/dashboard/dashboard.component.html`

### Agent Reasoning
The `totalProduction` field in the dashboard response is computed server-side at request time. Since `prodToday` is never populated (no live telemetry integration exists yet), the correct short-term fix is to derive the stat from the data that *is* available: panel wattage, panel count, and project latitude. This is consistent with the estimation logic already in `generatePlanData`. On the frontend, a simple `setInterval` polling pattern is the safest approach that avoids introducing RxJS `timer`/`takeUntilDestroyed` complexity while guaranteeing the value stays current and the interval is always cleaned up.

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

## 📅 February 28, 2026 - Editable Location Map in Configure Project

### Topic
Add editable project location (address search + polygon drawing) to the configure-project component, matching the add-project UX.

### Summary of Request
User requested making the project location editable in the configure-project component, like it is in the add-project component — with address search and polygon drawing.

### What Was Achieved

Replaced the read-only map preview in Step 1 of the configure-project wizard with a fully editable location section:

- **Address search bar** using Nominatim/OpenStreetMap geocoding (same as add-project) with PrimeNG InputText + Button
- **Editable Leaflet map** with polygon draw controls via the shared `LocationMapComponent` in editable mode
- **Pre-populated polygon** from the existing project data that users can redraw
- **Polygon status indicator** showing whether a polygon is defined and with how many points
- **Location & area summary** in the Step 3 review view (coordinates + polygon point count)
- **Smart save logic**: if the user edits the polygon, the new coordinates are sent to the server; otherwise the original `area` is preserved
- **Unsaved changes detection** now also tracks polygon edits via `polygonEdited` signal

### Full Original Prompt
"We should add the project location to be editable, like in the add-project component"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts` — Added editable map, address search, polygon handling, location review items, CSS

### Agent Reasoning
- Reused the existing `LocationMapComponent` in `[editable]="true"` mode — same component used by `AddProjectComponent`, no duplication.
- Added `HttpClient` for Nominatim geocoding (same approach as add-project).
- Added `polygonEdited` signal to track whether the user actually changed the polygon, so the unsaved changes indicator and save payload logic are correct.
- The map pre-loads with the existing project's coordinates and polygon, so users see their current installation area and can modify it if needed.
- Styled the address search using PrimeNG InputText + Button for visual consistency with the rest of the step, replacing the plain HTML inputs used in add-project.

### Validation
- `ng build --configuration=development` — clean build, no errors
- Zero TypeScript/lint errors

---

## 📅 February 28, 2026 - Configure Project Component (PrimeNG Stepper Wizard)

### Topic
Create a rich, multi-step configure-project page using PrimeNG components for editing existing solar project settings.

### Summary of Request
User requested a highly aesthetic and UX-friendly configure-project component using PrimeNG CSS components. The component should allow users to edit all configurable fields of an existing project.

### What Was Achieved

**Created `ConfigureProjectComponent`** — a 3-step wizard using PrimeNG Stepper:

1. **Step 1 — General Info**: Project name, country, timezone (filterable Select), currency, energy price. Includes a read-only Leaflet map preview showing the project's polygon.
2. **Step 2 — Panel & Installation**: Solar panel selection (rich dropdown with wattage, efficiency, technology details), number of panels, tilt/inclination, orientation/direction, azimuth, row spacing. Features a live capacity preview card that updates reactively.
3. **Step 3 — Review & Save**: Side-by-side summary cards with edit buttons to jump back to any step, a highlighted total capacity card with solar glow effect, success/error messages, and save button.

**PrimeNG components used:** Stepper, FloatLabel, InputText, InputNumber, Select, Button, Card, Tag, Divider, Message, Skeleton, Tooltip.

**Design highlights:**
- Custom step icons with active state transitions
- Organic rounded corners (24px cards) consistent with solar planner design system
- Solar yellow highlight for capacity preview with glow effect
- Responsive grid that collapses to single column on mobile
- Unsaved changes indicator tag in header
- Loading skeleton state and error state with back navigation
- `ChangeDetectionStrategy.OnPush` for performance

**Additional fixes:**
- Updated `ProjectUpdateRequest` interface to match server's `ProjectUpdateSchema` (was outdated with only name/address/orientation)
- Removed stale `console.warn` from `ProjectService.updateProject()` — the server endpoint exists
- Wired "Configure" button in `ViewProjectComponent` to navigate to `/projects/:id/configure`
- Added lazy-loaded route for the new component

### Full Original Prompt
"I want you to help me create a very good in UX and very aesthetic configure-project component using primeng css components."

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts` — **New** (main component)
- `client/src/app/app.routes.ts` — Added `/projects/:id/configure` route
- `client/src/app/features/user/view-project/view-project.component.ts` — Wired Configure button with routerLink
- `client/src/app/core/models/project.model.ts` — Updated `ProjectUpdateRequest` to match server schema
- `client/src/app/core/services/project.service.ts` — Cleaned up `updateProject` method

### Agent Reasoning
- Chose PrimeNG Stepper over a flat form to break the ~12 configurable fields into digestible steps, reducing cognitive load for farmers/homeowners who are the primary audience.
- Used `ProjectResponse` type instead of `Project` in the component since the server API returns the flat response shape (with `tilt`, `direction`, `panelNumber`, etc.) rather than the domain model shape.
- The `area` field (polygon coordinates) is required by the server's `ProjectUpdateSchema` — the component passes through the original `area` from the loaded project on save, since polygon editing is deferred to a later iteration.
- Used `forkJoin` to load project + panels in parallel for faster initial render.
- Reactive form with `toSignal(valueChanges)` enables computed signals for live capacity preview and unsaved changes detection without manual subscriptions.

### Validation
- `ng build --configuration=development` — clean build, no errors
- Zero TypeScript/lint errors in all affected files

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

## 📅 March 1, 2026 - Fix Layout Headers/Footers Not Filling Full Width

### Topic
Headers and footers in all three layout components (user, admin, visitor) were not spanning the full horizontal viewport width, and had a gap at the top.

### Summary of Request
User reported that all layout headers and footers did not completely fill the horizontal space, and headers didn't fill the top space either. Asked whether switching to a PrimeNG header component would help.

### What Was Achieved
- **Added `margin: 0; padding: 0;` to the global `html, body` reset** in `styles.scss` to eliminate the browser's default `8px` body margin that was causing the gap at the top and sides.
- **Added `:host { display: block; }` to all three layout components** (`UserLayoutComponent`, `AdminLayoutComponent`, `VisitorLayoutComponent`) so Angular custom elements take full width instead of defaulting to `display: inline`.
- **Recommended keeping custom headers** over PrimeNG Menubar/Toolbar since the custom headers already match the solar design system, are fully responsive, and offer more styling control.

### Full Prompt
> "I have an issue with the layouts (user, admin, visitor). All of the headers and footers do not completely fill the horizontal space. And the headers dont fill the top space either. How can I fix that? I was using a normal header. Maybe for simplicity would it make sense to use a header from primeng? What do you think?"

### Affected Files
- `client/src/styles.scss` — Added `margin: 0; padding: 0;` to `html, body` reset
- `client/src/app/layouts/user-layout/user-layout.component.ts` — Added `:host { display: block; }`
- `client/src/app/layouts/admin-layout/admin-layout.component.ts` — Added `:host { display: block; }`
- `client/src/app/layouts/visitor-layout/visitor-layout.component.ts` — Added `:host { display: block; }`

### AI Reasoning
The root cause was two compounding CSS issues: (1) browsers apply a default `margin: 8px` on `<body>`, which was never reset, creating visible gaps around all edges; (2) Angular component host elements render as `display: inline` by default, so the layout wrappers weren't stretching to full width. The `app-root` already had `:host { display: block }` but the layout components did not. Switching to PrimeNG header components was not recommended since it would introduce styling constraints (fighting built-in padding/colors) without solving the actual CSS reset issue, and the existing custom headers already align with the design system.

---

## 📅 March 1, 2026 - Fix Panel Dropdown Selection & Capacity Preview Bug

### Topic
Bug fix for the configure-project component where the solar panel dropdown didn't show the selected panel and the live capacity preview showed "Select a panel" even after selection.

### Summary of Request
When configuring a project with a different polygon and location, the solar panel dropdown does not show the panel being used for calculations as selected, and when selecting it, the live capacity preview shows a message that a panel must be selected first.

### What Was Achieved
- Identified root cause: the server's `transformPanelToResponse` returns panels with `_id` but **no `id` field**, while the PrimeNG dropdown used `optionValue="id"` and the form stored the panel's MongoDB `_id` string. This mismatch meant every dropdown option had `undefined` as its value, so nothing matched the form's `panelId`.
- **Fixed** by normalizing panel data when loaded: `panels.map(p => ({ ...p, id: p.id ?? p._id ?? '' }))`. This ensures every panel object has a populated `id` field that matches the stored `panelId` from `project.panel`.
- The `selectedPanelData` computed signal now correctly resolves the panel, making the capacity preview display properly.

### Full Original Prompt
"When configuring a project and using a different polygon and location, the solar pannel dropdown does not show the panel being used for the calculations as selected, and when I select it, the live capacity preview shows a message that I must select a panel first. Lets fix that bug"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts` — Normalize `id` from `_id` when setting panel list

### AI Reasoning
The server's panel transform function (`transformPanelToResponse`) only maps `_id` to a string but never adds an `id` property. The client's `Panel` interface declares `id: string` but the actual API response objects lack it. The PrimeNG `<p-select>` with `optionValue="id"` resolved to `undefined` for every option, so the pre-populated `panelId` (a valid ObjectId string from `project.panel`) never matched any option. After selection, `panelId` was set to `undefined`, causing `selectedPanelData()` to return `null` and showing the "Select a panel" fallback message. The fix normalizes panel data on the client side immediately after loading, ensuring `id` is always populated from `_id`.

---

## 📅 March 4, 2026 - Match Currency & Energy Price Input Sizes to Meta-Chips

### Topic
Resize the PrimeNG `p-select` (currency) and `p-inputnumber` (energy price) inside the metadata strip so they visually match the compact height of the adjacent `.meta-chip` pills.

### Summary of Request
User asked to make the currency dropdown and energy price input in the metadata strip match the size of the meta-chip elements.

### What Was Achieved
Updated `::ng-deep` styles in `configure-project.component.ts` to apply identical padding (`0.4rem 0.85rem`), `font-size: 0.82rem`, and `line-height: 1` to the inner elements of both PrimeNG components. Set `height: auto` on the wrapper so they shrink naturally, and narrowed the select dropdown trigger to `1.75rem`.

### Full Prompt
"Can you help me with the size of the currency and energy price editables and inputtext, dropdown to match the size of the meta-chips"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts` — Updated `::ng-deep` styles for `.meta-editable .p-select` and `.meta-editable .p-inputnumber`

### AI Reasoning
The `.meta-chip` elements used compact padding (`0.4rem 0.85rem`) and small font (`0.82rem`), while the PrimeNG input components used their default larger sizing. The fix targets the inner rendered elements (`.p-select-label`, `.p-inputtext`) with matching padding, font-size, and line-height to bring them to the same visual height as the chips.

---

## 📅 March 4, 2026 - Restore Bubble Backgrounds & Migrate to PrimeNG Tokens

### Topic
Restore bubble backgrounds on `.meta-chip` and `.meta-editable` and replace all hardcoded hex colors with PrimeNG CSS custom properties for theme-awareness.

### Summary of Request
User noticed the meta-editable inputs had lost their bubble background and asked to restore it, while converting all hardcoded colors to PrimeNG design tokens.

### What Was Achieved
- **`.meta-chip`**: Replaced `#f0f7f4` → `var(--p-surface-50)`, `#1b4332` → `var(--p-green-600)`.
- **`.meta-chip i`**: `#40916c` → `var(--text-color-secondary)`.
- **`.meta-separator`**: `#b7e4c7` → `var(--surface-border)`.
- **`.meta-editable`**: Added bubble background (`var(--p-surface-50)`), `border-radius: 20px`, asymmetric padding for compact look.
- **`.meta-editable label`**: `#40916c` → `var(--text-color-secondary)`.
- **PrimeNG `::ng-deep` overrides**: Made `p-select` and `p-inputnumber` inside `.meta-editable` transparent/borderless so they blend into the bubble; set text color to `var(--p-green-600)` with `font-weight: 600`; removed hover/focus borders and box-shadows.

### Full Prompt
"Ok, that is good, but did you remove the background those meta chips and meta editables had? if so, put them back, so that they look like bubbles. Remember to make everything primeng first so that the elements can use the color preset"

### Affected Files
- `client/src/app/features/user/configure-project/configure-project.component.ts` — Replaced hardcoded hex colors with PrimeNG/theme CSS variables; restored bubble backgrounds on `.meta-editable`

### AI Reasoning
The metadata strip had hardcoded hex colors that wouldn't respond to theme changes (light/dark mode). The PrimeNG preset defines `--p-surface-50`, `--p-green-600`, etc., and the custom theme files define `--text-color-secondary` and `--surface-border`. By converting to these variables, the bubbles now adapt automatically to the active theme. The PrimeNG inputs inside `.meta-editable` were made transparent and borderless so the bubble container itself acts as the visual boundary, matching the `.meta-chip` aesthetic.

---

## 📅 March 7, 2026 - Add-Project Full-Screen Wizard & Cultivar Entity

### Topic
Full-screen multi-step project creation wizard + new Cultivar backend entity for agrivoltaic support.

### Summary of Request
Implement the approved `ADD-PROJECT-WIZARD-PLAN.md` — transform the single-page `AddProjectComponent` into a full-screen 4-step wizard (Project Info → Location & Area → Configuration → Review), introduce the Cultivar backend entity for agrivoltaic crop types, add new fields to the Project entity (`projectType`, `description`, `cultivar`), create an unsaved-changes guard, and route `projects/add` outside the user layout for a headerless/footerless experience.

### What Was Achieved
- **New Cultivar backend entity (6 files):** Mongoose model, Zod schema, types, service (CRUD), controller, routes — registered at `/api/cultivars` with admin-only write endpoints and user-accessible read endpoints.
- **Project entity extended:** Added `projectType` (roof/agrivoltaic), `description`, and `cultivar` (ObjectId ref) to Mongoose model, Zod create/update schemas, TypeScript response types, and service layer (with cultivar validation on create).
- **Client Cultivar model + service:** New `Cultivar` interface and `CultivarService` with `getAllCultivars`, `getCultivarById`, `getCultivarsByCategory`.
- **Unsaved-changes guard:** `canDeactivate` guard with `HasUnsavedWork` interface — warns on navigation away from dirty wizard state.
- **Routing change:** `projects/add` moved to a top-level standalone route (outside `UserLayoutComponent`) with `canDeactivate: [unsavedChangesGuard]`.
- **Full add-project component rewrite:** 4-step PrimeNG Stepper wizard with:
  - Step 1: Name, description, project type toggle (Roof / Agrivoltaic)
  - Step 2: Map + search + polygon drawing + country/timezone auto-detection + energy price
  - Step 3: Panel selector, panel count, tilt, direction, row spacing, cultivar selector (agrivoltaic), optimal config calculation, warnings system, Reset to Optimal, 3D placeholder
  - Step 4: Full review with edit buttons per section + Create Project
- **Minimal top bar** with brand icon, step indicator, and exit button with PrimeNG ConfirmDialog.
- **`beforeunload` listener** for browser tab close protection.
- **Client project model updated:** `ProjectCreateRequest` and `ProjectResponse` gained `description`, `projectType`, `cultivarId`/`cultivar` fields.
- **Barrel exports updated:** Models index exports Cultivar types; Guards index exports `unsavedChangesGuard`; Services index exports `CultivarService`.

### Full Prompt
"Let's follow this add-project-wizard-plan.md to update the component and implement all the new features. Read everything and start implementing when you have all the context necessary, we have got to nail this!"

### Affected Files

**New files (9):**
- `server/src/models/cultivar.model.ts`
- `server/src/schemas/cultivar.schema.ts`
- `server/src/types/cultivar.types.ts`
- `server/src/services/cultivar.service.ts`
- `server/src/controllers/cultivar.controller.ts`
- `server/src/routes/cultivar.routes.ts`
- `client/src/app/core/models/cultivar.model.ts`
- `client/src/app/core/services/cultivar.service.ts`
- `client/src/app/core/guards/unsaved-changes.guard.ts`

**Modified files (9):**
- `client/src/app/app.routes.ts` — Moved `projects/add` outside layout + added `canDeactivate`
- `client/src/app/features/user/add-project/add-project.component.ts` — Full rewrite as 4-step wizard
- `client/src/app/features/user/add-project/add-project.component.html` — New external template
- `client/src/app/features/user/add-project/add-project.component.scss` — New external styles
- `client/src/app/core/models/project.model.ts` — Added `description`, `projectType`, `cultivarId`/`cultivar`
- `client/src/app/core/models/index.ts` — Added cultivar model exports
- `client/src/app/core/guards/index.ts` — Added `unsavedChangesGuard` export
- `client/src/app/core/services/index.ts` — Added `CultivarService` export
- `server/src/routes/index.ts` — Registered `/cultivars` routes
- `server/src/models/project.model.ts` — Added `projectType`, `description`, `cultivar` fields
- `server/src/schemas/project.schema.ts` — Added new fields to create/update schemas
- `server/src/types/project.types.ts` — Added new fields to `ProjectResponse`
- `server/src/services/project.service.ts` — Cultivar validation + new fields in transform

### AI Reasoning
The plan specified a clear architecture: move the `projects/add` route outside `UserLayoutComponent` in `app.routes.ts` so no header/footer renders (Angular evaluates routes top-to-bottom, so `projects/add` matches before the `projects` parent route). The Cultivar backend entity follows the exact same layered pattern as Panel (Model → Schema → Types → Service → Controller → Routes). The wizard component uses PrimeNG Stepper with `activateCallback` for programmatic step navigation. Signals replace reactive forms for simpler state management in a wizard context. The `HasUnsavedWork` interface enables both the `canDeactivate` guard (URL-based navigation) and the `beforeunload` listener (browser close) to protect unsaved progress. Warning computations use `computed()` signals that auto-react to panel count and cultivar changes.

---

## 📅 March 7, 2026 — Fix: Optimal Config not calculating after panel selection

### Topic
Bug fix: `computed()` signals using plain properties instead of signals — optimal config never triggered.

### Summary of Request
After drawing a polygon and selecting a panel, the optimal config calculation was not being triggered. The user reported the calculate flow was broken.

### What Was Achieved
- **Root cause identified:** `selectedPanelId`, `panelCount`, `tiltAngle`, `selectedDirection`, `rowSpacing`, and `energyPrice` were declared as plain class properties (not signals). They were used inside `computed()` signals (`canCalculate`, `canProceedStep3`, `totalCapacity`, `warnings`, `selectedPanelData`, etc.). Angular's `computed()` only tracks signal reads — plain property mutations are invisible, so computed values returned stale cached results. When `onPanelChange()` called `onCalculate()`, `canCalculate()` still returned the cached `false` from before the panel was selected.
- **Fix applied:** Converted all 7 plain properties to `signal()`. Updated all reads to `.()`, all writes to `.set()`, all `[(ngModel)]` bindings to split `[ngModel]`/`(ngModelChange)` pattern, and all template interpolations to call the signal.

### Full Prompt
"Ok. There are several things I want to fix, but the first is that the optimal config is not working. And after setting the location and drawing the polygon, the optimal config is not being calculated after setting the panel"

### Affected Files
- `client/src/app/features/user/add-project/add-project.component.ts` — 7 properties converted from plain to `signal()`, all method references and computed signals updated
- `client/src/app/features/user/add-project/add-project.component.html` — All ngModel bindings and interpolations updated for signal reads

### AI Reasoning
Angular's `computed()` creates a reactive computation that tracks which signals were read during evaluation. When a `computed()` reads a plain class property (e.g., `this.selectedPanelId`), that read is NOT tracked — Angular has no way to know the property changed. The cached result is returned until a tracked signal dependency changes. Converting all mutable configuration properties to signals ensures `computed()` re-evaluates whenever any dependency changes, making the reactive chain from panel selection → `canCalculate` → `onCalculate` → estimation work correctly.

---

## 📅 March 7, 2026 — Fix: Row spacing not recalculating panel count

### Topic
Row spacing changes did not update max panels or panel count — missing client-side `maxPanels` formula.

### Summary of Request
User reported that modifying row spacing did not recalculate the number of panels.

### What Was Achieved
- **Server response extended:** Added `surfaceArea` (m²) and `latitude` to `OptimalConfigResponse` so the client has the polygon area for local recalculation without a server round-trip.
- **Client-side `maxPanels` computed signal:** Uses the plan formula `panelFootprint = W × (H × cos(α) + d)` with utilisation factors (roof 0.85, agrivoltaic 0.70). Reacts instantly to `rowSpacing`, `tiltAngle`, `selectedPanelData`, `projectType`, and `estimation` changes.
- **Client-side `shadowSpacing` computed signal:** Calculates minimum row spacing to avoid winter solstice noon shadows using `d = H × sin(α) / tan(β)` where `β = 90° − |lat| − 23.45°`.
- **`onRowSpacingChange()` handler:** Auto-clamps `panelCount` to `maxPanels` when row spacing increases beyond what fits the current panel count.
- **Warnings upgraded:** Now use client-side `maxPanels()` instead of server `recommendedPanels`, and include a new shadow-distance info warning.
- **Max panels badge:** Shows "Max panels for current spacing: **N**" below the row spacing input.

### Full Prompt
"There are issues with the row spacing. When I modify it, the number of panels does not recalculate automatically, or at least I am not seing it"

### Affected Files
- `server/src/types/project.types.ts` — Added `surfaceArea` and `latitude` to `OptimalConfigResponse`
- `server/src/services/project.service.ts` — Return new fields from `calculateOptimalConfig`
- `client/src/app/core/models/project.model.ts` — Added fields to client interface
- `client/src/app/features/user/add-project/add-project.component.ts` — Added `maxPanels`, `shadowSpacing` computed signals + `onRowSpacingChange()`
- `client/src/app/features/user/add-project/add-project.component.html` — Wired `onRowSpacingChange` on input, added max panels badge
- `client/src/app/features/user/add-project/add-project.component.scss` — Added `.max-panels-badge` style

### AI Reasoning
The server calculated `recommendedPanels` using only tilt and surface area — row spacing was not a factor. The plan (section 6) specifies a client-side `maxPanels` formula that explicitly includes row spacing (`d`) in the panel footprint. To avoid a server round-trip on every slider change, the server now returns `surfaceArea` and `latitude` once (after initial calculation), and the client computes `maxPanels` locally as a `computed()` signal that reacts instantly to row spacing, tilt, and panel selection changes.

---

## 📅 March 7, 2026 — Fix: Mismatched panel count between server and client + row spacing not updating input

### Topic
Unified panel calculation formula between server and client; row spacing changes now update the panel count input field.

### Summary of Request
User reported two issues: (1) the server's recommended panels and the client's "max panels" badge showed different numbers, and (2) changing row spacing didn't visually update the panel count input field.

### What Was Achieved
- **Unified formula:** Replaced the server's old `tiltFactor`-based formula (`panelArea × (1 + tilt/90 × 0.3)` with 80% utilisation) with the plan's canonical formula: `panelFootprint = W × (H × cos(α) + d)` where `d` is the shadow-based optimal row spacing, with 85% utilisation. Both server and client now use the same formula, so `recommendedPanels` from the server matches `maxPanels()` on the client (at the same row spacing).
- **Server computes `recommendedRowSpacing`:** Using `d = H × sin(α) / tan(β)` where `β = 90° − |lat| − 23.45°`, with a 0.6m minimum. Returned in `OptimalConfigResponse` so the client initialises the row spacing input from it.
- **Client sets initial `rowSpacing` from server response:** `onCalculate()` now sets both `rowSpacing` and `panelCount` from the server response, ensuring they start consistent.
- **`onRowSpacingChange(value)` always sets `panelCount` to `maxPanels()`:** Previously it only clamped down — now it recalculates for any direction of change, and accepts the value as a parameter for correct signal ordering.
- **`resetToOptimal()` also resets row spacing** to `recommendedRowSpacing` from the estimation.

### Full Prompt
"For some reason the calculations being made by the optimal config and what is showing as a info panel for max panels is different. Make sure you use the same function to calculate the number of panels, also, when modififying the row spacing, the number of panels in the input field is not updating"

### Affected Files
- `server/src/types/project.types.ts` — Added `recommendedRowSpacing` to `OptimalConfigResponse`
- `server/src/services/project.service.ts` — Replaced old tiltFactor formula with plan formula (panelFootprint + shadow-based row spacing)
- `client/src/app/core/models/project.model.ts` — Added `recommendedRowSpacing` to client interface
- `client/src/app/features/user/add-project/add-project.component.ts` — `onCalculate` sets `rowSpacing` from server; `onRowSpacingChange(value)` accepts param and always updates `panelCount`; `resetToOptimal` resets spacing too
- `client/src/app/features/user/add-project/add-project.component.html` — Row spacing `(ngModelChange)` calls `onRowSpacingChange($event)` directly

### AI Reasoning
The root cause of the mismatch was two different formulas: the server used a simplistic `tiltFactor` approach while the client used the plan's `panelFootprint = W × (H × cos(α) + d)`. By making the server use the same formula (including shadow-based row spacing), both sides agree on `recommendedPanels` at the default spacing. The input field not updating was caused by `onRowSpacingChange()` only clamping down — it now always sets `panelCount = maxPanels()` so the number reacts in both directions. Refactoring the handler to accept the value parameter ensures `rowSpacing` signal is set before `maxPanels()` is read.

---

## 📅 March 7, 2026 — Feature: Panel count changes recalculate row spacing

### Topic
Bidirectional relationship between panel count and row spacing.

### Summary of Request
User requested that modifying the number of panels also recalculates the row spacing.

### What Was Achieved
- **`onPanelCountChange(value)` now reverse-calculates row spacing** using the inverse of the plan formula: `d = (usableArea / (panelCount × W)) − H × cos(α)`. When the user increases panels, spacing shrinks; when they reduce panels, spacing grows.
- Template updated to call `onPanelCountChange($event)` on `(ngModelChange)` instead of the old no-op pattern.

### Full Prompt
"Nice but one more thing. I also want the calculation to be made for the row spacing when the number of panels is modified in the input field"

### Affected Files
- `client/src/app/features/user/add-project/add-project.component.ts` — `onPanelCountChange(value)` implements inverse formula
- `client/src/app/features/user/add-project/add-project.component.html` — `(ngModelChange)` calls `onPanelCountChange($event)`

### AI Reasoning
The forward formula is `maxPanels = floor(usableArea / (W × (H × cos(α) + d)))`. Solving algebraically for `d`: `d = (usableArea / (panelCount × W)) − H × cos(α)`. This makes the panel count ↔ row spacing relationship fully bidirectional while using the same underlying formula.

---

## 📅 March 8, 2026 - Git Line Ending Warning Fix (LF/CRLF)

### Topic
Resolved Git line-ending warning in Windows working copy by enforcing repository line-ending rules.

### Summary of Request
"Do it yourself please" (after asking how to fix warning: `LF will be replaced by CRLF the next time Git touches it`).

### What Was Achieved
- Added repository-level `.gitattributes` with `* text=auto eol=lf`.
- Applied local Git setting: `core.autocrlf=false` in this repository.
- Ran `git add --renormalize .` so Git re-indexes files according to the new policy.

### Full Prompt
"Do it yourself please"

### Affected Files
- `.gitattributes`
- `santi-agent-interactions.md`
- Re-indexed tracked text files due to normalization (no intentional logic changes).

### AI Reasoning
- A repo-level `.gitattributes` is the safest cross-platform fix because it makes line-ending behavior explicit and consistent for all contributors.
- `--renormalize` applies the policy immediately so future Git operations stop producing this warning.

---

## March 14, 2026 - Add Project Sticky Header Parity with Configure Mode

### Topic
Introduced a configure-style sticky header in `add-project` with consistent navigation actions and mode labeling, while preserving the existing add-project stepper flow.

### Summary of Request
User requested adding an exit button to add-project and replicating the configure-project sticky-header look/feel and logic so both flows can later converge into a single shared source of truth.

### What Was Achieved
- Replaced add-project top header navigation with configure-style sticky header structure:
  - Left actions: `Back` + `Exit Create Mode`
  - Center badge: `Create Mode`
  - Right action: dynamic `Next` / `Create Project`
- Wired `Exit Create Mode` to existing `onExit()` confirmation logic (no behavior regression).
- Added `stepNextLabel` computed signal to align CTA labeling logic with configure flow.
- Kept the existing add-project horizontal stepper row and all step-specific content/validation logic intact.
- Refactored add-project styles to use configure-style class names and responsive behavior for sticky header/nav groups.
- Ran client build validation successfully (`npm run build`), with only pre-existing warnings unrelated to this change.

### Full Prompt
"I want to include an exit button to the add-project component. And replicate what we did for the configure-project component (in terms of look and feel and all of that. I want the same thing, but including the stepper that we currently have on the add-project component). How would you do that?"

"Good. The idea is also to copy the look and feel + logic so that we can later create only one source of truth for this component (sticky-header). You can start implementing it"

### Affected Files
- `client/src/app/features/user/add-project/add-project.component.html`
- `client/src/app/features/user/add-project/add-project.component.ts`
- `client/src/app/features/user/add-project/add-project.component.scss`
- `santi-agent-interactions.md`

### AI Reasoning
Using the same structural classes and interaction pattern as `configure-project` creates immediate visual/behavior parity and makes a later extraction to a shared sticky-header component straightforward. Reusing existing `onExit()` confirmation logic avoided introducing duplicate leave-flow logic while still matching expected UX.

---

## March 15, 2026 - Role-Switch Navigation Flicker Reduction in User Layout

### Topic
Reduced animation glitches when switching between user/admin-role-related tabs by narrowing route transition scope and removing broad `transition: all` usage in dock controls.

### Summary of Request
User reported a visual glitch while switching between role-management-related tabs and approved applying the minimal, targeted fix.

### What Was Achieved
- Scoped global route transition rule to routed page content containers instead of applying it to every element adjacent to a `router-outlet`.
- Replaced broad `transition: all` in user dock controls with explicit property transitions:
  - `.dock-toggle`: `background-color`, `color`, `transform`
  - `.dock-item`: `background-color`, `color`, `box-shadow`
- Preserved existing UX behavior while reducing unintended layout/paint transitions during navigation.

### Full Prompt
"I am having an issue with animations when switching in between tabs that have role management (admin/user)."

"Okk, lets do that"

### Affected Files
- `client/src/styles.scss`
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `santi-agent-interactions.md`

### AI Reasoning
The global selector `router-outlet + *` can animate layout host elements (including `app-user-layout`) during route swaps, which creates visible flicker when protected/admin views switch. Restricting animation to routed content containers and replacing `transition: all` with explicit properties removes most accidental animations without requiring a larger routing refactor.

---

## March 15, 2026 - Panels Route Unified Under Projects Shell

### Topic
Reduced navigation remount/jank by moving panel list navigation into the existing `projects` route tree and preserving legacy URL compatibility.

### Summary of Request
User approved the follow-up change to unify panel navigation under the same shell used for other protected user/admin pages.

### What Was Achieved
- Added `projects` child route `panels` that loads `PanelListComponent` under the same protected user layout shell.
- Replaced the separate top-level protected `panels` route tree with compatibility redirects:
  - `/panels` -> `/projects/panels`
  - `/panels/all` -> `/projects/panels`
- Updated dock navigation item path from `/panels/all` to `/projects/panels`.
- Kept active matching compatible with both new and legacy path prefixes.

### Full Prompt
"Do that"

### Affected Files
- `client/src/app/app.routes.ts`
- `client/src/app/layouts/user-layout/user-layout.component.ts`
- `santi-agent-interactions.md`

### AI Reasoning
Using one protected route shell for dashboards, projects, settings, and panels avoids switching between separate top-level layout trees during tab navigation. That reduces visual remount effects and makes transitions between role-related sections feel stable while still honoring old links via redirects.

---

## April 1, 2026 - Add-Project Stepper Label Font Weight Increase

### Topic
Made add-project stepper step names bolder to improve readability and visual emphasis.

### Summary of Request
User requested modifying the stepper name steps so they use a bolder font.

### What Was Achieved
- Updated the add-project stepper label style to use a stronger font weight.
- Applied the change directly to `.step-label-wrap` so all step names render bolder consistently.
- Validated edited stylesheet diagnostics: no errors in the changed file.

### Full Prompt
"Modify the stepper name steps so that they use a bolder version of the font"

### Affected Files
- `client/src/app/features/user/add-project/add-project.component.scss`
- `santi-agent-interactions.md`

### AI Reasoning
The step labels are rendered via `.step-label-wrap` in the add-project custom stepper. Setting `font-weight: 700` at that selector is the smallest safe change that increases emphasis without affecting step layout or interaction logic.

---

## 📅 April 15, 2026 - Priority 2 Data Display & Nightly Refresh Scheduler (2.1, 2.2, 2.3)

### Topic
Implemented Priority 2 tasks: production charts in the project detail view, production breakdown on the user dashboard, and the nightly Solcast refresh scheduler.

### Summary of Request
User requested implementation of tasks 2.1 through 2.3 from the deferred features implementation plan (`IMPL_PLAN_DEFERRED_FEATURES.md`). These tasks depend on Priority 1 data already being present in the database.

### What Was Achieved

#### 2.1 Project Detail View — Production Charts & Solar Data
- Added three Highcharts charts (using the pre-installed `highcharts` + `highcharts-angular` packages) to the project view mode (`configure-project` component):
  - **Today's hourly production** — column chart from `prodToday`, amber-colored, showing hour-by-hour kWh
  - **Next 6 days forecast** — bar chart from `nextProd`, green-colored, showing daily kWh forecasts
  - **Past 6 days estimates** — bar chart from `previousProd`, indigo-colored, showing daily estimated actuals
- Added **economic value card** computed from `sum(prodToday.pv + previousProd.pv) × project.price`, displayed with local currency symbol
- All charts are guarded behind `hasProductionData()` and only visible in view mode
- Added `HighchartsChartModule` to component imports; `Highcharts` exposed as a class property for the template binding

#### 2.2 User Dashboard — Production Breakdown
- Extended `DashboardStats` interface on both server (`project.types.ts`) and client (`project.model.ts`) with three new fields: `todayProduction`, `next6DaysTotal`, `past6DaysTotal`
- Updated `getUserDashboard()` and `getAdminDashboard()` in `project.service.ts` to aggregate production arrays across all user projects
- Added three new stat cards to `dashboard.component.html` in a "Production Overview" section, only rendered when at least one value is > 0

#### 2.3 Nightly Production Refresh Scheduler
- Added `totalProd?: number` field to `IProject` and `ProjectSchema` (server-side accumulator for lifetime kWh)
- Installed `node-schedule` + `@types/node-schedule` in the server
- Created `server/src/services/scheduler.service.ts` with:
  - `initializeScheduler()` — loads all projects and registers jobs on startup
  - `scheduleProjectJob(project)` — registers a cron job at 03:47 AM in the project's local timezone
  - `cancelProjectJob(projectId)` — cancels a job (to call on project deletion)
- Added `refreshProductionData(projectId)` public method to `ProjectService` that re-fetches Solcast data, overwrites the prod arrays, and increments `totalProd` via `$inc`
- Wired `initializeScheduler()` into `server.ts` after DB connection is established
- Updated `transformProjectToResponse` to include `totalProd` in the API response

### Full Prompt
"Follow the implementation plan detailed in the markdown file I am passing you as context. Since most of these implementations are big, I would like you to take on the priority two tasks in this chat (2.1 - 2.3), not more than that. We have already implemented the priority one features in another chat."

### Affected Files
- `server/src/models/project.model.ts` — added `totalProd` field
- `server/src/types/project.types.ts` — added `totalProd` to `ProjectResponse`, added 3 production fields to `DashboardStats`
- `server/src/services/project.service.ts` — updated `transformProjectToResponse`, `getUserDashboard`, `getAdminDashboard`; added `refreshProductionData()` public method
- `server/src/services/scheduler.service.ts` — new file, nightly scheduler
- `server/src/server.ts` — registered `initializeScheduler()` on startup
- `client/src/app/core/models/project.model.ts` — added `ProductionPoint` interface, typed prod arrays in `ProjectResponse`, extended `DashboardStats`
- `client/src/app/core/models/index.ts` — exported `ProductionPoint`
- `client/src/app/features/user/configure-project/configure-project.component.ts` — added `HighchartsChartModule`, chart computed signals, `economicValue` signal
- `client/src/app/features/user/configure-project/configure-project.component.html` — added charts section (view mode only) and economic value card
- `client/src/app/features/user/configure-project/configure-project.component.scss` — added chart and economic card styles
- `client/src/app/features/user/dashboard/dashboard.component.ts` — extended `DashboardData` interface
- `client/src/app/features/user/dashboard/dashboard.component.html` — added Production Overview section with 3 stat cards

### AI Reasoning
**2.1:** `highcharts-angular` was already installed, so no new packages were needed on the frontend. Charts are computed signals using `projectData()` directly — no extra HTTP calls. The charts section is conditional on `hasProductionData()` and `isViewMode()` to avoid cluttering the edit flow.

**2.2:** The dashboard service method already loads all projects with populated panels; extending it with `.reduce()` over the `prodToday/nextProd/previousProd` arrays is O(n) with no additional DB queries. The 3 new stat cards are conditionally rendered so they don't appear as empty zeros for projects without Solcast data yet.

**2.3:** The scheduler uses `node-schedule` (as specified in the plan, matching v1.0). The timezone-aware cron (`{ hour: 3, minute: 47, tz }`) ensures each project fires at 3:47 AM local time regardless of the server's timezone. `refreshProductionData` is a public method on the existing `ProjectService` singleton — no new class instantiation needed. The `$inc: { totalProd: todaySum }` is an atomic MongoDB operation that safely accumulates production even under concurrent conditions.
