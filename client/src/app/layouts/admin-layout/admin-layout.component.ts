import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout">
      <header class="admin-header">
        <div class="container">
          <h1>Admin Panel</h1>
          <nav>
            <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Dashboard</a>
            <a routerLink="/admin/projects" routerLinkActive="active">Projects</a>
            <a routerLink="/admin/users" routerLinkActive="active">Users</a>
            <a routerLink="/admin/panels" routerLinkActive="active">Panels</a>
            <a routerLink="/projects" class="user-link">User View</a>
            <button (click)="logout()" class="logout-btn">Logout</button>
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
    .admin-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .admin-header {
      background-color: #c62828;
      color: white;
      padding: 1rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);

      .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      h1 {
        margin: 0;
        font-size: 1.5rem;
      }

      nav {
        display: flex;
        gap: 1.5rem;
        align-items: center;

        a {
          color: white;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;

          &:hover {
            opacity: 0.8;
          }

          &.active {
            border-bottom: 2px solid white;
          }

          &.user-link {
            margin-left: 1rem;
            padding-left: 1rem;
            border-left: 1px solid rgba(255,255,255,0.3);
          }
        }

        .logout-btn {
          background-color: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;

          &:hover {
            background-color: rgba(255,255,255,0.3);
          }
        }
      }
    }

    .admin-content {
      flex: 1;
      padding: 2rem 0;
      background-color: #f5f5f5;
    }
  `]
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
