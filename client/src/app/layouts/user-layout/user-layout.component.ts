import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '@core/services';

interface DockItem {
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  readonly exact?: boolean;
  readonly matchPrefixes?: readonly string[];
}

@Component({
  selector: 'app-user-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, ButtonModule, TooltipModule],
  template: `
    <div class="user-shell">
      <aside class="user-dock" [class.expanded]="isDockExpanded()" aria-label="User Navigation Dock">
        <div class="dock-top">
          <button
            pButton
            type="button"
            class="dock-toggle"
            [icon]="isDockExpanded() ? 'pi pi-angle-left' : 'pi pi-angle-right'"
            [text]="true"
            [rounded]="true"
            [ariaLabel]="isDockExpanded() ? 'Collapse dock' : 'Expand dock'"
            (click)="toggleDock()"
            pTooltip="Toggle menu"
            tooltipPosition="right"
            [tooltipDisabled]="isDockExpanded()"
          ></button>

          <a class="dock-brand" routerLink="/projects" aria-label="Solar Planner Dashboard">
            <i class="pi pi-sun"></i>
            @if (isDockExpanded()) {
              <span>Solar Planner</span>
            }
          </a>

          <nav class="dock-nav" aria-label="Primary">
            @for (item of primaryNavItems; track item.path) {
              <a
                class="dock-item"
                [routerLink]="item.path"
                [class.active]="isRouteActive(item)"
                [attr.aria-label]="item.label"
                [pTooltip]="item.label"
                tooltipPosition="right"
                [tooltipDisabled]="isDockExpanded()"
              >
                <i [class]="item.icon"></i>
                @if (isDockExpanded()) {
                  <span>{{ item.label }}</span>
                }
              </a>
            }
          </nav>
        </div>

        <div class="dock-bottom">
          <a
            class="dock-item profile"
            [routerLink]="'/projects/profile'"
            [class.active]="isRouteActive(profileNavItem)"
            aria-label="Profile"
            pTooltip="Profile"
            tooltipPosition="right"
            [tooltipDisabled]="isDockExpanded()"
          >
            <i class="pi pi-user"></i>
            @if (isDockExpanded()) {
              <span>Profile</span>
            }
          </a>

          <button
            pButton
            type="button"
            class="dock-item logout"
            [class.expanded]="isDockExpanded()"
            [text]="true"
            icon="pi pi-sign-out"
            [ariaLabel]="isDockExpanded() ? 'Logout' : 'Logout user'"
            (onClick)="logout()"
            pTooltip="Logout"
            tooltipPosition="right"
            [tooltipDisabled]="isDockExpanded()"
          >
            @if (isDockExpanded()) {
              <span>Logout</span>
            }
          </button>
        </div>
      </aside>

      <main class="user-content">
        <section class="content-inner">
          <router-outlet />
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .user-shell {
      display: grid;
      grid-template-columns: auto 1fr;
      min-height: 100vh;
      background:
        radial-gradient(circle at 15% 15%, color-mix(in srgb, var(--p-primary-200) 40%, transparent) 0%, transparent 45%),
        radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--p-cyan-200) 35%, transparent) 0%, transparent 45%),
        var(--p-surface-50);
    }

    .user-dock {
      width: 5.5rem;
      background: linear-gradient(160deg, var(--p-primary-900) 0%, var(--p-primary-800) 60%, color-mix(in srgb, var(--p-primary-700) 80%, var(--p-cyan-700)) 100%);
      color: var(--p-primary-contrast-color);
      border-right: 1px solid color-mix(in srgb, var(--p-primary-200) 30%, transparent);
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
      position: sticky;
      top: 0;
      height: 100vh;
      transition: width 0.25s ease;
      box-shadow: var(--p-shadow-6);

      &.expanded {
        width: 16rem;
      }
    }

    .dock-top,
    .dock-bottom {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .dock-toggle {
      align-self: center;
      color: var(--p-primary-contrast-color);
      border: 1px solid color-mix(in srgb, var(--p-primary-contrast-color) 30%, transparent);
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 999px;
      transition: all 0.2s ease;

      &:hover {
        background: color-mix(in srgb, var(--p-primary-contrast-color) 12%, transparent);
      }
    }

    .dock-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--p-primary-contrast-color);
      text-decoration: none;
      border-radius: 1rem;
      padding: 0.75rem;

      i {
        font-size: 1.5rem;
        color: var(--p-yellow-500);
        filter: drop-shadow(0 0 0.625rem rgba(255, 214, 0, 0.35));
      }

      span {
        font-size: 1rem;
        font-weight: 700;
        white-space: nowrap;
      }
    }

    .dock-nav {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .dock-item {
      border: 0;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: color-mix(in srgb, var(--p-primary-contrast-color) 90%, transparent);
      padding: 0.75rem;
      border-radius: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background: transparent;
      font-weight: 600;
      font-size: 0.95rem;

      i {
        font-size: 1.1rem;
        min-width: 1.25rem;
        text-align: center;
      }

      span {
        white-space: nowrap;
      }

      &:hover {
        background: color-mix(in srgb, var(--p-primary-contrast-color) 12%, transparent);
        color: var(--p-primary-contrast-color);
      }

      &.active {
        background: linear-gradient(120deg, color-mix(in srgb, var(--p-yellow-500) 85%, #fff) 0%, color-mix(in srgb, var(--p-yellow-400) 75%, #fff) 100%);
        color: #000;
        box-shadow: 0 0 0.875rem rgba(255, 214, 0, 0.25);
      }
    }

    .dock-bottom {
      padding-top: 0.75rem;
      border-top: 1px solid color-mix(in srgb, var(--p-primary-contrast-color) 15%, transparent);
    }

    .logout {
      justify-content: flex-start;
      color: color-mix(in srgb, var(--p-red-200) 85%, var(--p-primary-contrast-color));

      &:hover {
        background: color-mix(in srgb, var(--p-red-400) 18%, transparent);
      }
    }

    .user-content {
      min-width: 0;
      padding: 1.5rem;
    }

    .content-inner {
      min-height: calc(100vh - 3rem);
    }

    @media (max-width: 1024px) {
      .user-shell {
        grid-template-columns: 1fr;
      }

      .user-dock {
        position: sticky;
        top: 0;
        z-index: 1000;
        width: 100%;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid color-mix(in srgb, var(--p-primary-200) 30%, transparent);
        padding: 0.75rem;

        &.expanded {
          width: 100%;
        }
      }

      .dock-top {
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
      }

      .dock-nav {
        flex-direction: row;
        flex-wrap: wrap;
      }

      .dock-bottom {
        flex-direction: row;
        border-top: 0;
        padding-top: 0;
      }
    }

    @media (max-width: 768px) {
      .user-content {
        padding: 1rem;
      }
    }
  `]
})
export class UserLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isDockExpanded = signal(false);

  readonly primaryNavItems: readonly DockItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      path: '/projects',
      exact: true,
    },
    {
      label: 'Create Project',
      icon: 'pi pi-plus-circle',
      path: '/projects/add',
      matchPrefixes: ['/projects/add'],
    },
    {
      label: 'Project List',
      icon: 'pi pi-folder-open',
      path: '/projects/all',
      matchPrefixes: ['/projects/all'],
    },
    {
      label: 'Panels',
      icon: 'pi pi-th-large',
      path: '/panels/all',
      matchPrefixes: ['/panels'],
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      path: '/projects/settings',
      matchPrefixes: ['/projects/settings'],
    },
  ];

  readonly profileNavItem: DockItem = {
    label: 'Profile',
    icon: 'pi pi-user',
    path: '/projects/profile',
    matchPrefixes: ['/projects/profile'],
  };

  toggleDock(): void {
    this.isDockExpanded.update((expanded) => !expanded);
  }

  isRouteActive(item: DockItem): boolean {
    const currentUrl = this.router.url;

    if (item.exact) {
      return currentUrl === item.path;
    }

    if (item.matchPrefixes && item.matchPrefixes.length > 0) {
      return item.matchPrefixes.some((prefix) => currentUrl.startsWith(prefix));
    }

    return currentUrl.startsWith(item.path);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
