import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@core/services';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CardModule, ButtonModule],
  template: `
    <section class="profile-page animate-fade-in-up" aria-label="User profile">
      <header class="profile-header">
        <div class="avatar" aria-hidden="true">
          <i class="pi pi-user"></i>
        </div>
        <div>
          <p class="eyebrow">Account</p>
          <h1>{{ (authService.currentUser()?.firstName || 'User') + ' ' + (authService.currentUser()?.lastName || 'Profile') }}</h1>
          <p>{{ authService.currentUser()?.email || 'No email available' }}</p>
        </div>
      </header>

      <div class="profile-grid stagger-children">
        <p-card styleClass="profile-card">
          <ng-template pTemplate="title">Account Information</ng-template>
          <p>Review your personal details and how they appear across your projects.</p>
          <button pButton type="button" [text]="true" icon="pi pi-user-edit" label="Edit profile"></button>
        </p-card>

        <p-card styleClass="profile-card">
          <ng-template pTemplate="title">Security</ng-template>
          <p>Manage sign-in security and password lifecycle settings for your account.</p>
          <button pButton type="button" [text]="true" icon="pi pi-shield" label="Security settings"></button>
        </p-card>
      </div>

      <div class="profile-actions">
        <a routerLink="/projects/settings" pButton icon="pi pi-cog" [text]="true" label="Go to settings"></a>
      </div>
    </section>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      color: var(--p-text-color);
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: linear-gradient(145deg, color-mix(in srgb, var(--p-primary-100) 65%, #fff) 0%, color-mix(in srgb, var(--p-yellow-100) 45%, #fff) 100%);
      border: 1px solid var(--p-content-border-color);
      border-radius: 1.25rem;
      padding: 1.25rem;
      box-shadow: var(--p-shadow-2);

      .avatar {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: linear-gradient(140deg, var(--p-primary-600) 0%, var(--p-primary-700) 100%);
        color: var(--p-primary-contrast-color);
      }

      .eyebrow {
        margin: 0;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--p-primary-700);
        font-weight: 700;
      }

      h1 {
        margin: 0.25rem 0;
        font-size: 1.75rem;
      }

      p {
        margin: 0;
        color: var(--p-text-muted-color);
      }
    }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 1rem;
    }

    :host ::ng-deep .profile-card {
      border-radius: 1.25rem;
      border: 1px solid var(--p-content-border-color);
      box-shadow: var(--p-shadow-1);
    }

    .profile-actions {
      display: flex;
      justify-content: flex-start;
    }

    @media (max-width: 640px) {
      .profile-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class ProfileComponent {
  readonly authService = inject(AuthService);
}
