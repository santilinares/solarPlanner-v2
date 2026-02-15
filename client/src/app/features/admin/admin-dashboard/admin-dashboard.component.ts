import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterLink, CardModule, ButtonModule],
  template: `
    <div class="admin-dashboard animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1>
            <i class="pi pi-shield" style="color: var(--red-500);"></i>
            Admin Dashboard
          </h1>
          <p class="subtitle">System overview and management center</p>
        </div>
      </div>
      
      <div class="dashboard-grid stagger-children">
        <p-card styleClass="admin-card hover-lift">
          <div class="card-icon" style="background: rgba(211, 47, 47, 0.1);">
            <i class="pi pi-users" style="color: var(--red-500); font-size: 2rem;"></i>
          </div>
          <h3>Total Users</h3>
          <p class="stat">0</p>
          <p-button 
            label="Manage Users" 
            icon="pi pi-arrow-right"
            iconPos="right"
            routerLink="/admin/users"
            [text]="true"
            styleClass="w-full mt-3"
          ></p-button>
        </p-card>
        
        <p-card styleClass="admin-card hover-lift">
          <div class="card-icon" style="background: rgba(45, 106, 79, 0.1);">
            <i class="pi pi-folder" style="color: var(--primary-500); font-size: 2rem;"></i>
          </div>
          <h3>Total Projects</h3>
          <p class="stat">0</p>
          <p-button 
            label="Manage Projects" 
            icon="pi pi-arrow-right"
            iconPos="right"
            routerLink="/admin/projects"
            [text]="true"
            styleClass="w-full mt-3"
          ></p-button>
        </p-card>
        
        <p-card styleClass="admin-card hover-lift">
          <div class="card-icon" style="background: rgba(255, 214, 0, 0.15);">
            <i class="pi pi-th-large" style="color: var(--yellow-500); font-size: 2rem;"></i>
          </div>
          <h3>Panel Types</h3>
          <p class="stat">0</p>
          <p-button 
            label="Manage Panels" 
            icon="pi pi-arrow-right"
            iconPos="right"
            routerLink="/admin/panels"
            [text]="true"
            styleClass="w-full mt-3"
          ></p-button>
        </p-card>
      </div>

      <p-card styleClass="info-card mt-4">
        <div class="info-content">
          <i class="pi pi-info-circle" style="font-size: 2.5rem; color: var(--primary-500);"></i>
          <div>
            <h3>Coming Soon</h3>
            <ul>
              <li>Real-time system statistics and analytics</li>
              <li>User activity logs and audit trail</li>
              <li>System health monitoring</li>
              <li>Advanced reporting and data export</li>
            </ul>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 1rem;

      .page-header {
        margin-bottom: 2rem;

        h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .subtitle {
          color: var(--text-color-secondary);
          margin: 0;
          font-size: 1.1rem;
        }
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;

        ::ng-deep {
          .admin-card {
            .p-card-body {
              padding: 1.75rem;
              text-align: center;
            }

            .card-icon {
              width: 70px;
              height: 70px;
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1.5rem;
            }

            h3 {
              font-size: 0.875rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: var(--text-color-secondary);
              margin: 0 0 1rem;
              font-weight: 600;
            }

            .stat {
              font-size: 3rem;
              font-weight: 800;
              color: var(--primary-500);
              margin: 0;
              line-height: 1;
            }

            .p-button {
              font-weight: 600;
            }
          }
        }
      }

      ::ng-deep {
        .info-card {
          .p-card-body {
            padding: 2rem;
          }

          .info-content {
            display: flex;
            gap: 2rem;
            align-items: flex-start;

            h3 {
              margin: 0 0 1rem;
              font-size: 1.5rem;
              color: var(--text-color);
            }

            ul {
              margin: 0;
              padding-left: 1.5rem;

              li {
                color: var(--text-color-secondary);
                margin-bottom: 0.5rem;
                font-size: 1.05rem;
              }
            }
          }
        }
      }

      @media (max-width: 768px) {
        padding: 0.5rem;

        .page-header h1 {
          font-size: 2rem;
        }

        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        ::ng-deep .info-card .info-content {
          flex-direction: column;
          text-align: center;
        }
      }
    }
  `]
})
export class AdminDashboardComponent {}
