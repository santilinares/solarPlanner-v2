import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-visitor-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="visitor-layout">
      <header class="visitor-header">
        <div class="container">
          <h1>Solar Planner v2.0</h1>
          <nav>
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Home</a>
            <a routerLink="/login" routerLinkActive="active">Login</a>
            <a routerLink="/registration" routerLinkActive="active">Register</a>
          </nav>
        </div>
      </header>

      <main class="visitor-content">
        <router-outlet />
      </main>

      <footer class="visitor-footer">
        <div class="container">
          <p>&copy; 2025 Solar Planner. All rights reserved.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .visitor-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .visitor-header {
      background-color: var(--p-primary-600);
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
        color: var(--p-amber-50);
      }

      nav {
        display: flex;
        gap: 1.5rem;

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
        }
      }
    }

    .visitor-content {
      flex: 1;
      padding: 2rem 0;
    }

    .visitor-footer {
      background-color: var(--p-surface-100);
      padding: 1.5rem 0;
      text-align: center;
      color: #666;
    }
  `]
})
export class VisitorLayoutComponent {}
