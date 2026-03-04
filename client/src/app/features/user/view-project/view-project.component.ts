import { Component, OnInit, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '@core/services/project.service';
import { Project, Coordinates } from '@core/models';
import { LocationMapComponent } from '@shared/components/location-map/location-map.component';

interface ProjectDetailView {
  id: string;
  name: string;
  location: string;
  panels: number;
  power: number;
  status: 'planning' | 'active' | 'completed';
  area: number;
  panelType: string;
  dimensions: string;
  inclination: number;
  orientation: string;
  bifacial: string;
  estimatedOutput: number;
  efficiency: number;
  lat: number | null;
  lng: number | null;
  polygonCoords: Coordinates[];
}

@Component({
  selector: 'app-view-project',
  imports: [CommonModule, RouterLink, ButtonModule, DecimalPipe, TitleCasePipe, LocationMapComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="project-detail-page animate-fade-in-up">
      @if (isLoading()) {
        <div class="loading-state" animate.enter="animate-fade-in" animate.leave="animate-fade-out">
          <span class="spinner" aria-label="Loading project"></span>
        </div>
      } @else if (errorMessage()) {
        <div class="error-state" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          {{ errorMessage() }}
        </div>
      } @else if (project(); as data) {
        <header class="detail-header" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          <a class="back-link" routerLink="/projects/all">
            <i class="pi pi-arrow-left"></i>
            Back to Projects
          </a>

          <div class="header-content">
            <div class="header-left">
              <h1>{{ data.name }}</h1>
              <div class="meta-row">
                <span><i class="pi pi-map-marker"></i>{{ data.location }}</span>
                <span><i class="pi pi-bolt"></i>{{ data.panels }} panels • {{ data.power | number: '1.1-1' }}kW</span>
              </div>
            </div>
            <p-button label="Configure" icon="pi pi-cog" class="btn-primary" [routerLink]="'/projects/' + data.id + '/configure'"></p-button>
          </div>
        </header>

        <div class="content-layout" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          <div class="main-content">
            <section class="content-card">
              <h2>Installation Area</h2>
              @if (data.lat !== null && data.lng !== null) {
                <div class="map-wrapper">
                  <app-location-map
                    [lat]="data.lat!"
                    [lng]="data.lng!"
                    [polygon]="data.polygonCoords"
                  />
                </div>
              } @else {
                <div class="placeholder map-placeholder">
                  <i class="pi pi-map-marker"></i>
                </div>
              }
            </section>

            <section class="content-card">
              <h2>3D Visualization</h2>
              <div class="placeholder visual-placeholder">
                <i class="pi pi-sun"></i>
              </div>
            </section>
          </div>

          <aside class="sidebar">
            <section class="content-card">
              <h2>Project Details</h2>
              <div class="stat-item"><span>Total Area</span><strong>{{ data.area | number: '1.0-0' }} m²</strong></div>
              <div class="stat-item"><span>Number of Panels</span><strong>{{ data.panels }}</strong></div>
              <div class="stat-item"><span>Total Power</span><strong>{{ data.power | number: '1.1-1' }} kW</strong></div>
              <div class="stat-item"><span>Efficiency</span><strong>{{ data.efficiency | number: '1.0-0' }}%</strong></div>
              <div class="stat-item"><span>Estimated Output</span><strong>{{ data.estimatedOutput | number: '1.0-0' }} kWh/year</strong></div>
              <div class="stat-item"><span>Status</span><strong>{{ data.status | titlecase }}</strong></div>
            </section>

            <section class="content-card">
              <h2>Panel Configuration</h2>
              <div class="stat-item"><span>Panel Type</span><strong>{{ data.panelType }}</strong></div>
              <div class="stat-item"><span>Dimensions</span><strong>{{ data.dimensions }}</strong></div>
              <div class="stat-item"><span>Inclination</span><strong>{{ data.inclination }}°</strong></div>
              <div class="stat-item"><span>Orientation</span><strong>{{ data.orientation }}</strong></div>
              <div class="stat-item"><span>Bifacial</span><strong>{{ data.bifacial }}</strong></div>
            </section>
          </aside>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .project-detail-page {
        max-width: 1280px;
        margin: 0 auto;
        padding: 1.5rem;
      }

      .loading-state {
        min-height: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .spinner {
        width: 48px;
        height: 48px;
        border: 3px solid transparent;
        border-top: 3px solid #2d6a4f;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .error-state {
        background: rgba(254, 226, 226, 0.5);
        border: 1px solid rgba(239, 68, 68, 0.5);
        color: #991b1b;
        border-radius: 12px;
        padding: 1rem;
      }

      .detail-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: #ffffff;
        border-bottom: 1px solid #b7e4c7;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        border-radius: 1.5rem;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: #1b4332;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 600;

        &:hover {
          color: #081c15;
        }
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 1rem;
        flex-wrap: wrap;

        h1 {
          margin: 0 0 0.5rem;
          font-size: clamp(2rem, 3vw, 2.25rem);
          font-weight: 800;
          color: #081c15;
        }
      }

      .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        color: #1b4332;
        font-size: 0.875rem;

        span {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
      }

      .content-layout {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
      }

      .main-content,
      .sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .content-card {
        background: #ffffff;
        border: 2px solid #b7e4c7;
        border-radius: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        padding: 1.5rem;

        h2 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #081c15;
        }
      }

      .placeholder {
        height: 384px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;

        i {
          font-size: 4rem;
          color: #9ca3af;
        }
      }

      .map-wrapper {
        height: 384px;
        border-radius: 12px;
        overflow: hidden;
      }

      .map-placeholder {
        background: linear-gradient(135deg, #d1fae5, #bfdbfe);
      }

      .visual-placeholder {
        background: linear-gradient(135deg, #fef3c7, #fed7aa);
      }

      .stat-item {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f0f7f4;
        color: #1b4332;

        &:last-child {
          border-bottom: none;
        }

        strong {
          color: #081c15;
          text-align: right;
          font-weight: 700;
        }
      }

      ::ng-deep .btn-primary {

        &:hover {
          background-color: #1b4332;
          border-color: #1b4332;
          border-radius: var(--p-button-border-radius);
          transition: background-color 0.3s ease, color 0.3s ease;
        }
      }

      @media (max-width: 1024px) {
        .content-layout {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .project-detail-page {
          padding: 1rem;
        }

        .placeholder {
          height: 256px;
        }
      }
    `,
  ],
})
export class ViewProjectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);

  readonly project = signal<ProjectDetailView | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Invalid project id.');
      this.isLoading.set(false);
      return;
    }

    this.fetchProject(id);
  }

  private fetchProject(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.projectService.getProjectById(id).subscribe({
      next: (project) => {
        this.project.set(this.mapProject(project));
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Project not found or unavailable.');
        this.isLoading.set(false);
      },
    });
  }

  private mapProject(project: Project): ProjectDetailView {
    const source = project as Project & {
      _id?: string;
      country?: string;
      panelNumber?: number;
      installDate?: string;
      tilt?: number;
      direction?: string;
      surface?: number;
      efficiency?: number;
      estimatedOutput?: number;
      panelType?: string;
      panel?: unknown;
      lat?: number;
      lon?: number;
      prodToday?: unknown[];
    };

    const panelData =
      typeof source.panel === 'object' && source.panel !== null
        ? (source.panel as {
            wattPeak?: number;
            technology?: string;
            efficiency?: number;
            dimensions?: {
              width?: number;
              height?: number;
            };
          })
        : undefined;

    const panels = source.panelNumber ?? 0;
    const panelPower = panelData?.wattPeak ?? 0;
    const power = panels > 0 && panelPower > 0 ? (panels * panelPower) / 1000 : 0;
    const hasProductionData = Array.isArray(source.prodToday) && source.prodToday.length > 0;

    let status: 'planning' | 'active' | 'completed' = 'planning';
    if (hasProductionData) {
      status = 'active';
    } else if (source.installDate && new Date(source.installDate).getTime() < Date.now()) {
      status = 'completed';
    }

    const panelWidth = panelData?.dimensions?.width ?? 1.7;
    const panelHeight = panelData?.dimensions?.height ?? 1.0;

    const lat = typeof source.lat === 'number' ? source.lat : null;
    const lng = typeof source.lon === 'number' ? source.lon : null;

    const polygonCoords: Coordinates[] =
      Array.isArray(source.polygon?.coordinates) && source.polygon.coordinates.length >= 3
        ? source.polygon.coordinates
        : [];

    return {
      id: source.id || source._id || '',
      name: source.name,
      location: source.country || source.address || this.formatCoordinates(source.lat, source.lon),
      panels,
      power,
      status,
      area: source.surface ?? source.polygon?.area ?? 0,
      panelType: source.panelType || panelData?.technology || 'N/A',
      dimensions: `${panelWidth}m × ${panelHeight}m`,
      inclination: source.tilt ?? 0,
      orientation: source.direction || source.orientation || 'N/A',
      bifacial: 'No',
      estimatedOutput: source.estimatedOutput ?? 0,
      efficiency: source.efficiency ?? panelData?.efficiency ?? 0,
      lat,
      lng,
      polygonCoords,
    };
  }

  private formatCoordinates(lat?: number, lon?: number): string {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return 'Unknown location';
    }
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
}
