# Add-Project Full-Screen Wizard — Implementation Plan

**Date:** March 7, 2026  
**Status:** Approved — Ready for Implementation  
**Scope:** Full-screen multi-step project creation wizard + Cultivar backend entity

---

## 1. Overview

Transform the current single-page `AddProjectComponent` into a **full-screen multi-step wizard** that matches the design language of `ConfigureProjectComponent` (PrimeNG Stepper, step cards, metadata strip, same colour tokens). Introduce a new **Cultivar** backend entity to support agrivoltaic project types.

### Wizard Steps

| Step | Title | Content |
|------|-------|---------|
| **1** | Project Info | Name, description, project type toggle (Roof / Agrivoltaic) |
| **2** | Location & Area | Map + search bar + polygon feedback + energy price + country/timezone auto-detection |
| **3a** | Roof Configuration | Panel selector, optimal config, row spacing auto-calc + max panel warning, 3D placeholder |
| **3b** | Agrivoltaic Configuration | Same as 3a + cultivar selector, mounting height badge, crop-aware recommendations, 3D placeholder |
| **4** | Review | Full summary of all configuration → Submit |

---

## 2. Full-Screen Layout (No Header / No Footer)

### Routing Change — `app.routes.ts`

The `projects/add` route is moved **outside** the `UserLayoutComponent` children so no header or footer renders. It becomes a top-level protected route:

```typescript
// BEFORE — nested under UserLayoutComponent
{
  path: 'projects',
  loadComponent: () => import('./layouts/user-layout/user-layout.component')
    .then(m => m.UserLayoutComponent),
  canActivate: [authGuard],
  children: [
    { path: 'add', loadComponent: () => import('...add-project...') },
    // ...other children
  ]
}

// AFTER — add is a sibling, standalone full-screen route
{
  path: 'projects/add',                            // ← matches BEFORE the 'projects' group
  loadComponent: () => import('./features/user/add-project/add-project.component')
    .then(m => m.AddProjectComponent),
  canActivate: [authGuard],
  canDeactivate: [unsavedChangesGuard],            // ← NEW guard
},
{
  path: 'projects',
  loadComponent: () => import('./layouts/user-layout/user-layout.component')
    .then(m => m.UserLayoutComponent),
  canActivate: [authGuard],
  children: [ /* dashboard, all, :id, :id/configure — NO 'add' */ ]
}
```

**Why this works:** Angular evaluates routes top-to-bottom. `projects/add` matches first, loads the component without any wrapping layout. All other `/projects/*` routes still get the header/footer from `UserLayoutComponent`.

### Component Root Style

```scss
:host {
  display: block;
  width: 100vw;
  min-height: 100vh;
  background: #F0F7F4;
  overflow-y: auto;
}
```

The wizard has its own **minimal top bar** (logo icon + step indicator + exit button).

---

## 3. Exit / Abandon Guard

### 3.1 Exit Button

A `✕ Exit` button sits in the top-right of the wizard's minimal top bar. It appears on every step.

```
┌────────────────────────────────────────────────────┐
│  ☀ Solar Planner    Step 1 of 4       [✕ Exit]     │
└────────────────────────────────────────────────────┘
```

### 3.2 PrimeNG Confirmation Dialog

Clicking Exit (or clicking Back on Step 1) triggers a **PrimeNG ConfirmDialog**:

> **Leave project creation?**  
> Your progress will not be saved. Are you sure you want to exit?  
> `[Cancel]`  `[Leave]`

Implemented via `ConfirmationService` + `<p-confirmDialog>` inside the component.

### 3.3 Angular `canDeactivate` Guard

New file: `client/src/app/core/guards/unsaved-changes.guard.ts`

```typescript
export interface HasUnsavedWork {
  hasUnsavedWork(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedWork> = (component) => {
  if (component.hasUnsavedWork()) {
    return window.confirm('Your progress will not be saved. Are you sure you want to exit?');
  }
  return true;
};
```

Covers edge cases: browser back, URL change, history navigation.

### 3.4 Browser `beforeunload`

The component listens to `beforeunload` via `host: { '(window:beforeunload)': ... }` to catch tab close / page reload with the browser's native prompt.

### 3.5 `hasUnsavedWork()` Logic

Returns `true` if **any** of the following differ from initial state:
- `name` has a value
- `description` has a value
- A project type has been selected
- A polygon has been drawn
- A panel has been selected

---

## 4. New Entity: Cultivar

### 4.1 Purpose

A **Cultivar** describes a crop type that informs agrivoltaic panel installation. It provides constraints like minimum panel mounting height (so plants grow underneath), recommended row spacing (for farming equipment), and light needs (to determine panel tilt/spacing).

### 4.2 Mongoose Model — `server/src/models/cultivar.model.ts`

```typescript
export interface ICultivar {
  name: string;                   // "Corn", "Wheat", "Lettuce"
  category: string;               // "cereal" | "vegetable" | "fruit" | "legume" | "other"
  minPanelHeight: number;         // Min mounting height above ground (meters)
  maxPanelHeight: number;         // Max recommended mounting height (meters)
  lightRequirement: string;       // "full-sun" | "partial-shade" | "shade-tolerant"
  recommendedSpacing: number;     // Min row spacing for crop access (meters)
  optimalTiltReduction: number;   // Degrees to reduce tilt vs roof (0–45)
  notes?: string;                 // Free-form notes about the crop
  createdAt: Date;
  updatedAt: Date;
}
```

**Mongoose Schema highlights:**
- `name` — required, trimmed, unique index
- `category` — required, enum: `['cereal', 'vegetable', 'fruit', 'legume', 'other']`
- `minPanelHeight` — required, min 0
- `maxPanelHeight` — required, min 0, must be ≥ `minPanelHeight`
- `lightRequirement` — required, enum: `['full-sun', 'partial-shade', 'shade-tolerant']`
- `recommendedSpacing` — required, positive number
- `optimalTiltReduction` — required, 0–45 degrees

**Indexes:**
```typescript
CultivarSchema.index({ category: 1 });
CultivarSchema.index({ name: 'text' });
```

### 4.3 Zod Schema — `server/src/schemas/cultivar.schema.ts`

```typescript
export const CultivarCreateSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['cereal', 'vegetable', 'fruit', 'legume', 'other']),
  minPanelHeight: z.number().nonnegative(),
  maxPanelHeight: z.number().nonnegative(),
  lightRequirement: z.enum(['full-sun', 'partial-shade', 'shade-tolerant']),
  recommendedSpacing: z.number().positive(),
  optimalTiltReduction: z.number().min(0).max(45),
  notes: z.string().optional(),
}).refine(d => d.maxPanelHeight >= d.minPanelHeight, {
  message: 'maxPanelHeight must be >= minPanelHeight',
  path: ['maxPanelHeight'],
});

export const CultivarUpdateSchema = CultivarCreateSchema.partial();

export const CultivarQuerySchema = z.object({
  category: z.enum(['cereal', 'vegetable', 'fruit', 'legume', 'other']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

### 4.4 Types — `server/src/types/cultivar.types.ts`

```typescript
export interface CultivarResponse {
  _id: string;
  name: string;
  category: string;
  minPanelHeight: number;
  maxPanelHeight: number;
  lightRequirement: string;
  recommendedSpacing: number;
  optimalTiltReduction: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CultivarListResponse {
  data: CultivarResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### 4.5 Service — `server/src/services/cultivar.service.ts`

Standard CRUD following the Panel pattern:
- `createCultivar(data)` — admin only
- `getCultivarById(id)`
- `listCultivars(filters)`
- `updateCultivar(id, data)` — admin only
- `deleteCultivar(id)` — admin only

### 4.6 Controller — `server/src/controllers/cultivar.controller.ts`

Standard controller with `asyncHandler` wrappers and `success()` response utility.

### 4.7 Routes — `server/src/routes/cultivar.routes.ts`

| Method | Route | Handler | Auth |
|--------|-------|---------|------|
| `GET` | `/api/cultivars` | `listCultivars` | User |
| `GET` | `/api/cultivars/:id` | `getCultivarById` | User |
| `POST` | `/api/cultivars` | `createCultivar` | Admin |
| `PUT` | `/api/cultivars/:id` | `updateCultivar` | Admin |
| `DELETE` | `/api/cultivars/:id` | `deleteCultivar` | Admin |

Registered in `server/src/routes/index.ts` as `router.use('/cultivars', cultivarRoutes)`.

---

## 5. Project Entity Changes (Cultivar Integration)

### 5.1 New Fields on Project

| Field | Type | Required | When Used |
|-------|------|----------|-----------|
| `projectType` | `'roof' \| 'agrivoltaic'` | **Yes** (at create) | Always — determines which Step 3 to show |
| `description` | `string` (max 500) | No | Step 1 — freeform project description |
| `cultivar` | `ObjectId` ref → Cultivars | No | Only when `projectType === 'agrivoltaic'` |

### 5.2 Server-Side Changes

#### `server/src/models/project.model.ts` — IProject additions

```typescript
projectType: 'roof' | 'agrivoltaic';   // NEW — required
description?: string;                   // NEW — optional
cultivar?: mongoose.Types.ObjectId;     // NEW — ref to Cultivars
```

Mongoose schema additions:

```typescript
projectType: {
  type: String,
  enum: ['roof', 'agrivoltaic'],
  required: true,
  default: 'roof',
},
description: {
  type: String,
  trim: true,
  maxlength: 500,
},
cultivar: {
  type: Schema.Types.ObjectId,
  ref: 'Cultivars',
},
```

#### `server/src/schemas/project.schema.ts` — ProjectCreateSchema additions

```typescript
projectType: z.enum(['roof', 'agrivoltaic']),
description: z.string().max(500).optional(),
cultivarId: z.string().optional(),
```

Business rule enforced in service layer:
- If `projectType === 'agrivoltaic'` and `cultivarId` provided → validate cultivar exists
- If `projectType === 'roof'` → ignore `cultivarId`

#### `server/src/schemas/project.schema.ts` — ProjectUpdateSchema additions

```typescript
projectType: z.enum(['roof', 'agrivoltaic']).optional(),
description: z.string().max(500).optional(),
cultivarId: z.string().optional(),
```

#### `server/src/types/project.types.ts` — ProjectResponse additions

```typescript
projectType: 'roof' | 'agrivoltaic';
description?: string;
cultivar?: string | object;
```

#### `server/src/services/project.service.ts` — createProject changes

```typescript
async createProject(userId: string, data: ProjectCreateInput): Promise<ProjectResponse> {
  // Existing: validate panel exists (if panelId provided)
  
  // NEW: validate cultivar exists (if agrivoltaic + cultivarId provided)
  if (data.projectType === 'agrivoltaic' && data.cultivarId) {
    const cultivar = await CultivarModel.findById(data.cultivarId);
    if (!cultivar) throw new Error('Cultivar not found');
  }

  const project = await ProjectModel.create({
    ...data,
    panel: data.panelId,
    cultivar: data.cultivarId,       // NEW
    owner: userId,
  });
  
  return transformProjectToResponse(project);
}
```

`transformProjectToResponse()` gains:

```typescript
projectType: project.projectType,
description: project.description,
cultivar: project.cultivar?._id?.toString(),
```

### 5.3 Client-Side Changes

#### `client/src/app/core/models/cultivar.model.ts` — NEW

```typescript
export interface Cultivar {
  _id?: string;
  id: string;
  name: string;
  category: 'cereal' | 'vegetable' | 'fruit' | 'legume' | 'other';
  minPanelHeight: number;
  maxPanelHeight: number;
  lightRequirement: 'full-sun' | 'partial-shade' | 'shade-tolerant';
  recommendedSpacing: number;
  optimalTiltReduction: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CultivarListResponse {
  data: Cultivar[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### `client/src/app/core/services/cultivar.service.ts` — NEW

```typescript
@Injectable({ providedIn: 'root' })
export class CultivarService {
  getAllCultivars(page, limit): Observable<CultivarListResponse>
  getCultivarById(id): Observable<Cultivar>
}
```

#### `client/src/app/core/models/project.model.ts` — ProjectCreateRequest changes

```typescript
export interface ProjectCreateRequest {
  name: string;
  description?: string;                          // NEW
  projectType: 'roof' | 'agrivoltaic';           // NEW
  area: GeoPoint[];
  tilt: number;
  direction: string;
  panelNumber: number;
  panelId?: string;
  rawSpacing?: number;
  cultivarId?: string;                           // NEW — only for agrivoltaic
}
```

#### `client/src/app/core/models/index.ts`

Add exports for `Cultivar` and `CultivarListResponse`.

---

## 6. Row Spacing Auto-Calculation, Max Panels & Warnings

### 6.1 Row Spacing Formula

Row spacing is calculated to prevent shadow overlap between rows:

```
d = L × sin(α) / tan(β)
```

Where:
- `d` = minimum row spacing (meters)
- `L` = panel height (meters, from panel dimensions)
- `α` = tilt angle (degrees)
- `β` = winter solstice noon sun elevation = `90° − latitude − 23.45°`

### 6.2 Maximum Panel Calculation

Given the drawn polygon area and selected panel:

```
panelFootprint = W × (H × cos(α) + d)
```

Where:
- `W` = panel width (m)
- `H` = panel height (m)
- `α` = tilt (°)
- `d` = row spacing (m)

Then:

```
maxPanels = floor(usableArea / panelFootprint)
```

Where `usableArea = polygonSurface × utilizationFactor`:
- **Roof**: 0.85
- **Agrivoltaic**: 0.70 (machinery lanes)

### 6.3 Warning System

| Condition | Severity | Message |
|-----------|----------|---------|
| `panelNumber > maxPanels` | `warn` | "Max recommended panels for this area is **{maxPanels}**. Exceeding this may cause overlap or insufficient spacing." |
| `rowSpacing < 0.6m` (roof) | `warn` | "Row spacing below 0.6m — insufficient for maintenance access." |
| `rowSpacing < cultivar.recommendedSpacing` (agrivoltaic) | `warn` | "Row spacing below {crop} requirement of {X}m — machinery/growth access compromised." |
| `rowSpacing < calculated shadow distance` | `info` | "Panels may cast shadows on adjacent rows at winter solstice noon." |

### 6.4 Behavior Flow

1. User selects panel + polygon exists → **auto-calculate** optimal config via server `calculateOptimalConfig` endpoint
2. Client-side computes `maxPanels` from the formula above for the warning threshold
3. `recommendedPanels` comes from the server's optimal config response
4. User can manually increase panel count beyond recommended → warnings appear
5. When user changes panel count → row spacing recalculates dynamically
6. **"Reset to Optimal" button** restores `panelNumber = recommendedPanels` and `rowSpacing = auto-calculated value`

### 6.5 Agrivoltaic Adjustments

When a cultivar is selected:
- Tilt reduced by `cultivar.optimalTiltReduction` degrees from default
- Row spacing floor = `max(shadowSpacing, cultivar.recommendedSpacing)`
- Max panels recalculated with agrivoltaic utilization factor (0.70)
- Mounting height badge: `"{cultivar.minPanelHeight}m – {cultivar.maxPanelHeight}m recommended"`

These are **recommendations**, not locks. The user can override any value.

---

## 7. UI Structure Per Step

### Step 1 — Project Info

```
┌────────────────────────────────────────────────────┐
│  ☀ Solar Planner    Step 1 of 4       [✕ Exit]     │  ← minimal top bar
├────────────────────────────────────────────────────┤
│  ● Step 1 ─── ○ Step 2 ─── ○ Step 3 ─── ○ Step 4 │  ← PrimeNG Stepper
├────────────────────────────────────────────────────┤
│                                                    │
│   Project Name   [__________________________ ]     │
│                                                    │
│   Description    [ Optional description...    ]    │
│                                                    │
│   Installation Type                                │
│   ┌─────────────────┐  ┌─────────────────────┐    │
│   │  🏠 Roof        │  │  🌾 Agrivoltaic     │    │
│   │  Mounting       │  │  Installation        │    │
│   │  [selected]     │  │                      │    │
│   └─────────────────┘  └─────────────────────┘    │
│                                                    │
│                               [ Next → ]           │
└────────────────────────────────────────────────────┘
```

### Step 2 — Location & Area

```
┌────────────────────────────────────────────────────┐
│  [← Back]   Step 2 of 4: Location       [Next →]  │
├────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │  Search: [_________________________] [🔍]    │  │
│  │  ┌──────────────────────────────────────────┐│  │
│  │  │                                          ││  │
│  │  │              MAP + POLYGON               ││  │
│  │  │                                          ││  │
│  │  └──────────────────────────────────────────┘│  │
│  │  ✓ Polygon defined with 5 points             │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌─ Tags: [🌍 Spain] [🕐 UTC+1] ─────────────┐   │
│  │  Currency: [EUR €]  Energy Price: [0.15/kWh]│   │
│  └─────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

### Step 3a — Roof Configuration (2×2 grid)

```
┌────────────────────────────────────────────────────┐
│  [← Back]  Step 3 of 4: Configuration   [Next →]  │
├────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────┐  │
│  │ ☀ Panel & Install   │ │ ⚡ Capacity Preview  │  │
│  │ Panel: [Select ▾]   │ │ Selected: JA Solar  │  │
│  │ Panels: [24 ▴▾]     │ │ Power: 450W         │  │
│  │ Tilt: [30° ▴▾]      │ │ Panels: 24          │  │
│  │ Direction: [South ▾]│ │ Capacity: 10.8 kW   │  │
│  │ Row Spacing: [1.2m] │ │ Production: 14,200  │  │
│  │                     │ │ Coverage: 82%        │  │
│  │ ⚠ Max recommended   │ │                     │  │
│  │   panels: 28        │ │ [🔄 Reset Optimal]  │  │
│  └─────────────────────┘ └─────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  🧊 3D Installation View   [Coming Soon]    │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Step 3b — Agrivoltaic (adds cultivar card to the same grid)

Same layout as 3a. The Panel & Install card also includes:
- **Cultivar selector** dropdown
- **Mounting Height badge**: `"2.5m – 4.0m recommended for Corn"`
- Agrivoltaic-specific warnings (row spacing for crop, utilization factor)

### Step 4 — Review

```
┌────────────────────────────────────────────────────┐
│  [← Back]  Step 4 of 4: Review     [Create ✓]     │
├────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ 📝 Project Info  │  │ 📍 Location & Area   │   │
│  │ Name: My Farm    │  │ Country: Spain        │   │
│  │ Type: Agrivoltaic│  │ Coords: 40.71, -3.70 │   │
│  │ Desc: ...        │  │ Polygon: 5 points     │   │
│  │            [edit] │  │ Price: 0.15/kWh [edit]│   │
│  └──────────────────┘  └──────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ ☀ Panel Setup    │  │ ⚡ Capacity           │   │
│  │ Panel: JA 450    │  │ Capacity: 10.8 kW    │   │
│  │ Panels: 24       │  │ Production: 14,200   │   │
│  │ Tilt: 20°        │  │ Coverage: 70%        │   │
│  │ Spacing: 3.0m    │  │                      │   │
│  │ Cultivar: Corn   │  │                      │   │
│  │            [edit] │  │                      │   │
│  └──────────────────┘  └──────────────────────┘   │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  ☀ Total Capacity: 10.8 kW                  │  │  ← yellow highlight card
│  └──────────────────────────────────────────────┘  │
│                                                    │
│                         [ Create Project ✓ ]       │
└────────────────────────────────────────────────────┘
```

---

## 8. Entity Relationship After Changes

```
 Users ◄──── Projects ────► Panels
                │
                └──────────► Cultivars (optional, agrivoltaic only)
```

---

## 9. Data Flow — Agrivoltaic Project Creation

```
Step 1: User enters name, description
        Selects projectType = "agrivoltaic"
                         │
Step 2: Draws polygon → area[]
        Searches location → country auto-detected
        Sets energy price
                         │
Step 3b (agrivoltaic):
    ├─ Select panel → panelId
    ├─ Select cultivar → cultivarId
    │   └─ Apply cultivar recommendations:
    │       tilt -= optimalTiltReduction
    │       spacing = max(calculated, recommendedSpacing)
    │       Show minPanelHeight..maxPanelHeight badge
    ├─ Calculate optimal config → recommendedPanels, maxPanels
    ├─ Row spacing auto-calc with warnings
    ├─ User can override → warnings shown
    ├─ "Reset to Optimal" button available
    └─ 3D placeholder
                         │
Step 4: Review all config → Submit

  POST /api/projects {
    name, description, projectType: "agrivoltaic",
    area, tilt, direction, panelNumber, panelId,
    rawSpacing, cultivarId
  }
```

---

## 10. File Impact Summary

### New Files (9)

| File | Purpose |
|------|---------|
| `server/src/models/cultivar.model.ts` | Mongoose model + ICultivar interface |
| `server/src/schemas/cultivar.schema.ts` | Zod validation schemas |
| `server/src/types/cultivar.types.ts` | TypeScript response types |
| `server/src/services/cultivar.service.ts` | Business logic CRUD |
| `server/src/controllers/cultivar.controller.ts` | HTTP handlers |
| `server/src/routes/cultivar.routes.ts` | Express routes |
| `client/src/app/core/models/cultivar.model.ts` | Client Cultivar interface |
| `client/src/app/core/services/cultivar.service.ts` | Angular HTTP service |
| `client/src/app/core/guards/unsaved-changes.guard.ts` | canDeactivate guard |

### Modified Files (9)

| File | Changes |
|------|---------|
| `client/src/app/app.routes.ts` | Move `projects/add` out of layout children → standalone full-screen route + add `canDeactivate` |
| `client/src/app/features/user/add-project/add-project.component.ts` | Full rewrite as fullscreen multi-step wizard |
| `client/src/app/core/models/project.model.ts` | Add `description`, `projectType`, `cultivarId` to `ProjectCreateRequest` + `ProjectResponse` |
| `client/src/app/core/models/index.ts` | Export cultivar models |
| `client/src/app/core/guards/index.ts` | Export `unsavedChangesGuard` |
| `server/src/routes/index.ts` | Register `/cultivars` routes |
| `server/src/models/project.model.ts` | Add `projectType`, `description`, `cultivar` fields to IProject + Mongoose schema |
| `server/src/schemas/project.schema.ts` | Add new fields to ProjectCreateSchema + ProjectUpdateSchema |
| `server/src/types/project.types.ts` | Add new fields to ProjectResponse |
| `server/src/services/project.service.ts` | Validate cultivar, pass new fields, transform in response |

### Interaction Log

| File | Action |
|------|--------|
| `santi-agent-interactions.md` | Append entry for this session |
