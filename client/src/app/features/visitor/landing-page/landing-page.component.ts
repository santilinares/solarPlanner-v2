import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, ButtonModule, CardModule, TranslateModule],
  template: `
    <div class="landing-page">
      <section class="hero animate-fade-in-down">
        <div class="container">
          <div class="solar-icon">
            <i class="pi pi-sun hero-sun-icon"></i>
          </div>
          <h1 class="hero-title">{{ 'LANDING.HERO_TITLE' | translate }}</h1>
          <p class="subtitle">
            {{ 'LANDING.SUBTITLE' | translate }}
            <br>
            <span class="solar-highlight">{{ 'LANDING.SUBTITLE_HIGHLIGHT' | translate }}</span>
          </p>
          <div class="cta-buttons">
            <p-button
              [label]="'LANDING.CTA_GET_STARTED' | translate"
              icon="pi pi-arrow-right"
              iconPos="right"
              routerLink="/registration"
              class="btn-solar"
              [raised]="true"
            ></p-button>
            <p-button
              [label]="'LANDING.CTA_SIGN_IN' | translate"
              icon="pi pi-sign-in"
              routerLink="/login"
              [outlined]="true"
              class="btn-outline"
            ></p-button>
            <p-button
              [label]="'LANDING.CTA_TRY_FREE' | translate"
              icon="pi pi-calculator"
              routerLink="/estimate"
              severity="secondary"
              [outlined]="true"
              class="btn-outline"
            ></p-button>
          </div>
        </div>
      </section>

      <section class="features">
        <div class="container">
          <h2 class="section-title animate-fade-in-up">{{ 'LANDING.FEATURES_TITLE' | translate }}</h2>
          <div class="feature-grid stagger-children">
            <p-card class="feature-card hover-lift">
              <ng-template pTemplate="header">
                <div class="card-icon">
                  <i class="pi pi-map feature-icon feature-icon-primary"></i>
                </div>
              </ng-template>
              <h3>{{ 'LANDING.FEATURE_MAP_TITLE' | translate }}</h3>
              <p>{{ 'LANDING.FEATURE_MAP_DESC' | translate }}</p>
            </p-card>

            <p-card class="feature-card hover-lift">
              <ng-template pTemplate="header">
                <div class="card-icon">
                  <i class="pi pi-chart-bar feature-icon feature-icon-primary"></i>
                </div>
              </ng-template>
              <h3>{{ 'LANDING.FEATURE_PRODUCTION_TITLE' | translate }}</h3>
              <p>{{ 'LANDING.FEATURE_PRODUCTION_DESC' | translate }}</p>
            </p-card>

            <p-card class="feature-card hover-lift">
              <ng-template pTemplate="header">
                <div class="card-icon">
                  <i class="pi pi-bolt feature-icon feature-icon-solar"></i>
                </div>
              </ng-template>
              <h3>{{ 'LANDING.FEATURE_PANELS_TITLE' | translate }}</h3>
              <p>{{ 'LANDING.FEATURE_PANELS_DESC' | translate }}</p>
            </p-card>

            <p-card class="feature-card hover-lift">
              <ng-template pTemplate="header">
                <div class="card-icon">
                  <i class="pi pi-file-pdf feature-icon feature-icon-primary"></i>
                </div>
              </ng-template>
              <h3>{{ 'LANDING.FEATURE_PDF_TITLE' | translate }}</h3>
              <p>{{ 'LANDING.FEATURE_PDF_DESC' | translate }}</p>
            </p-card>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .landing-page {
      --hero-contrast-color: var(--p-primary-contrast-color);

      .hero {
        background: linear-gradient(135deg, var(--p-primary-600) 0%, var(--p-primary-700) 100%);
        color: var(--hero-contrast-color);
        padding: 5rem 0;
        text-align: center;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 31.25rem;
          height: 31.25rem;
          background: radial-gradient(
            circle,
            color-mix(in srgb, var(--p-yellow-400) 12%, transparent) 0%,
            transparent 70%
          );
          border-radius: 50%;
        }

        .solar-icon {
          margin-bottom: 1.5rem;
          display: inline-block;

          .hero-sun-icon {
            font-size: 8rem;
            color: var(--p-yellow-500);
          }
        }

        .hero-title {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          font-weight: 700;
          color: var(--hero-contrast-color);
          text-shadow: 0 0.125rem 0.625rem color-mix(in srgb, var(--p-surface-900) 25%, transparent);

          @media (max-width: 768px) {
            font-size: 2rem;
          }
        }

        .subtitle {
          font-size: 1.3rem;
          margin-bottom: 2.5rem;
          opacity: 0.95;
          max-width: 43.75rem;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.8;
          color: color-mix(in srgb, var(--hero-contrast-color) 95%, transparent);

          @media (max-width: 768px) {
            font-size: 1.1rem;
          }
        }

        .cta-buttons {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }
      }

      .features {
        padding: 5rem 0;
        background: var(--p-surface-50);

        .section-title {
          text-align: center;
          margin-bottom: 3.5rem;
          font-size: 2.5rem;
          color: var(--p-text-color);
          font-weight: 700;

          &::after {
            content: '';
            display: block;
            width: 5rem;
            height: 0.25rem;
            background: var(--p-yellow-500);
            margin: 1rem auto 0;
            border-radius: 0.125rem;
          }
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr));
          gap: 2rem;

          .feature-card {
            text-align: center;
            transition: all 0.3s ease;

            .card-icon {
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 1rem;

              .feature-icon {
                font-size: 2.5rem;
              }

              .feature-icon-primary {
                color: var(--p-primary-500);
              }

              .feature-icon-solar {
                color: var(--p-yellow-500);
              }
            }

            h3 {
              color: var(--p-text-color);
              margin-bottom: 1rem;
              font-size: 1.4rem;
              font-weight: 600;
            }

            p {
              color: var(--p-text-muted-color);
              line-height: 1.7;
              font-size: 1rem;
            }
          }
        }
      }
    }

    :host ::ng-deep {
      .landing-page .cta-buttons .p-button {
        transition: all 0.3s ease;
      }

      .landing-page .feature-card .p-card-header {
        padding: 2rem 0 0;
      }

      .landing-page .feature-card .p-card-body {
        padding: 1.5rem;
      }
    }
  `]
})
export class LandingPageComponent {}
