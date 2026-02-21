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
            <i class="pi pi-users" style="color: var(--red-500);"></i>
            User Management
          </h1>
          <p class="subtitle">Manage system users, roles, and permissions</p>
        </div>
      </div>
      
      <p-card class="content-placeholder">
        <div class="placeholder-content">
          <i class="pi pi-users animate-pulse" style="font-size: 4rem; color: var(--red-500); margin-bottom: 1.5rem;"></i>
          <h2>User Management System</h2>
          <p class="description">Advanced user management features coming soon</p>
          <div class="feature-list">
            <div class="feature-item">
              <i class="pi pi-check-circle" style="color: var(--green-500);"></i>
              <span>Comprehensive user database with search and filters</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle" style="color: var(--green-500);"></i>
              <span>User activation and deactivation controls</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle" style="color: var(--green-500);"></i>
              <span>Role-based access control management</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-check-circle" style="color: var(--green-500);"></i>
              <span>Bulk actions and user data export</span>
            </div>
          </div>
          <p-button 
            label="Back to Dashboard" 
            icon="pi pi-arrow-left"
            routerLink="/admin"
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

      ::ng-deep {
        .content-placeholder {
          .p-card-body {
            padding: 4rem 2rem;
          }

          .placeholder-content {
            text-align: center;
            max-width: 600px;
            margin: 0 auto;

            h2 {
              font-size: 2rem;
              color: var(--text-color);
              margin-bottom: 1rem;
            }

            .description {
              font-size: 1.1rem;
              color: var(--text-color-secondary);
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
                background: var(--surface-hover);
                border-radius: 8px;

                i {
                  font-size: 1.25rem;
                  flex-shrink: 0;
                }

                span {
                  color: var(--text-color);
                  font-weight: 500;
                }
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
      }
    }
  `]
})
export class UsersListComponent {}
