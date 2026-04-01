import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProjectService } from '@core/services/project.service';
import { AuthService } from '@core/services';
import { UserRole } from '@core/models';
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
  ownerEmail?: string;
}

@Component({
  selector: 'app-user-projects',
  imports: [CommonModule, RouterLink, ButtonModule, DatePipe, TitleCasePipe, CardModule, SkeletonModule, TagModule, TooltipModule],
  template: `
    <section class="projects-page animate-fade-in-up">
      <header class="projects-header">
        <div>
          <h1>
            <i class="pi pi-bolt icon-lg icon-primary"></i>
            {{ isAdmin() ? 'All Projects' : 'My Projects' }}
          </h1>
          <p>{{ isAdmin() ? 'Manage all user projects' : 'Manage your solar panel installations' }}</p>
        </div>
        @if (!isAdmin()) {
          <p-button
            label="New Project"
            icon="pi pi-plus"
            routerLink="/projects/add"
          ></p-button>
        }
      </header>

      @if (isLoading()) {
        <div class="projects-grid stagger-children" animate.enter="animate-fade-in" animate.leave="animate-fade-out">
          @for (item of [1,2,3,4,5,6]; track item) {
            <p-card class="project-card">
              <p-skeleton height="15rem" class="mb-3"></p-skeleton>
              <p-skeleton height="1rem" class="mb-2"></p-skeleton>
              <p-skeleton height="1rem" class="mb-2"></p-skeleton>
              <p-skeleton height="2rem" width="70%"></p-skeleton>
            </p-card>
          }
        </div>
      } @else if (errorMessage()) {
        <p-card class="error-state" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          <div class="error-content">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ errorMessage() }}</span>
          </div>
        </p-card>
      } @else if (projects().length === 0) {
        <p-card class="empty-state" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          <div class="empty-content">
            <i class="pi pi-sun"></i>
            <h2>{{ isAdmin() ? 'No projects found' : 'No projects yet' }}</h2>
            <p>{{ isAdmin() ? 'There are no user projects to display yet.' : 'Create your first solar panel project to get started' }}</p>
            @if (!isAdmin()) {
              <p-button
                label="Create Project"
                icon="pi pi-plus"
                routerLink="/projects/add"
              ></p-button>
            }
          </div>
        </p-card>
      } @else {
        <div class="projects-grid stagger-children" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          @for (project of projects(); track project.id) {
            <p-card class="project-card hover-lift" [routerLink]="['/projects', project.id]">
              <div class="card-header">
                <div class="project-icon">
                  <i class="pi pi-bolt thumb-icon"></i>
                </div>
                <div class="card-header-actions">
                  <p-tag
                    [value]="project.status | titlecase"
                    [severity]="getStatusSeverity(project.status)"
                  ></p-tag>
                  @if (isAdmin()) {
                    <p-button
                      icon="pi pi-trash"
                      severity="danger"
                      [text]="true"
                      [rounded]="true"
                      [loading]="deletingProjectId() === project.id"
                      ariaLabel="Delete project"
                      pTooltip="Delete project"
                      tooltipPosition="top"
                      (click)="deleteProject($event, project)"
                    ></p-button>
                  }
                </div>
              </div>

              <h3>{{ project.name }}</h3>

              <div class="meta-item">
                <i class="pi pi-map-marker"></i>
                <span>{{ project.location }}</span>
              </div>

              <div class="meta-item">
                <i class="pi pi-calendar"></i>
                <span>{{ project.createdAt | date: 'MMM d, y' }}</span>
              </div>

              @if (isAdmin() && project.ownerEmail) {
                <div class="meta-item">
                  <i class="pi pi-envelope"></i>
                  <span>{{ project.ownerEmail }}</span>
                </div>
              }

              <div class="project-specs">
                <div class="spec-item">
                  <span class="spec-label">Panels</span>
                  <span class="spec-value">{{ project.panels }}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Power</span>
                  <span class="spec-value">{{ project.power | number: '1.1-1' }}kW</span>
                </div>
              </div>
            </p-card>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .projects-page {
        padding: 1.25rem;
      }

      .projects-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;

        h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--p-text-color);
          margin: 0 0 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        p {
          margin: 0.5rem 0 0;
          color: var(--p-text-muted-color);
          font-size: 1rem;
        }
      }

      .error-state {
        .error-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--p-red-700, var(--p-red-500));

          i {
            color: var(--p-red-500);
          }
        }
      }

      .empty-state {
        .empty-content {
          min-height: 20rem;
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
      }

      .projects-grid {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(auto-fill, minmax(18.75rem, 1fr));
      }

      .project-card {
        transition: all 0.3s ease;
        cursor: pointer;

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .card-header-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .project-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          background: color-mix(in srgb, var(--p-yellow-500) 16%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        h3 {
          margin: 0 0 1rem;
          color: var(--p-text-color);
          font-size: 1.25rem;
          font-weight: 700;
          transition: color 0.3s ease;
        }

        &:hover {
          h3 {
            color: var(--p-primary-600);
          }

          .thumb-icon {
            transform: scale(1.1);
          }
        }
      }

      .thumb-icon {
        font-size: 1.35rem;
        color: var(--p-yellow-500);
        transition: transform 0.3s ease;
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

      .project-specs {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .spec-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--p-content-hover-background);
        border-radius: 0.5rem;
      }

      .spec-label {
        font-size: 0.875rem;
        color: var(--p-text-muted-color);
        font-weight: 500;
      }

      .spec-value {
        font-size: 1rem;
        font-weight: 700;
        color: var(--p-primary-500);
      }

      :host ::ng-deep {
        .project-card .p-card-body {
          padding: 1.5rem;
        }

        .empty-state .p-card-body {
          padding: 0;
        }

        .error-state .p-card-body {
          padding: 1rem;
        }
      }

      @media (max-width: 768px) {
        .projects-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class UserProjectsComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);

  readonly projects = signal<ProjectCardView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly deletingProjectId = signal<string | null>(null);
  readonly isAdmin = signal(false);

  ngOnInit(): void {
    const role = this.authService.currentUser()?.role;
    this.isAdmin.set(role === UserRole.ADMIN || this.authService.isAdmin());
    this.loadProjects();
  }

  protected getStatusSeverity(status: ProjectCardView['status']): 'success' | 'info' | 'contrast' {
    if (status === 'active') {
      return 'success';
    }
    if (status === 'completed') {
      return 'contrast';
    }
    return 'info';
  }

  private loadProjects(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const request$ = this.isAdmin()
      ? this.projectService.getAllProjects(1, 100)
      : this.projectService.getMyProjects(1, 100);

    request$.subscribe({
      next: (response) => {
        console.log('Projects response:', response);
        if (response && response.data) {
          const mappedProjects = response.data.map((project) => this.mapProject(project));
          this.projects.set(mappedProjects);
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

  protected deleteProject(event: Event, project: ProjectCardView): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.isAdmin()) {
      return;
    }

    const confirmed = window.confirm(`Delete project "${project.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.deletingProjectId.set(project.id);
    this.projectService.deleteProjectAsAdmin(project.id).subscribe({
      next: () => {
        this.projects.update((projects) => projects.filter((item) => item.id !== project.id));
        this.deletingProjectId.set(null);
      },
      error: () => {
        this.errorMessage.set('Could not delete project. Please try again in a moment.');
        this.deletingProjectId.set(null);
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
      owner?: string | { _id?: string; fullName?: string; email?: string };
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

    const mapped = {
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
      ownerEmail:
        source.owner && typeof source.owner === 'object' && 'email' in source.owner
          ? String((source.owner as { email?: string }).email ?? '')
          : undefined,
    };

    return mapped;
  }

  private formatCoordinates(lat?: number, lon?: number): string {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return 'Unknown location';
    }
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
}
