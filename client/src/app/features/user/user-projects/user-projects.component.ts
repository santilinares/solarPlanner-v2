import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '@core/services/project.service';
import { Project } from '@core/models';

interface ProjectCardView {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  panels: number;
  power: number;
  status: 'planning' | 'active' | 'completed';
  area: number;
  panelType: string;
  inclination: number;
  orientation: string;
  bifacial: boolean;
  estimatedOutput: number;
  efficiency: number;
}

@Component({
  selector: 'app-user-projects',
  imports: [CommonModule, RouterLink, ButtonModule, DatePipe, TitleCasePipe],
  template: `
    <section class="projects-page animate-fade-in-up">
      <header class="projects-header">
        <div>
          <h1>My Projects</h1>
          <p>Manage your solar panel installations</p>
        </div>
        <p-button
          label="New Project"
          icon="pi pi-plus"
          routerLink="/projects/add"
          class="btn-primary"
        ></p-button>
      </header>

      @if (isLoading()) {
        <div class="loading-state" animate.enter="animate-fade-in" animate.leave="animate-fade-out">
          <span class="spinner" aria-label="Loading projects"></span>
        </div>
      } @else if (errorMessage()) {
        <div class="error-state" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          {{ errorMessage() }}
        </div>
      } @else if (projects().length === 0) {
        <div class="empty-state" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          <i class="pi pi-sun"></i>
          <h2>No projects yet</h2>
          <p>Create your first solar panel project to get started</p>
          <p-button
            label="Create Project"
            icon="pi pi-plus"
            routerLink="/projects/add"
            class="btn-primary"
          ></p-button>
        </div>
      } @else {
        <div class="projects-grid stagger-children" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          @for (project of projects(); track project.id) {
            <article class="project-card" [routerLink]="['/projects', project.id]">
              <div class="card-thumbnail">
                <i class="pi pi-bolt thumb-icon"></i>
              </div>

              <div class="card-content">
                <h3>{{ project.name }}</h3>

                <div class="meta-item">
                  <i class="pi pi-map-marker"></i>
                  <span>{{ project.location }}</span>
                </div>

                <div class="meta-item">
                  <i class="pi pi-calendar"></i>
                  <span>{{ project.createdAt | date: 'MMM d, y' }}</span>
                </div>

                <div class="meta-item">
                  <i class="pi pi-bolt"></i>
                  <span>{{ project.panels }} panels • {{ project.power | number: '1.1-1' }}kW</span>
                </div>

                <div class="card-footer">
                  <span class="status-badge" [class]="'status-' + project.status">
                    {{ project.status | titlecase }}
                  </span>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .projects-page {
        padding: 1.5rem;
        max-width: 1280px;
        margin: 0 auto;
      }

      .projects-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;

        h1 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 2.5rem);
          color: var(--p-text-color);
          font-weight: 800;
        }

        p {
          margin: 0.5rem 0 0;
          color: var(--p-text-muted-color);
          font-size: 1rem;
        }
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
        border-top: 3px solid var(--p-primary-500);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .error-state {
        background: color-mix(in srgb, var(--p-red-500) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--p-red-500) 35%, transparent);
        color: var(--p-red-700, var(--p-red-500));
        border-radius: 12px;
        padding: 1rem;
      }

      .empty-state {
        border: 2px dashed var(--p-content-border-color);
        border-radius: 24px;
        background: var(--p-surface-0);
        min-height: 320px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem;

        i {
          font-size: 4rem;
          color: var(--p-text-muted-color);
          margin-bottom: 1rem;
        }

        h2 {
          margin: 0;
          color: var(--p-text-color);
          font-size: 1.4rem;
          font-weight: 700;
        }

        p {
          margin: 0.75rem 0 1.5rem;
          color: var(--p-text-muted-color);
        }
      }

      .projects-grid {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(1, minmax(0, 1fr));
      }

      .project-card {
        background: var(--p-surface-0);
        border: 2px solid var(--p-content-border-color);
        border-radius: 24px;
        box-shadow: var(--p-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
        transition: all 0.3s ease;
        overflow: hidden;
        cursor: pointer;

        &:hover {
          transform: translateY(-4px);
          box-shadow: var(--p-shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));

          h3 {
            color: var(--p-primary-600);
          }

          .thumb-icon {
            transform: scale(1.1);
          }
        }
      }

      .card-thumbnail {
        height: 192px;
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--p-yellow-500) 18%, var(--p-surface-0)) 0%,
          color-mix(in srgb, var(--p-primary-500) 16%, var(--p-surface-0)) 100%
        );
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .thumb-icon {
        font-size: 5rem;
        color: var(--p-yellow-500);
        opacity: 0.2;
        transition: transform 0.3s ease;
      }

      .card-content {
        padding: 1.5rem;

        h3 {
          margin: 0 0 1rem;
          color: var(--p-text-color);
          font-size: 1.25rem;
          font-weight: 700;
          transition: color 0.3s ease;
        }
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--p-text-muted-color);
        font-size: 0.875rem;
        margin-bottom: 0.625rem;

        i {
          color: var(--p-primary-500);
        }
      }

      .card-footer {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--p-content-border-color);
      }

      .status-badge {
        display: inline-flex;
        border-radius: 999px;
        padding: 0.25rem 0.75rem;
        font-weight: 600;
        font-size: 0.8rem;

        &.status-active {
          background: color-mix(in srgb, var(--p-green-500) 20%, transparent);
          color: var(--p-green-700, var(--p-green-500));
        }

        &.status-planning {
          background: color-mix(in srgb, var(--p-blue-500) 18%, transparent);
          color: var(--p-blue-700, var(--p-blue-500));
        }

        &.status-completed {
          background: var(--p-surface-200);
          color: var(--p-text-muted-color);
        }
      }

      @media (min-width: 768px) {
        .projects-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 1024px) {
        .projects-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class UserProjectsComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  readonly projects = signal<ProjectCardView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProjects();
  }

  private loadProjects(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.projectService.getMyProjects(1, 100).subscribe({
      next: (response) => {
        console.log('Projects response:', response);
        if (response && response.data) {
          this.projects.set(response.data.map((project) => this.mapProject(project)));
        } else {
          console.warn('Unexpected response structure:', response);
          this.errorMessage.set('Invalid server response format.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading projects:', err);
        this.errorMessage.set('Could not load projects. Please try again in a moment.');
        this.isLoading.set(false);
      },
    });
  }

  private mapProject(project: Project): ProjectCardView {
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
          })
        : undefined;

    const id = source.id || source._id || '';
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

    return {
      id,
      name: source.name,
      location: source.country || source.address || this.formatCoordinates(source.lat, source.lon),
      createdAt: String(source.createdAt || new Date().toISOString()),
      panels,
      power,
      status,
      area: source.surface ?? source.polygon?.area ?? 0,
      panelType: source.panelType || panelData?.technology || 'N/A',
      inclination: source.tilt ?? 0,
      orientation: source.direction || source.orientation || 'N/A',
      bifacial: false,
      estimatedOutput: source.estimatedOutput ?? 0,
      efficiency: source.efficiency ?? panelData?.efficiency ?? 0,
    };
  }

  private formatCoordinates(lat?: number, lon?: number): string {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return 'Unknown location';
    }
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
}
