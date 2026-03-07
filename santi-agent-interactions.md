# Solar Planner v2 - AI Agent Development Log

This document tracks all significant development work performed using AI assistance, serving as a development journal and knowledge base.

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
