import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '@core/services';

interface DashboardData {
  totalProjects: number;
  totalPanels: number;
  totalCapacity: number;
  totalProduction: number;
  recentProjects: Array<{
    _id: string;
    name: string;
    country?: string;
    surface?: number;
  }>;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CardModule, SkeletonModule, MessageModule, ButtonModule],
  template: `
    <div class="dashboard animate-fade-in-up">
      <div class="dashboard-header">
        <div>
          <h1>
            <i class="pi pi-home" style="color: var(--primary-500);"></i>
            Dashboard
          </h1>
          <p class="welcome-text">Welcome back! Here's your solar planning overview</p>
        </div>
        <p-button 
          label="New Project" 
          icon="pi pi-plus"
          routerLink="/projects/new"
          styleClass="btn-solar"
        ></p-button>
      </div>
      
      @if (loading()) {
        <div class="dashboard-grid">
          @for (item of [1,2,3,4]; track item) {
            <p-card styleClass="stat-card">
              <p-skeleton height="1.5rem" styleClass="mb-2"></p-skeleton>
              <p-skeleton height="3rem" width="60%"></p-skeleton>
            </p-card>
          }
        </div>
      } @else if (error()) {
        <p-message severity="error" [text]="error()" styleClass="w-full"></p-message>
      } @else if (stats()) {
        <div class="dashboard-grid stagger-children">
          <p-card styleClass="stat-card hover-lift">
            <div class="stat-icon" style="background: rgba(45, 106, 79, 0.1);">
              <i class="pi pi-folder" style="color: var(--primary-500); font-size: 2rem;"></i>
            </div>
            <h3>My Projects</h3>
            <p class="stat-value">{{ stats()!.totalProjects }}</p>
            <a routerLink="/projects/all" class="stat-link">
              <i class="pi pi-arrow-right"></i> View all
            </a>
          </p-card>
          
          <p-card styleClass="stat-card hover-lift solar-accent-card">
            <div class="stat-icon" style="background: rgba(255, 214, 0, 0.15);">
              <i class="pi pi-bolt" style="color: var(--yellow-500); font-size: 2rem;"></i>
            </div>
            <h3>Total Production</h3>
            <p class="stat-value solar-highlight">{{ stats()!.totalProduction.toFixed(2) }}</p>
            <span class="stat-unit">kWh</span>
          </p-card>
          
          <p-card styleClass="stat-card hover-lift">
            <div class="stat-icon" style="background: rgba(33, 158, 188, 0.1);">
              <i class="pi pi-th-large" style="color: var(--blue-500); font-size: 2rem;"></i>
            </div>
            <h3>Active Panels</h3>
            <p class="stat-value">{{ stats()!.totalPanels }}</p>
            <span class="stat-unit">panels</span>
          </p-card>

          <p-card styleClass="stat-card hover-lift">
            <div class="stat-icon" style="background: rgba(45, 106, 79, 0.1);">
              <i class="pi pi-chart-line" style="color: var(--primary-500); font-size: 2rem;"></i>
            </div>
            <h3>Total Capacity</h3>
            <p class="stat-value">{{ stats()!.totalCapacity.toFixed(2) }}</p>
            <span class="stat-unit">kW</span>
          </p-card>
        </div>
        
        @if (stats()!.recentProjects.length > 0) {
          <div class="recent-projects animate-fade-in-up">
            <div class="section-header">
              <h2>
                <i class="pi pi-clock"></i>
                Recent Projects
              </h2>
              <p-button 
                label="View All" 
                icon="pi pi-arrow-right"
                iconPos="right"
                [outlined]="true"
                routerLink="/projects/all"
                size="small"
              ></p-button>
            </div>
            <div class="projects-grid stagger-children">
              @for (project of stats()!.recentProjects; track project._id) {
                <p-card styleClass="project-card hover-lift" [routerLink]="['/projects', project._id]">
                  <div class="project-header">
                    <div class="project-icon">
                      <i class="pi pi-map-marker" style="color: var(--primary-500);"></i>
                    </div>
                    <h3>{{ project.name }}</h3>
                  </div>
                  <div class="project-details">
                    <span class="detail-item">
                      <i class="pi pi-globe"></i>
                      {{ project.country || 'N/A' }}
                    </span>
                    <span class="detail-item">
                      <i class="pi pi-chart-bar"></i>
                      {{ project.surface || 0 }} m²
                    </span>
                  </div>
                  <div class="project-action">
                    <span class="action-link">
                      View details
                      <i class="pi pi-arrow-right"></i>
                    </span>
                  </div>
                </p-card>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 1rem;

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;

        h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .welcome-text {
          color: var(--text-color-secondary);
          margin: 0;
          font-size: 1.1rem;
        }

        ::ng-deep .btn-solar {
          background: var(--yellow-500) !important;
          border-color: var(--yellow-500) !important;
          color: #000 !important;
          font-weight: 600;

          &:hover {
            box-shadow: 0 0 20px rgba(255, 214, 0, 0.5) !important;
          }
        }
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1.5rem;
        margin-bottom: 3rem;

        ::ng-deep {
          .stat-card {
            position: relative;
            overflow: visible;

            .p-card-body {
              padding: 1.75rem;
            }

            &.solar-accent-card {
              border: 2px solid var(--yellow-500);
              background: linear-gradient(135deg, var(--surface-card) 0%, rgba(255, 214, 0, 0.05) 100%);
            }

            .stat-icon {
              width: 60px;
              height: 60px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 1rem;
            }

            h3 {
              font-size: 0.875rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: var(--text-color-secondary);
              margin: 0 0 0.75rem;
              font-weight: 600;
            }

            .stat-value {
              font-size: 2.5rem;
              font-weight: 700;
              color: var(--primary-500);
              margin: 0;
              line-height: 1;
            }

            .stat-unit {
              display: block;
              font-size: 0.875rem;
              color: var(--text-color-muted);
              margin-top: 0.5rem;
              font-weight: 500;
            }

            .stat-link {
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              margin-top: 1rem;
              color: var(--primary-500);
              text-decoration: none;
              font-size: 0.9rem;
              font-weight: 600;
              transition: all 0.2s ease;

              &:hover {
                color: var(--primary-600);
                gap: 0.75rem;
              }
            }
          }
        }
      }

      .recent-projects {
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;

          h2 {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-color);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;

            i {
              color: var(--primary-500);
            }
          }
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;

          ::ng-deep {
            .project-card {
              cursor: pointer;
              transition: all 0.3s ease;

              &:hover {
                border-color: var(--primary-500);
              }

              .p-card-body {
                padding: 1.5rem;
              }

              .project-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1rem;

                .project-icon {
                  width: 48px;
                  height: 48px;
                  border-radius: 12px;
                  background: rgba(45, 106, 79, 0.1);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 1.25rem;
                }

                h3 {
                  margin: 0;
                  font-size: 1.25rem;
                  font-weight: 600;
                  color: var(--text-color);
                  flex: 1;
                }
              }

              .project-details {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 1rem;

                .detail-item {
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  color: var(--text-color-secondary);
                  font-size: 0.95rem;

                  i {
                    color: var(--primary-500);
                    font-size: 0.875rem;
                  }
                }
              }

              .project-action {
                padding-top: 1rem;
                border-top: 1px solid var(--surface-border);

                .action-link {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.5rem;
                  color: var(--primary-500);
                  font-weight: 600;
                  font-size: 0.95rem;
                  transition: all 0.2s ease;

                  i {
                    transition: transform 0.2s ease;
                  }
                }

                &:hover .action-link i {
                  transform: translateX(4px);
                }
              }
            }
          }
        }
      }

      @media (max-width: 768px) {
        padding: 0.5rem;

        .dashboard-header h1 {
          font-size: 2rem;
        }

        .dashboard-grid,
        .projects-grid {
          grid-template-columns: 1fr;
        }
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  stats = signal<DashboardData | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.projectService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load dashboard data');
        this.loading.set(false);
      }
    });
  }
}
