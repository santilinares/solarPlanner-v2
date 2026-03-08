import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CardModule, ButtonModule],
  template: `
    <section class="settings-page animate-fade-in-up" aria-label="User settings">
      <header class="settings-header">
        <p class="eyebrow">Preferences</p>
        <h1>Settings</h1>
        <p class="subtitle">Tune how Solar Planner behaves for your workflow.</p>
      </header>

      <div class="settings-grid stagger-children">
        <p-card styleClass="settings-card">
          <ng-template pTemplate="title">Project Defaults</ng-template>
          <p>Set baseline assumptions and defaults you want when creating projects.</p>
          <button pButton type="button" [text]="true" icon="pi pi-sliders-h" label="Configure defaults"></button>
        </p-card>

        <p-card styleClass="settings-card">
          <ng-template pTemplate="title">Notifications</ng-template>
          <p>Control alerts for project updates, panel updates, and system events.</p>
          <button pButton type="button" [text]="true" icon="pi pi-bell" label="Manage notifications"></button>
        </p-card>

        <p-card styleClass="settings-card">
          <ng-template pTemplate="title">Appearance</ng-template>
          <p>Switch visual preferences and layout density to match your workspace.</p>
          <button pButton type="button" [text]="true" icon="pi pi-palette" label="Theme options"></button>
        </p-card>
      </div>

      <div class="settings-actions">
        <a routerLink="/projects" pButton icon="pi pi-arrow-left" [text]="true" label="Back to dashboard"></a>
      </div>
    </section>
  `,
  styles: [`
    .settings-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      color: var(--p-text-color);
    }

    .settings-header {
      background: linear-gradient(145deg, color-mix(in srgb, var(--p-primary-100) 70%, #fff) 0%, color-mix(in srgb, var(--p-cyan-100) 45%, #fff) 100%);
      border: 1px solid var(--p-content-border-color);
      border-radius: 1.25rem;
      padding: 1.25rem;
      box-shadow: var(--p-shadow-2);

      .eyebrow {
        margin: 0;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--p-primary-700);
        font-weight: 700;
      }

      h1 {
        margin: 0.25rem 0 0.5rem;
        font-size: 2rem;
      }

      .subtitle {
        margin: 0;
        color: var(--p-text-muted-color);
      }
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 1rem;
    }

    :host ::ng-deep .settings-card {
      border-radius: 1.25rem;
      border: 1px solid var(--p-content-border-color);
      box-shadow: var(--p-shadow-1);
    }

    .settings-actions {
      display: flex;
      justify-content: flex-start;
    }
  `]
})
export class SettingsComponent {}
