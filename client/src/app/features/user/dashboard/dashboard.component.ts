import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  imports: [RouterLink],
  template: `
    <div class="dashboard">
      <h1>User Dashboard</h1>
      <p>Welcome to Solar Planner v2.0!</p>
      
      @if (loading()) {
        <p>Loading dashboard...</p>
      } @else if (error()) {
        <div class="error-message">{{ error() }}</div>
      } @else if (stats()) {
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <h3>My Projects</h3>
            <p class="stat">{{ stats()!.totalProjects }}</p>
            <a routerLink="/projects/all" class="card-link">View all →</a>
          </div>
          
          <div class="dashboard-card">
            <h3>Total Production</h3>
            <p class="stat">{{ stats()!.totalProduction.toFixed(2) }} kWh</p>
          </div>
          
          <div class="dashboard-card">
            <h3>Active Panels</h3>
            <p class="stat">{{ stats()!.totalPanels }}</p>
          </div>

          <div class="dashboard-card">
            <h3>Total Capacity</h3>
            <p class="stat">{{ stats()!.totalCapacity.toFixed(2) }} kW</p>
          </div>
        </div>
        
        @if (stats()!.recentProjects.length > 0) {
          <div class="recent-projects">
            <h2>Recent Projects</h2>
            <div class="projects-list">
              @for (project of stats()!.recentProjects; track project._id) {
                <div class="project-item">
                  <h3>{{ project.name }}</h3>
                  <p>{{ project.country }} - {{ project.surface }} m²</p>
                  <a [routerLink]="['/projects', project._id]" class="view-link">View details →</a>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .dashboard {
      h1 {
        margin-bottom: 2rem;
      }

      .error-message {
        padding: 1rem;
        background-color: #ffebee;
        color: #c62828;
        border-radius: 4px;
        margin: 1rem 0;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-top: 2rem;

        .dashboard-card {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);

          h3 {
            margin-bottom: 1rem;
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
          }

          .stat {
            font-size: 2.5rem;
            font-weight: bold;
            color: #1976d2;
            margin: 0;
          }

          .card-link {
            display: inline-block;
            margin-top: 1rem;
            color: #1976d2;
            text-decoration: none;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }

      .recent-projects {
        margin-top: 3rem;

        h2 {
          margin-bottom: 1.5rem;
        }

        .projects-list {
          display: grid;
          gap: 1rem;

          .project-item {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);

            h3 {
              margin-bottom: 0.5rem;
              color: #333;
            }

            p {
              color: #666;
              margin-bottom: 0.5rem;
            }

            .view-link {
              color: #1976d2;
              text-decoration: none;
              font-size: 0.9rem;

              &:hover {
                text-decoration: underline;
              }
            }
          }
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
