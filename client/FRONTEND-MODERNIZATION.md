# Angular Solar Panel Project Management System - Detailed Implementation Prompt

## Overview
Build a complete Angular 21 application for managing solar panel projects with TypeScript 5.9, featuring a projects list view, detailed project view with map integration, and 3D visualization capabilities. This is part of a MEAN stack application (MongoDB, Express, Angular, Node.js).

---

## 1. COLOR PALETTE & DESIGN SYSTEM

### Light Mode Palette
| Element | Hex Code | Usage |
|---------|----------|-------|
| Main Background | `#F0F7F4` | Page backgrounds, main content areas |
| Primary Text | `#081C15` | Headings, primary content text |
| Brand Color | `#1B4332` | Sidebars, headers, structural elements |
| Primary Action | `#2D6A4F` | Primary buttons (Calculate, Save, Create) |
| Solar Accent | `#FFD600` | Sun icons, energy indicators, highlights |
| Technical Detail | `#219EBC` | Climate data, water indicators |
| Secondary Text | `#1B4332` | Descriptions, secondary content |
| Card Borders | `#B7E4C7` | Soft borders for cards and containers |

### Dark Mode Palette (for dark sections/future use)
| Element | Hex Code | Usage |
|---------|----------|-------|
| Main Background | `#081C15` | Dark background (obsidian green) |
| Surfaces/Cards | `#1B4332` | Elevated elements above background |
| Primary Text | `#B7E4C7` | Comfortable reading text |
| Solar Accent | `#FFD600` | With glow effect |
| Active States | `#40916C` | Selection borders, "on" states |
| Data/Tech | `#48CAE4` | Performance charts |

### Design Principles
1. **Border Radius:** Use very rounded corners (`border-radius: 24px` or `1.5rem`) to evoke organic nature shapes
2. **Hierarchy:** Always use Green as structural color. Yellow is the "energy spark" - never use as large backgrounds
3. **Contrast:** Text on Yellow buttons must be black (`#000000`)
4. **Glow Effects:** In dark sections, Yellow elements should have: `box-shadow: 0 0 15px rgba(255, 214, 0, 0.4)`
5. **Spacing:** Use generous padding (24px-48px) for breathing room
6. **Typography:** Bold headings with Green colors, comfortable body text

---

## 2. ROUTING STRUCTURE

Implement Angular Router with the following routes:

```typescript
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'projects', component: ProjectsListComponent },
  { path: 'projects/:id', component: ProjectDetailComponent },
  { path: 'about', component: AboutComponent },
  { path: '**', component: NotFoundComponent }
];
```

---

## 3. DATA MODELS (TypeScript Interfaces)

### Project Interface
```typescript
export interface Project {
  id: string;
  name: string;
  location: string;
  createdAt: string; // ISO date string
  panels: number;
  power: number; // in kW
  status: 'planning' | 'active' | 'completed';
  area?: number; // in m²
  panelType?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  configuration?: {
    inclination: number; // degrees
    orientation: string; // N, S, E, W, NE, etc.
    bifacial: boolean;
    technology: string;
  };
  estimatedOutput?: number; // kWh/year
  efficiency?: number; // percentage
}
```

### Mock Data (for development)
Create a service that provides this mock data:

```typescript
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Residential Solar Installation',
    location: 'Barcelona, Spain',
    createdAt: '2024-01-15T10:30:00Z',
    panels: 24,
    power: 8.4,
    status: 'active',
    area: 250,
    panelType: 'Monocrystalline',
    dimensions: { width: 1.7, height: 1.0 },
    configuration: {
      inclination: 30,
      orientation: 'South',
      bifacial: true,
      technology: 'Monocrystalline'
    },
    estimatedOutput: 12500,
    efficiency: 80
  },
  {
    id: '2',
    name: 'Agrivoltaic Farm Project',
    location: 'Valencia, Spain',
    createdAt: '2024-02-20T14:15:00Z',
    panels: 120,
    power: 42.0,
    status: 'planning',
    area: 1200,
    panelType: 'Polycrystalline',
    dimensions: { width: 1.7, height: 1.0 },
    configuration: {
      inclination: 25,
      orientation: 'South',
      bifacial: false,
      technology: 'Polycrystalline'
    },
    estimatedOutput: 58000,
    efficiency: 75
  },
  {
    id: '3',
    name: 'Commercial Building Setup',
    location: 'Madrid, Spain',
    createdAt: '2023-11-10T09:00:00Z',
    panels: 48,
    power: 16.8,
    status: 'completed',
    area: 500,
    panelType: 'Monocrystalline',
    dimensions: { width: 1.7, height: 1.0 },
    configuration: {
      inclination: 35,
      orientation: 'South-East',
      bifacial: true,
      technology: 'Monocrystalline'
    },
    estimatedOutput: 22000,
    efficiency: 82
  }
];
```

---

## 4. PROJECTS LIST PAGE - DETAILED SPECIFICATIONS

### Component: ProjectsListComponent

#### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ HEADER SECTION                                          │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Left Side:                                        │   │
│ │   - Title: "My Projects" (text-4xl, bold)        │   │
│ │   - Subtitle: "Manage your solar panel           │   │
│ │     installations" (text-gray-600)               │   │
│ │                                                   │   │
│ │ Right Side:                                       │   │
│ │   - Button: "+ New Project"                      │   │
│ │     (bg: #2D6A4F, rounded-3xl, with icon)       │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ CARDS GRID (3 columns on desktop, 2 on tablet, 1 mobile)│
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│ │ Card 1  │  │ Card 2  │  │ Card 3  │                  │
│ │         │  │         │  │         │                  │
│ └─────────┘  └─────────┘  └─────────┘                  │
└─────────────────────────────────────────────────────────┘
```

#### Project Card Component Design

**Visual Structure:**
```
┌───────────────────────────────────────┐
│ 🌟 THUMBNAIL SECTION (height: 192px) │
│   Background: gradient                │
│   from-amber-100 to-orange-100        │
│   Content: Large Zap icon centered   │
│           (size: 80px, color: #FFD600)│
│           Opacity: 20%                │
│           Scale on hover: 110%        │
├───────────────────────────────────────┤
│ CONTENT SECTION (padding: 24px)      │
│                                       │
│ 📝 Project Name                       │
│    (font-semibold, text-xl,          │
│     color: #081C15)                  │
│    Hover: color changes to #2D6A4F   │
│                                       │
│ 📍 Location Icon + Text              │
│    (color: #1B4332, 14px)            │
│                                       │
│ 📅 Calendar Icon + Created Date      │
│    (formatted: "Jan 15, 2024")       │
│                                       │
│ ⚡ Zap Icon + Panel Info              │
│    "24 panels • 8.4kW"               │
│                                       │
│ ─────────────────────────────         │
│                                       │
│ 🏷️ Status Badge                      │
│    - Active: bg-green-100            │
│              text-green-800          │
│    - Planning: bg-blue-100           │
│                text-blue-800         │
│    - Completed: bg-gray-100          │
│                 text-gray-800        │
│    (rounded-full, padding: 4px 12px) │
└───────────────────────────────────────┘
```

#### CSS Requirements
- Card background: `#FFFFFF`
- Card border: `2px solid #B7E4C7`
- Border radius: `24px` (rounded-3xl)
- Shadow: `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`
- Hover shadow: `box-shadow: 0 4px 6px rgba(0,0,0,0.1)`
- Transition: `all 0.3s ease`
- Entire card is clickable and navigates to `/projects/:id`

#### Empty State (No Projects)
When `projects.length === 0`, display:
- Large Sun icon (64px, color: #CCCCCC) centered
- Heading: "No projects yet" (text-xl, semibold, color: #1B4332)
- Description: "Create your first solar panel project to get started"
- Button: "Create Project" (bg: #2D6A4F, text: white, rounded-3xl)

#### Loading State
Display a centered spinner:
- Size: 48px
- Border: 3px solid transparent
- Border-top: 3px solid #2D6A4F
- Animation: spin 1s linear infinite
- Centered vertically and horizontally

#### Error State
Display error message in a card:
- Background: rgba(254, 226, 226, 0.5) (red-50 with transparency)
- Border: 1px solid rgba(239, 68, 68, 0.5)
- Text color: #991B1B (red-800)
- Border radius: 12px
- Padding: 16px

---

## 5. PROJECT DETAIL PAGE - DETAILED SPECIFICATIONS

### Component: ProjectDetailComponent

#### Layout Structure
```
┌──────────────────────────────────────────────────────────┐
│ STICKY HEADER (bg: white, border-bottom, z-index: 10)   │
│ ┌────────────────────────────────────────────────────┐   │
│ │ ← Back to Projects (clickable)                     │   │
│ │                                                     │   │
│ │ Project Name (h1, text-3xl, bold)                  │   │
│ │ 📍 Barcelona, Spain    ⚡ 24 panels • 8.4kW       │   │
│ │                                   [⚙️ Configure]   │   │
│ └────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│ MAIN CONTENT (2/3 width)    │ SIDEBAR (1/3 width)        │
│ ┌──────────────────────┐     │ ┌────────────────────┐    │
│ │ MAP SECTION          │     │ │ PROJECT DETAILS    │    │
│ │ (height: 384px)      │     │ │ - Total Area       │    │
│ │                      │     │ │ - Number of Panels │    │
│ └──────────────────────┘     │ │ - Total Power      │    │
│                              │ │ - Efficiency       │    │
│ ┌──────────────────────┐     │ │ - Estimated Output │    │
│ │ 3D VISUALIZATION     │     │ │ - Status           │    │
│ │ (height: 384px)      │     │ └────────────────────┘    │
│ │                      │     │                           │
│ └──────────────────────┘     │ ┌────────────────────┐    │
│                              │ │ PANEL CONFIG       │    │
│                              │ │ - Panel Type       │    │
│                              │ │ - Dimensions       │    │
│                              │ │ - Inclination      │    │
│                              │ │ - Orientation      │    │
│                              │ │ - Bifacial         │    │
│                              │ └────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

#### Header Section Specifications

**Back Button:**
- Icon: Left arrow (16px)
- Text: "Back to Projects"
- Color: #1B4332
- Hover color: #081C15
- Font size: 14px
- Margin bottom: 16px

**Project Title:**
- Font size: 36px (text-3xl)
- Font weight: bold
- Color: #081C15
- Margin bottom: 8px

**Metadata Row:**
- Display: flex, gap: 16px
- Color: #1B4332
- Font size: 14px
- Icons: 16px size, aligned with text

**Configure Button:**
- Background: #2D6A4F
- Text: white
- Padding: 12px 24px
- Border radius: 24px
- Font weight: semibold
- Icon: Settings gear (20px)
- Hover: background changes to #1B4332

#### Map Section Specifications

**Container:**
- Background: white
- Border: 2px solid #B7E4C7
- Border radius: 24px
- Padding: 24px
- Shadow: subtle (0 1px 3px rgba(0,0,0,0.1))

**Title:**
- "Installation Area"
- Font size: 20px (text-xl)
- Font weight: semibold
- Color: #081C15
- Margin bottom: 16px

**Map Placeholder (for now):**
- Height: 384px
- Background: linear-gradient from #D1FAE5 to #BFDBFE (green-100 to blue-100)
- Border radius: 12px
- Display: flex, center content
- Content: Map pin icon (64px, color: #9CA3AF)

**Future Integration Note:**
```
When implementing real map:
- Use Leaflet for Angular: ngx-leaflet
- Center map on project location coordinates
- Display drawn polygon for installation area
- Show draggable points for area adjustment
- Add markers for labeled objects (trees, buildings)
- Color: area polygon fill: rgba(45, 106, 79, 0.3)
- Border: 2px solid #2D6A4F
```

#### 3D Visualization Section Specifications

**Container:**
- Same styling as Map section
- Positioned below map with 24px gap

**Title:**
- "3D Visualization"
- Same typography as Map title

**3D Placeholder (for now):**
- Height: 384px
- Background: linear-gradient from #FEF3C7 to #FED7AA (amber-100 to orange-100)
- Border radius: 12px
- Display: flex, center content
- Content: Sun icon (64px, color: #9CA3AF)

**Future Integration Note:**
```
When implementing real 3D:
- Use Three.js with Angular: @angular-three/core or ng3
- Display solar panel array in 3D
- Allow rotation with mouse drag
- Show panel inclination angle
- Display orientation (compass indicator)
- Panel color: Dark blue (#1E40AF) for cells
- Frame color: Silver (#E5E7EB)
- Background: Sky blue gradient
- Add sun position indicator based on time/season
```

#### Sidebar - Project Details Card

**Card Styling:**
- Background: white
- Border: 2px solid #B7E4C7
- Border radius: 24px
- Padding: 24px
- Shadow: subtle

**Title:**
- "Project Details"
- Font size: 20px
- Font weight: semibold
- Color: #081C15
- Margin bottom: 16px

**Stat Item Structure:**
```
┌─────────────────────────────────┐
│ Label          Value             │
│ (color:       (font-semibold,    │
│  #1B4332)      color: #081C15)   │
├─────────────────────────────────┤
│ Total Area           250 m²      │
├─────────────────────────────────┤
│ Number of Panels     24          │
├─────────────────────────────────┤
│ Total Power          8.4 kW      │
├─────────────────────────────────┤
│ Efficiency           80%         │
├─────────────────────────────────┤
│ Estimated Output  12,500 kWh/year│
├─────────────────────────────────┤
│ Status              Active       │
└─────────────────────────────────┘
```

**Each Stat Item:**
- Display: flex, justify-content: space-between
- Padding: 8px 0
- Border bottom: 1px solid #F0F7F4
- Last item: no border

#### Sidebar - Panel Configuration Card

**Same card styling as Project Details**

**Title:**
- "Panel Configuration"

**Configuration Items (same structure as stats):**
- Panel Type: "Monocrystalline"
- Dimensions: "1.7m × 1.0m"
- Inclination: "30°"
- Orientation: "South"
- Bifacial: "Yes" or "No"

#### Loading & Error States
Same as Projects List page

---

## 6. ANGULAR SERVICE IMPLEMENTATION

### ProjectService

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:3000/api/projects'; // Your Express API
  
  constructor(private http: HttpClient) {}
  
  // For development with mock data:
  getProjects(): Observable<Project[]> {
    return of(MOCK_PROJECTS).pipe(delay(800)); // Simulate network delay
  }
  
  getProjectById(id: string): Observable<Project | null> {
    const project = MOCK_PROJECTS.find(p => p.id === id);
    return of(project || null).pipe(delay(500));
  }
  
  // When ready to connect to real API:
  // getProjects(): Observable<Project[]> {
  //   return this.http.get<Project[]>(this.apiUrl);
  // }
  //
  // getProjectById(id: string): Observable<Project> {
  //   return this.http.get<Project>(`${this.apiUrl}/${id}`);
  // }
  //
  // createProject(project: Omit<Project, 'id'>): Observable<Project> {
  //   return this.http.post<Project>(this.apiUrl, project);
  // }
  //
  // updateProject(id: string, updates: Partial<Project>): Observable<Project> {
  //   return this.http.patch<Project>(`${this.apiUrl}/${id}`, updates);
  // }
  //
  // deleteProject(id: string): Observable<void> {
  //   return this.http.delete<void>(`${this.apiUrl}/${id}`);
  // }
}
```

---

## 7. RESPONSIVE DESIGN REQUIREMENTS

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Projects List Page
- **Mobile:** 1 column grid, full width cards
- **Tablet:** 2 column grid
- **Desktop:** 3 column grid
- Header: Stack title and button on mobile

### Project Detail Page
- **Mobile:** 
  - Stack sidebar below main content
  - Full width sections
  - Reduce map/3D height to 256px
- **Tablet:** 
  - Keep 2/3 + 1/3 layout
  - Reduce padding slightly
- **Desktop:** 
  - Full layout as specified
  - Max width: 1280px (max-w-7xl)

---

## 8. ICONS REQUIREMENTS

Use Angular Material Icons or a similar icon library. Required icons:

- **Sun:** For solar/energy indicators
- **Zap/Lightning:** For power/energy
- **MapPin/Location:** For location data
- **Calendar:** For dates
- **Settings/Gear:** For configuration
- **Plus:** For add/create actions
- **ArrowLeft:** For back navigation
- **TrendingUp:** For growth/efficiency
- **Shield:** For protection/quality

Icon colors:
- Primary actions: #2D6A4F
- Solar/energy: #FFD600
- Neutral: #1B4332
- Disabled: #9CA3AF

---

## 9. ANIMATIONS & INTERACTIONS

### Card Hover Effects
```css
.project-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.project-card:hover h3 {
  color: #2D6A4F;
}

.project-card:hover .icon {
  transform: scale(1.1);
}
```

### Button Hover Effects
```css
.btn-primary {
  transition: background-color 0.3s ease, transform 0.1s ease;
}

.btn-primary:hover {
  background-color: #1B4332;
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
}
```

### Loading Spinner
```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### Page Transitions
- Fade in on route change: 300ms
- Stagger card animations: Each card delays by 50ms

---

## 10. ACCESSIBILITY REQUIREMENTS

1. **Semantic HTML:** Use proper heading hierarchy (h1, h2, h3)
2. **ARIA Labels:** Add labels to icon-only buttons
3. **Keyboard Navigation:** All interactive elements must be keyboard accessible
4. **Focus States:** Visible focus indicators (2px solid #2D6A4F outline)
5. **Alt Text:** All icons should have descriptive text or aria-labels
6. **Color Contrast:** All text must meet WCAG AA standards (4.5:1 ratio minimum)

---

## 11. IMPLEMENTATION CHECKLIST

### Phase 1: Setup
- [ ] Create Angular project with routing
- [ ] Set up project structure (components, services, models)
- [ ] Define TypeScript interfaces
- [ ] Create ProjectService with mock data
- [ ] Set up HttpClient module

### Phase 2: Projects List Page
- [ ] Create ProjectsListComponent
- [ ] Implement header section
- [ ] Create ProjectCardComponent (reusable)
- [ ] Implement grid layout (responsive)
- [ ] Add loading state
- [ ] Add empty state
- [ ] Add error handling
- [ ] Implement navigation to detail page
- [ ] Apply color palette
- [ ] Add hover animations

### Phase 3: Project Detail Page
- [ ] Create ProjectDetailComponent
- [ ] Implement sticky header with back button
- [ ] Create map section with placeholder
- [ ] Create 3D section with placeholder
- [ ] Create Project Details sidebar card
- [ ] Create Panel Configuration sidebar card
- [ ] Implement routing parameter handling (id)
- [ ] Add loading state
- [ ] Add 404 handling for invalid IDs
- [ ] Apply color palette
- [ ] Ensure responsive layout

### Phase 4: Polish
- [ ] Add all hover effects and transitions
- [ ] Test responsive design on all breakpoints
- [ ] Verify accessibility (keyboard navigation, screen readers)
- [ ] Add proper error messages
- [ ] Test navigation flow
- [ ] Optimize performance

### Phase 5: API Integration (when ready)
- [ ] Connect to Express backend
- [ ] Replace mock data with real API calls
- [ ] Add authentication headers if needed
- [ ] Implement error handling for network failures
- [ ] Add retry logic for failed requests

---

## 12. EXAMPLE COMPONENT STRUCTURES

### ProjectsListComponent Template Structure
```html
<div class="container">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>My Projects</h1>
      <p>Manage your solar panel installations</p>
    </div>
    <div class="header-right">
      <button class="btn-primary">
        <icon name="plus"></icon>
        New Project
      </button>
    </div>
  </div>
  
  <!-- Loading State -->
  <div *ngIf="loading" class="loading">
    <div class="spinner"></div>
  </div>
  
  <!-- Error State -->
  <div *ngIf="error" class="error-message">
    {{ error }}
  </div>
  
  <!-- Empty State -->
  <div *ngIf="!loading && projects.length === 0" class="empty-state">
    <icon name="sun" size="64"></icon>
    <h3>No projects yet</h3>
    <p>Create your first solar panel project to get started</p>
    <button class="btn-primary">Create Project</button>
  </div>
  
  <!-- Projects Grid -->
  <div *ngIf="!loading && projects.length > 0" class="projects-grid">
    <app-project-card 
      *ngFor="let project of projects" 
      [project]="project"
      (click)="navigateToProject(project.id)">
    </app-project-card>
  </div>
</div>
```

### ProjectCardComponent Template Structure
```html
<div class="project-card">
  <!-- Thumbnail -->
  <div class="card-thumbnail">
    <icon name="zap" class="thumbnail-icon"></icon>
  </div>
  
  <!-- Content -->
  <div class="card-content">
    <h3>{{ project.name }}</h3>
    
    <div class="metadata">
      <div class="metadata-item">
        <icon name="map-pin"></icon>
        <span>{{ project.location }}</span>
      </div>
      
      <div class="metadata-item">
        <icon name="calendar"></icon>
        <span>{{ project.createdAt | date:'MMM d, yyyy' }}</span>
      </div>
      
      <div class="metadata-item">
        <icon name="zap"></icon>
        <span>{{ project.panels }} panels • {{ project.power }}kW</span>
      </div>
    </div>
    
    <div class="card-footer">
      <span class="status-badge" [class]="'status-' + project.status">
        {{ project.status | titlecase }}
      </span>
    </div>
  </div>
</div>
```

### ProjectDetailComponent Template Structure
```html
<div class="project-detail">
  <!-- Header -->
  <header class="detail-header">
    <button class="back-button" (click)="goBack()">
      <icon name="arrow-left"></icon>
      Back to Projects
    </button>
    
    <div class="header-content">
      <div class="header-left">
        <h1>{{ project?.name }}</h1>
        <div class="metadata">
          <span><icon name="map-pin"></icon>{{ project?.location }}</span>
          <span><icon name="zap"></icon>{{ project?.panels }} panels • {{ project?.power }}kW</span>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-primary">
          <icon name="settings"></icon>
          Configure
        </button>
      </div>
    </div>
  </header>
  
  <!-- Content -->
  <div class="content-layout">
    <!-- Main Content -->
    <div class="main-content">
      <!-- Map Section -->
      <section class="map-section">
        <h2>Installation Area</h2>
        <div class="map-placeholder">
          <icon name="map-pin" size="64"></icon>
        </div>
      </section>
      
      <!-- 3D Section -->
      <section class="visualization-section">
        <h2>3D Visualization</h2>
        <div class="visualization-placeholder">
          <icon name="sun" size="64"></icon>
        </div>
      </section>
    </div>
    
    <!-- Sidebar -->
    <aside class="sidebar">
      <!-- Project Details -->
      <div class="details-card">
        <h2>Project Details</h2>
        <div class="stat-item">
          <span class="label">Total Area</span>
          <span class="value">{{ project?.area }} m²</span>
        </div>
        <div class="stat-item">
          <span class="label">Number of Panels</span>
          <span class="value">{{ project?.panels }}</span>
        </div>
        <!-- Add more stat items -->
      </div>
      
      <!-- Panel Configuration -->
      <div class="config-card">
        <h2>Panel Configuration</h2>
        <div class="stat-item">
          <span class="label">Panel Type</span>
          <span class="value">{{ project?.panelType }}</span>
        </div>
        <!-- Add more config items -->
      </div>
    </aside>
  </div>
</div>
```

---

## 13. CRITICAL STYLING NOTES

### Global Styles (styles.css or styles.scss)
```css
:root {
  /* Color Palette */
  --color-bg-main: #F0F7F4;
  --color-text-primary: #081C15;
  --color-brand: #1B4332;
  --color-action-primary: #2D6A4F;
  --color-solar-accent: #FFD600;
  --color-tech: #219EBC;
  --color-text-secondary: #1B4332;
  --color-border: #B7E4C7;
  
  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 16px;
  --spacing-md: 24px;
  --spacing-lg: 32px;
  --spacing-xl: 48px;
  
  /* Border Radius */
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

body {
  background-color: var(--color-bg-main);
  color: var(--color-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

/* Button Styles */
.btn-primary {
  background-color: var(--color-action-primary);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background-color: var(--color-brand);
  transform: translateY(-2px);
}

/* Card Base Style */
.card {
  background: white;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}
```

---

## 14. TESTING CHECKLIST

### Functional Testing
- [ ] Projects load correctly
- [ ] Clicking a project card navigates to detail page
- [ ] Detail page shows correct project data
- [ ] Back button returns to projects list
- [ ] Loading states display correctly
- [ ] Empty state shows when no projects
- [ ] Error messages display on failure

### Visual Testing
- [ ] Colors match the palette exactly
- [ ] Border radius is 24px on all cards
- [ ] Spacing is consistent (24px/48px)
- [ ] Hover effects work smoothly
- [ ] Status badges have correct colors
- [ ] Icons are the right size and color

### Responsive Testing
- [ ] Test on mobile (375px, 414px)
- [ ] Test on tablet (768px, 1024px)
- [ ] Test on desktop (1280px, 1920px)
- [ ] Grid changes columns correctly
- [ ] Sidebar stacks on mobile
- [ ] Text remains readable at all sizes

### Accessibility Testing
- [ ] Navigate entire app with keyboard only
- [ ] Test with screen reader
- [ ] Check focus indicators are visible
- [ ] Verify ARIA labels on icon buttons
- [ ] Ensure color contrast ratios

---

## 15. DELIVERABLES

When complete, the Angular application should have:

1. ✅ Fully functional routing with 5 pages (Home, Projects, Detail, About, 404)
2. ✅ Projects list page with grid of project cards
3. ✅ Project detail page with map and 3D placeholders
4. ✅ Complete color palette implementation
5. ✅ Responsive design (mobile, tablet, desktop)
6. ✅ Loading, empty, and error states
7. ✅ Smooth animations and hover effects
8. ✅ TypeScript interfaces for type safety
9. ✅ Service layer ready for API integration
10. ✅ Mock data for development

---

## 16. FUTURE ENHANCEMENTS (Not Required Now)

- Real map integration with Leaflet (ngx-leaflet)
- 3D visualization with Three.js
- Form for creating/editing projects
- Authentication system
- Real-time data updates via WebSockets
- Export project data as PDF
- Energy production calculator
- Weather API integration
- Cost estimation module

---

## SUMMARY

This prompt provides everything needed to recreate the React solar panel project management screens in Angular 21. The implementation should focus on:

1. **Visual Fidelity:** Match the color palette and design exactly
2. **Component Structure:** Use Angular best practices with services and components
3. **Responsive Design:** Ensure mobile-first approach
4. **Type Safety:** Leverage TypeScript for all data structures
5. **Scalability:** Structure code to easily integrate real APIs later

The result should be a production-ready Angular application that serves as the frontend for your MEAN stack solar panel project management system.
