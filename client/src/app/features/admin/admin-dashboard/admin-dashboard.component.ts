import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '@core/services/user.service';
import { ProjectService } from '@core/services/project.service';
import { PanelService } from '@core/services/panel.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, CardModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-dashboard animate-fade-in-up">
      <header class="dashboard-header">
        <div>
          <h1>
            <i class="pi pi-shield icon-lg icon-danger"></i>
            Admin Overview
          </h1>
          <p class="welcome-text">Operations center for users, projects, and panel management.</p>
        </div>
        <p-button
          label="View All Projects"
          icon="pi pi-folder-open"
          routerLink="/projects/all"
          severity="secondary"
          [outlined]="true"
        />
      </header>

      <div class="dashboard-grid stagger-children">
        <p-card class="stat-card hover-lift">
          <div class="stat-icon stat-icon-danger">
            <i class="pi pi-users icon-lg icon-danger"></i>
          </div>
          <h3>Users</h3>
          <p class="stat-value">{{ loading() ? '--' : (usersCount() ?? '--') }}</p>
          <span class="stat-unit">Directory and permissions</span>
          <a routerLink="/projects/management/users" class="stat-link">
            <i class="pi pi-arrow-right"></i>
            Manage users
          </a>
        </p-card>

        <p-card class="stat-card hover-lift">
          <div class="stat-icon stat-icon-primary">
            <i class="pi pi-folder icon-lg icon-primary"></i>
          </div>
          <h3>Projects</h3>
          <p class="stat-value">{{ loading() ? '--' : (projectsCount() ?? '--') }}</p>
          <span class="stat-unit">Portfolio supervision</span>
          <a routerLink="/projects/all" class="stat-link">
            <i class="pi pi-arrow-right"></i>
            Review projects
          </a>
        </p-card>

        <p-card class="stat-card hover-lift">
          <div class="stat-icon stat-icon-solar">
            <i class="pi pi-th-large icon-lg icon-solar"></i>
          </div>
          <h3>Panels</h3>
          <p class="stat-value">{{ loading() ? '--' : (panelsCount() ?? '--') }}</p>
          <span class="stat-unit">Catalog and specifications</span>
          <a routerLink="/projects/management/panels" class="stat-link">
            <i class="pi pi-arrow-right"></i>
            Manage panels
          </a>
        </p-card>
      </div>

      <div class="quick-actions">
        <div class="section-header">
          <h2>
            <i class="pi pi-bolt icon-lg icon-primary"></i>
            Quick Actions
          </h2>
        </div>
        <div class="actions-grid stagger-children">
          <p-card class="action-card hover-lift" routerLink="/projects/management/users">
            <div class="action-icon action-icon-danger">
              <i class="pi pi-user-edit"></i>
            </div>
            <h3>User Management</h3>
            <p>Search, edit, and manage user accounts.</p>
          </p-card>

          <p-card class="action-card hover-lift" routerLink="/projects/management/panels">
            <div class="action-icon action-icon-solar">
              <i class="pi pi-cog"></i>
            </div>
            <h3>Panel Catalog</h3>
            <p>Update panel specs, performance, and technologies.</p>
          </p-card>

          <p-card class="action-card hover-lift" routerLink="/projects/all">
            <div class="action-icon action-icon-primary">
              <i class="pi pi-chart-line"></i>
            </div>
            <h3>Project Oversight</h3>
            <p>Review project setup quality across the platform.</p>
          </p-card>
        </div>
      </div>

      <p-card class="info-card">
        <div class="info-content">
          <div class="info-icon-wrap">
            <i class="pi pi-lightbulb icon-2xl icon-primary"></i>
          </div>
          <div>
            <h3>Planned Enhancements</h3>
            <ul>
              <li>Live system metrics and trend cards</li>
              <li>Audit timeline for admin actions</li>
              <li>Operational health alerts and monitoring</li>
              <li>Exportable reports for stakeholder summaries</li>
            </ul>
          </div>
        </div>
      </p-card>
    </section>
  `,
  styles: [`
    .admin-dashboard {
      padding: 1rem;

      .icon-primary {
        color: var(--p-primary-500);
      }

      .icon-solar {
        color: var(--p-yellow-500);
      }

      .icon-danger {
        color: var(--p-red-500);
      }

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
          color: var(--p-text-color);
          margin: 0 0 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .welcome-text {
          color: var(--p-text-muted-color);
          margin: 0;
          font-size: 1.1rem;
        }
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(16.25rem, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;

        .stat-card {
          position: relative;
          overflow: visible;

          .stat-icon {
            width: 3.75rem;
            height: 3.75rem;
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
          }

          .stat-icon-primary {
            background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
          }

          .stat-icon-solar {
            background: color-mix(in srgb, var(--p-yellow-500) 16%, transparent);
          }

          .stat-icon-danger {
            background: color-mix(in srgb, var(--p-red-500) 12%, transparent);
          }

          h3 {
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--p-text-muted-color);
            margin: 0 0 0.75rem;
            font-weight: 600;
          }

          .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--p-primary-500);
            margin: 0;
            line-height: 1;
          }

          .stat-unit {
            display: block;
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: var(--p-text-muted-color);
          }

          .stat-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1rem;
            color: var(--p-primary-500);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
            transition: all 0.2s ease;

            &:hover {
              color: var(--p-primary-600);
              gap: 0.75rem;
            }
          }
        }
      }

      .quick-actions {
        margin-bottom: 2rem;

        .section-header {
          margin-bottom: 1rem;

          h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--p-text-color);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
        }
      }

      .actions-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fill, minmax(16.25rem, 1fr));
      }

      .action-card {
        cursor: pointer;
        transition: all 0.25s ease;

        h3 {
          margin: 0 0 0.4rem;
          color: var(--p-text-color);
          font-size: 1.1rem;
          font-weight: 700;
        }

        p {
          margin: 0;
          color: var(--p-text-muted-color);
          font-size: 0.9rem;
          line-height: 1.4;
        }

        &:hover {
          border-color: var(--p-primary-500);
        }
      }

      .action-icon {
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 0.75rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.9rem;
        font-size: 1.1rem;
      }

      .action-icon-primary {
        color: var(--p-primary-500);
        background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
      }

      .action-icon-solar {
        color: var(--p-yellow-600, var(--p-yellow-500));
        background: color-mix(in srgb, var(--p-yellow-500) 16%, transparent);
      }

      .action-icon-danger {
        color: var(--p-red-500);
        background: color-mix(in srgb, var(--p-red-500) 12%, transparent);
      }

      .info-content {
        display: flex;
        gap: 2rem;
        align-items: flex-start;

        .info-icon-wrap {
          width: 3.25rem;
          height: 3.25rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
          flex-shrink: 0;
        }

        h3 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
          color: var(--p-text-color);
        }

        ul {
          margin: 0;
          padding-left: 1.5rem;

          li {
            color: var(--p-text-muted-color);
            margin-bottom: 0.5rem;
            font-size: 1.05rem;
          }
        }
      }

      :host ::ng-deep {
        .admin-dashboard .stat-card .p-card-body {
          padding: 1.75rem;
        }

        .admin-dashboard .info-card .p-card-body {
          padding: 2rem;
        }

        .admin-dashboard .info-card .p-card-content {
          padding: 0;
        }

        .admin-dashboard .action-card .p-card-body {
          padding: 1.25rem;
        }
      }

      @media (max-width: 768px) {
        padding: 0.5rem;

        .dashboard-header h1 {
          font-size: 2rem;
        }

        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .actions-grid {
          grid-template-columns: 1fr;
        }

        .info-content {
          flex-direction: column;
        }
      }
    }
  `]
})
export class AdminDashboardComponent {
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);
  private readonly panelService = inject(PanelService);

  readonly loading = signal(true);
  readonly usersCount = signal<number | null>(null);
  readonly projectsCount = signal<number | null>(null);
  readonly panelsCount = signal<number | null>(null);

  constructor() {
    forkJoin([
      this.userService.getAllUsers(),
      this.projectService.getAdminDashboardStats(),
      this.panelService.getAllPanels(1, 1),
    ])
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ([usersRes, statsRes, panelsRes]) => {
          this.usersCount.set(usersRes.total);
          this.projectsCount.set(statsRes.totalProjects);
          this.panelsCount.set(panelsRes.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
