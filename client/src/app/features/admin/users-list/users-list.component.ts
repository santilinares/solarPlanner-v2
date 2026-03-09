import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-users-list',
  imports: [CommonModule, RouterLink, CardModule, ButtonModule],
  template: `
    <div class="users-list animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1>
            <i class="pi pi-users icon-danger"></i>
            User Management
          </h1>
          <p class="subtitle">Manage system users, roles, and permissions</p>
        </div>
      </div>
      
      <p-card class="content-placeholder">
        <div class="placeholder-content">
          <i class="pi pi-users animate-pulse hero-icon icon-danger"></i>
          <h2>User Management System</h2>
          <p class="description">Advanced user management features coming soon</p>
          <div class="feature-list">
            <div class="feature-item">
              <i class="pi pi-check-circle icon-success"></i>
              <span>Comprehensive user database with search and filters</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle icon-success"></i>
              <span>User activation and deactivation controls</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle icon-success"></i>
              <span>Role-based access control management</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle icon-success"></i>
              <span>Bulk actions and user data export</span>
            </div>
          </div>
          <p-button 
            label="Back to Dashboard" 
            icon="pi pi-arrow-left"
            routerLink="/projects/management"
            [outlined]="true"
            class="mt-4"
          ></p-button>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .users-list {
      padding: 1rem;

      .icon-danger {
        color: var(--p-red-500);
      }

      .icon-success {
        color: var(--p-green-500);
      }

      .hero-icon {
        font-size: 4rem;
        margin-bottom: 1.5rem;
      }

      .page-header {
        margin-bottom: 2rem;

        h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--p-text-color);
          margin: 0 0 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .subtitle {
          color: var(--p-text-muted-color);
          margin: 0;
          font-size: 1.1rem;
        }
      }

      .content-placeholder {
        .placeholder-content {
          text-align: center;
          max-width: 600px;
          margin: 0 auto;

          h2 {
            font-size: 2rem;
            color: var(--p-text-color);
            margin-bottom: 1rem;
          }

          .description {
            font-size: 1.1rem;
            color: var(--p-text-muted-color);
            margin-bottom: 2rem;
          }

          .feature-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 2rem;
            text-align: left;

            .feature-item {
              display: flex;
              align-items: center;
              gap: 1rem;
              padding: 1rem;
              background: var(--p-content-hover-background);
              border-radius: 8px;

              i {
                font-size: 1.25rem;
                flex-shrink: 0;
              }

              span {
                color: var(--p-text-color);
                font-weight: 500;
              }
            }
          }
        }
      }

      :host ::ng-deep {
        .users-list .content-placeholder .p-card-body {
          padding: 4rem 2rem;
        }
      }

      @media (max-width: 768px) {
        padding: 0.5rem;

        .page-header h1 {
          font-size: 2rem;
        }
      }
    }
  `]
})
export class UsersListComponent {}
