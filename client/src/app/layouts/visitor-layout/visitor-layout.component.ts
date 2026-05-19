import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-visitor-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="visitor-layout">
      <header class="visitor-header">
        <div class="container">
          <div class="brand">
            <i class="pi pi-sun brand-icon"></i>
            <h1>{{ 'BRAND.NAME' | translate }}</h1>
          </div>
          <nav>
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <i class="pi pi-home"></i>
              <span>{{ 'NAV.HOME' | translate }}</span>
            </a>
            <a routerLink="/login" routerLinkActive="active">
              <i class="pi pi-sign-in"></i>
              <span>{{ 'NAV.LOGIN' | translate }}</span>
            </a>
            <a routerLink="/registration" routerLinkActive="active">
              <i class="pi pi-user-plus"></i>
              <span>{{ 'NAV.REGISTER' | translate }}</span>
            </a>
          </nav>
        </div>
      </header>

      <main class="visitor-content">
        <router-outlet />
      </main>

      <footer class="visitor-footer">
        <div class="container">
          <p>{{ 'BRAND.FOOTER' | translate }}</p>
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
      background: linear-gradient(135deg, var(--p-primary-600) 0%, var(--p-primary-700) 100%);
      color: white;
      padding: 0.875rem 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

      .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.625rem;

        .brand-icon {
          font-size: 1.5rem;
          color: var(--p-yellow-400);
          filter: drop-shadow(0 0 6px rgba(255, 214, 0, 0.5));
        }

        h1 {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.01em;
        }
      }

      nav {
        display: flex;
        gap: 0.375rem;

        a {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          padding: 0.4rem 0.875rem;
          border-radius: 9999px;
          transition: all 0.2s ease;

          i {
            font-size: 0.85rem;
          }

          &:hover {
            color: white;
            background: rgba(255, 255, 255, 0.15);
          }

          &.active {
            color: white;
            background: rgba(255, 255, 255, 0.22);
            font-weight: 600;
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
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }
  `]
})
export class VisitorLayoutComponent {}
