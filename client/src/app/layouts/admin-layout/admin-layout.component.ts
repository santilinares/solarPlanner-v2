import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '@core/services';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MenubarModule, ButtonModule],
  template: `
    <div class="admin-layout">
      <header class="admin-header">
        <div class="container">
          <div class="header-brand">
            <i class="pi pi-sun brand-icon"></i>
            <h1 routerLink="/admin">Solar Planner - Admin</h1>
          </div>
          <nav class="header-nav">
            <a routerLink="/admin/projects" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <i class="pi pi-home"></i>
              <span>Dashboard</span>
            </a>
            <a routerLink="/admin/users" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <i class="pi pi-users"></i>
              <span>Users</span>
            </a>
            <a routerLink="/admin/panels" routerLinkActive="active">
              <i class="pi pi-folder"></i>
              <span>Panels</span>
            </a>
            <a routerLink="/projects" class="user-link">
              <i class="pi pi-user"></i>
              <span>User View</span>
            </a>
            <p-button 
              icon="pi pi-sign-out" 
              (onClick)="logout()" 
              severity="secondary"
              Content="true"
              label="Logout"
              class="logout-btn"
            ></p-button>
          </nav>
        </div>
      </header>

      <main class="admin-content">
        <div class="container">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .admin-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--p-surface-50);
    }

    .admin-header {
      background: linear-gradient(135deg, var(--p-primary-400) 0%, var(--p-primary-600) 100%);
      color: white;
      padding: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      position: sticky;
      top: 0;
      z-index: 1000;

      .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        gap: 2rem;
      }

      .header-brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        transition: transform 0.2s ease;

        &:hover {
          transform: scale(1.02);
        }

        .brand-icon {
          font-size: 2rem;
          color: var(--p-yellow-500);
          animation: solarPulse 3s ease-in-out infinite;
        }

        h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }
      }

      .header-nav {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex-wrap: wrap;

        a {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          text-decoration: none;
          font-weight: 600;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-size: 0.95rem;

          i {
            font-size: 1.1rem;
          }

          &:hover {
            background: rgba(255, 255, 255, 0.15);
            color: white;
          }

          &.active {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        }

        ::ng-deep .logout-btn {
          &:hover {
            background: rgba(255, 255, 255, 0.15);
            border-radius: var(--p-button-border-radius);
          }
        }
      }
    }

    .admin-content {
      flex: 1;
      padding: 2rem 0;
    }

    .admin-footer {
      background: var(--p-primary-700);
      color: rgba(255, 255, 255, 0.8);
      padding: 2rem 0;
      margin-top: 4rem;
      text-align: center;

      p {
        margin: 0;
        font-size: 0.95rem;
      }
    }

    @media (max-width: 1024px) {
      .admin-header {
        .container {
          flex-direction: column;
          gap: 1rem;
        }

        .header-nav {
          width: 100%;
          justify-content: center;

          a span {
            display: none;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .admin-content {
        padding: 1rem 0;
      }

      .admin-header {
        .header-brand h1 {
          font-size: 1.25rem;
        }

        .header-nav {
          gap: 0.25rem;

          a {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
        }
      }
    }
  `]
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
