import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@core/services';

@Component({
  selector: 'app-user-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MenubarModule, ButtonModule],
  template: `
    <div class="user-layout">
      <header class="user-header">
        <div class="container">
          <div class="header-brand">
            <i class="pi pi-sun brand-icon"></i>
            <h1 routerLink="/projects">Solar Planner</h1>
          </div>
          <nav class="header-nav">
            <a routerLink="/projects" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <i class="pi pi-home"></i>
              <span>Dashboard</span>
            </a>
            <a routerLink="/projects/add" routerLinkActive="active">
              <i class="pi pi-plus"></i>
              <span>New Project</span>
            </a>
            <a routerLink="/projects/all" routerLinkActive="active">
              <i class="pi pi-folder"></i>
              <span>My Projects</span>
            </a>
            <a routerLink="/panels/all" routerLinkActive="active">
              <i class="pi pi-th-large"></i>
              <span>Panels</span>
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

      <main class="user-content">
        <div class="container">
          <router-outlet />
        </div>
      </main>

      <footer class="user-footer">
        <div class="container">
          <p>&copy; 2026 Solar Planner v2.0 - Powering Your Sustainable Future</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .user-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--p-surface-50);
    }

    .user-header {
      background: linear-gradient(135deg, var(--p-primary-600) 0%, var(--p-primary-700) 100%);
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
          color: rgba(255, 255, 255, 0.9);
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

    .user-content {
      flex: 1;
      padding: 2rem 0;
    }

    .user-footer {
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
      .user-header {
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
      .user-content {
        padding: 1rem 0;
      }

      .user-header {
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
export class UserLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
