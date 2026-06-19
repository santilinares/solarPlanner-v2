import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '@core/services/language.service';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-visitor-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="visitor-layout">
      <header class="visitor-header">
        <div class="container">
          <div class="brand">
            <i class="pi pi-sun brand-icon"></i>
            <h1>Solar Planner</h1>
            <span class="version-badge">v2.0</span>
          </div>
          <nav>
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <i class="pi pi-home"></i>
              <span>{{ i18n.t('nav.home') }}</span>
            </a>
            <button type="button" class="nav-link" (click)="openDocumentation()">
              <i class="pi pi-book"></i>
              <span>{{ i18n.t('nav.documentation') }}</span>
            </button>
            <button type="button" class="nav-link" (click)="openGithub()">
              <i class="pi pi-github"></i>
              <span>GitHub</span>
            </button>
            <a class="nav-button secondary" routerLink="/login" routerLinkActive="active">
              {{ i18n.t('nav.login') }}
            </a>
            <a class="nav-button primary" routerLink="/registration" routerLinkActive="active">
              {{ i18n.t('nav.register') }}
            </a>
          </nav>
        </div>
      </header>

      <main class="visitor-content">
        <router-outlet />
      </main>

      <footer class="visitor-footer">
        <div class="container">
          <p>{{ i18n.t('layout.footer') }}</p>
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
      position: sticky;
      top: 0;
      z-index: 1200;
      background: linear-gradient(135deg, var(--p-primary-600) 0%, var(--p-primary-700) 100%);
      color: white;
      padding: 0.875rem 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(0.75rem);

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

        .version-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.18rem 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.92);
          font-size: 0.72rem;
          font-weight: 700;
          line-height: 1;
        }
      }

      nav {
        display: flex;
        align-items: center;
        gap: 0.375rem;

        a,
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          padding: 0.4rem 0.875rem;
          border-radius: 9999px;
          border: 0;
          background: transparent;
          font-family: inherit;
          cursor: pointer;
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

        .nav-button {
          border: 1px solid rgba(255, 255, 255, 0.28);
          font-weight: 700;

          &.primary {
            background: var(--p-yellow-400);
            border-color: var(--p-yellow-400);
            color: var(--p-primary-900);

            &:hover,
            &.active {
              color: var(--p-primary-900);
              background: var(--p-yellow-300);
            }
          }

          &.secondary {
            background: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }

    .visitor-content {
      flex: 1;
      padding: 0;
    }

    .visitor-footer {
      background-color: var(--p-surface-100);
      padding: 1.5rem 0;
      text-align: center;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    @media (max-width: 760px) {
      .visitor-header {
        .container {
          align-items: flex-start;
          gap: 1rem;
          flex-direction: column;
        }

        nav {
          width: 100%;
          overflow-x: auto;
          padding-bottom: 0.15rem;
        }
      }
    }
  `]
})
export class VisitorLayoutComponent {
  readonly i18n = inject(LanguageService);

  openGithub(): void {
    window.open(environment.githubUrl, '_blank', 'noopener,noreferrer');
  }

  openDocumentation(): void {
    window.open(environment.githubReadmeUrl, '_blank', 'noopener,noreferrer');
  }
}
