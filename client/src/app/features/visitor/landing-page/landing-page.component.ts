import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TimelineModule } from 'primeng/timeline';
import { AnimateOnScrollModule } from 'primeng/animateonscroll';

import { environment } from '../../../../environments/environment';
import { LanguageService } from '@core/services/language.service';

interface TimelineMilestone {
  title: string;
  label: string;
  author: string;
  description: string;
  icon: string;
  stack: string;
  highlights: string[];
}

interface FeatureCard {
  title: string;
  icon: string;
  points: string[];
}

interface TechnologyCard {
  name: string;
  description: string;
  logoSrc: string;
}

@Component({
  selector: 'app-landing-page',
  imports: [NgOptimizedImage, ButtonModule, CardModule, TimelineModule, AnimateOnScrollModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="landing-page">
      <section class="hero-section" aria-labelledby="hero-title">
        <div class="container hero-grid">
          <div class="hero-copy">
            <span class="eyebrow">{{ i18n.t('landing.eyebrow') }}</span>
            <h1 id="hero-title">{{ i18n.t('landing.heroTitle') }}</h1>
            <p class="hero-subtitle">
              {{ i18n.t('landing.heroSubtitle') }}
            </p>

            <div class="hero-indicators" [attr.aria-label]="i18n.t('landing.capabilities')">
              <span><i class="pi pi-check-circle" aria-hidden="true"></i> {{ i18n.t('landing.indicatorSimulations') }}</span>
              <span><i class="pi pi-database" aria-hidden="true"></i> {{ i18n.t('landing.indicatorData') }}</span>
              <span><i class="pi pi-leaf" aria-hidden="true"></i> {{ i18n.t('landing.indicatorFuture') }}</span>
            </div>

            <div class="hero-actions">
              <p-button
                [label]="i18n.t('landing.tryNow')"
                icon="pi pi-arrow-right"
                iconPos="right"
                [raised]="true"
                (onClick)="goToEstimate()"
              />
              <p-button
                [label]="i18n.t('landing.github')"
                icon="pi pi-github"
                styleClass="github-hero-button"
                (onClick)="openGithub()"
              />
            </div>
          </div>

          <div class="hero-visual" [attr.aria-label]="i18n.t('landing.previewAlt')">
            <img
              ngSrc="assets/landing/solar-home-hero.png"
              [alt]="i18n.t('landing.previewAlt')"
              width="1536"
              height="1024"
              priority
              class="hero-illustration"
            />
          </div>
        </div>
      </section>

      <section
        id="documentation"
        class="journey-section"
        aria-labelledby="journey-title"
        pAnimateOnScroll
        enterClass="scroll-enter"
        leaveClass="scroll-leave"
        [once]="true"
      >
        <div class="container">
          <div class="section-heading">
            <span class="section-kicker">{{ i18n.t('landing.roadmap') }}</span>
            <h2 id="journey-title">{{ i18n.t('landing.journeyTitle') }}</h2>
            <p>{{ i18n.t('landing.journeySubtitle') }}</p>
          </div>

          <p-timeline [value]="timelineMilestones" align="left" layout="vertical" class="project-timeline">
            <ng-template #marker let-milestone>
              <button
                type="button"
                class="timeline-marker"
                [class.active]="activeMilestone.title === milestone.title"
                [attr.aria-label]="'Select ' + milestone.title"
                [attr.aria-pressed]="activeMilestone.title === milestone.title"
                (click)="selectMilestone(timelineMilestones.indexOf(milestone))"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ milestone.icon }}</span>
              </button>
            </ng-template>

            <ng-template #opposite let-milestone>
              <div class="timeline-opposite">
                <span>{{ milestone.label }}</span>
                <strong>{{ milestone.author }}</strong>
              </div>
            </ng-template>

            <ng-template #content let-milestone>
              <article
                class="timeline-card"
                [class.active]="activeMilestone.title === milestone.title"
                tabindex="0"
                (click)="selectMilestone(timelineMilestones.indexOf(milestone))"
                (keyup.enter)="selectMilestone(timelineMilestones.indexOf(milestone))"
                (keyup.space)="selectMilestone(timelineMilestones.indexOf(milestone))"
              >
                <span class="timeline-card-label">{{ milestone.label }}</span>
                <h3>{{ milestone.title }}</h3>
                <p>{{ milestone.description }}</p>
                <strong class="active-stack">{{ milestone.stack }}</strong>
                <ul class="active-highlights">
                  @for (highlight of milestone.highlights; track highlight) {
                    <li>{{ highlight }}</li>
                  }
                </ul>
              </article>
            </ng-template>
          </p-timeline>
        </div>
      </section>

      <section
        class="features-section"
        aria-labelledby="features-title"
        pAnimateOnScroll
        enterClass="scroll-enter"
        leaveClass="scroll-leave"
        [once]="true"
      >
        <div class="container">
          <div class="section-heading">
            <span class="section-kicker">{{ i18n.t('landing.capabilities') }}</span>
            <h2 id="features-title">{{ i18n.t('landing.featuresTitle') }}</h2>
          </div>

          <div class="feature-grid">
            @for (feature of featureCards; track feature.title) {
              <p-card styleClass="landing-card feature-card">
                <ng-template pTemplate="header">
                  <div class="feature-icon">
                    <i [class]="feature.icon" aria-hidden="true"></i>
                  </div>
                </ng-template>
                <h3>{{ feature.title }}</h3>
                <ul>
                  @for (point of feature.points; track point) {
                    <li><i class="pi pi-check" aria-hidden="true"></i>{{ point }}</li>
                  }
                </ul>
              </p-card>
            }
          </div>
        </div>
      </section>

      <section
        class="technology-section"
        aria-labelledby="technology-title"
        pAnimateOnScroll
        enterClass="scroll-enter"
        leaveClass="scroll-leave"
        [once]="true"
      >
        <div class="container">
          <div class="section-heading compact">
            <span class="section-kicker">{{ i18n.t('landing.stack') }}</span>
            <h2 id="technology-title">{{ i18n.t('landing.techTitle') }}</h2>
          </div>

          <div class="tech-grid">
            @for (tech of technologyCards; track tech.name) {
              <article class="tech-card">
                <div class="tech-logo">
                  <img [ngSrc]="tech.logoSrc" [alt]="tech.name + ' logo'" width="40" height="40" />
                </div>
                <strong>{{ tech.name }}</strong>
                <p>{{ tech.description }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section
        class="contribution-section"
        aria-labelledby="contribution-title"
        pAnimateOnScroll
        enterClass="scroll-enter"
        leaveClass="scroll-leave"
        [once]="true"
      >
        <div class="container contribution-panel">
          <div class="activity-mark" aria-hidden="true">
            <i class="pi pi-github"></i>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="contribution-copy">
            <span class="section-kicker">{{ i18n.t('landing.openSource') }}</span>
            <h2 id="contribution-title">{{ i18n.t('landing.contributionTitle') }}</h2>
            <p>
              {{ i18n.t('landing.contributionText') }}
            </p>
          </div>
          <div class="contribution-actions">
            <p-button [label]="i18n.t('landing.github')" icon="pi pi-github" (onClick)="openGithub()" />
            <p-button
              [label]="i18n.t('landing.contributingGuide')"
              icon="pi pi-book"
              [outlined]="true"
              severity="secondary"
              styleClass="contributing-button"
              (onClick)="openContributing()"
            />
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .landing-page {
      --landing-deep: color-mix(in srgb, var(--p-primary-900, #022c22) 86%, #000 14%);
      --landing-panel: var(--p-surface-0);
      --landing-muted: var(--p-text-muted-color);
      --landing-border: var(--p-content-border-color);
      --landing-accent: var(--p-yellow-500);
      background: var(--p-surface-50);
      color: var(--p-text-color);
    }

    .hero-section {
      padding: 5.5rem 0 4rem;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--p-primary-700) 95%, #000 5%) 0%, var(--landing-deep) 100%);
      color: var(--p-primary-contrast-color);
      overflow: hidden;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(22rem, 0.9fr);
      gap: clamp(2rem, 6vw, 5rem);
      align-items: center;
    }

    .hero-copy {
      max-width: 45rem;
    }

    .eyebrow,
    .section-kicker {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .eyebrow {
      padding: 0.45rem 0.85rem;
      background: color-mix(in srgb, var(--landing-accent) 18%, transparent);
      border: 1px solid color-mix(in srgb, var(--landing-accent) 42%, transparent);
      color: var(--p-yellow-100);
      margin-bottom: 1.25rem;
    }

    .hero-copy h1 {
      margin: 0;
      max-width: 42rem;
      color: var(--p-primary-contrast-color);
      font-size: clamp(2.4rem, 6vw, 4.85rem);
      line-height: 1.02;
      font-weight: 800;
    }

    .hero-subtitle {
      margin: 1.4rem 0 0;
      max-width: 42rem;
      color: color-mix(in srgb, var(--p-primary-contrast-color) 82%, transparent);
      font-size: 1.16rem;
      line-height: 1.75;
    }

    .hero-indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin: 1.75rem 0 2rem;
    }

    .hero-indicators span {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 0.8rem;
      border: 1px solid color-mix(in srgb, #fff 18%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, #fff 9%, transparent);
      color: color-mix(in srgb, #fff 91%, transparent);
      font-weight: 600;
      font-size: 0.92rem;
    }

    .hero-indicators i {
      color: var(--landing-accent);
    }

    .hero-actions,
    .contribution-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.9rem;
    }

    .hero-visual {
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 0;
    }

    .hero-illustration {
      display: block;
      width: min(100%, 48rem);
      height: auto;
      filter: drop-shadow(0 2rem 2.6rem color-mix(in srgb, #000 24%, transparent));
    }

    .journey-section,
    .features-section,
    .technology-section,
    .contribution-section {
      padding: 5rem 0;
    }

    .section-heading {
      max-width: 48rem;
      margin: 0 auto 2.75rem;
      text-align: center;
    }

    .section-heading.compact {
      margin-bottom: 2rem;
    }

    .section-kicker {
      padding: 0.35rem 0.75rem;
      background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
      color: var(--p-primary-700);
      margin-bottom: 0.85rem;
    }

    .section-heading h2,
    .contribution-copy h2 {
      margin: 0;
      color: var(--p-text-color);
      font-size: clamp(1.9rem, 4vw, 3rem);
      font-weight: 800;
    }

    .section-heading p,
    .contribution-copy p {
      margin: 0.85rem 0 0;
      color: var(--landing-muted);
      font-size: 1.05rem;
      line-height: 1.7;
    }

    .timeline-marker:focus-visible,
    .timeline-card:focus-visible,
    .tech-card:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .timeline-marker {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border: 4px solid var(--p-surface-0);
      border-radius: 999px;
      background: var(--p-surface-100);
      color: var(--p-primary-600);
      cursor: pointer;
      box-shadow: 0 0 0 1px var(--landing-border), var(--shadow-sm);
      font: inherit;
      transition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
    }

    .timeline-marker:hover {
      box-shadow: 0 0 0 0.35rem color-mix(in srgb, var(--p-primary-500) 10%, transparent), var(--shadow-md);
      transform: scale(1.04);
    }

    .timeline-marker.active {
      background: var(--p-primary-500);
      color: var(--p-primary-contrast-color);
      box-shadow: 0 0 0 0.35rem color-mix(in srgb, var(--p-primary-500) 16%, transparent), var(--shadow-md);
      transform: scale(1.08);
    }

    .timeline-marker .material-symbols-outlined {
      font-size: 1.45rem;
      line-height: 1;
    }

    .timeline-opposite {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-top: 0.55rem;
      text-align: right;
    }

    .timeline-opposite span {
      color: var(--p-primary-700);
      font-size: 0.82rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .timeline-opposite strong {
      color: var(--landing-muted);
      font-size: 0.9rem;
      font-weight: 700;
    }

    .timeline-card {
      padding: 1.15rem;
      min-height: 100%;
      border-radius: 0.8rem;
      border: 1px solid var(--landing-border);
      background: var(--landing-panel);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition:
        transform 0.25s ease,
        border-color 0.25s ease,
        box-shadow 0.25s ease,
        background-color 0.25s ease;
    }

    .timeline-card:hover,
    .timeline-card.active {
      transform: translateY(-0.2rem);
      border-color: color-mix(in srgb, var(--p-primary-500) 30%, var(--landing-border));
      background: color-mix(in srgb, var(--p-primary-500) 5%, var(--p-surface-0));
      box-shadow: var(--shadow-md);
    }

    .timeline-card-label {
      display: inline-flex;
      margin-bottom: 0.35rem;
      color: var(--p-primary-700);
      font-weight: 800;
      font-size: 0.88rem;
      text-transform: uppercase;
    }

    .timeline-card h3 {
      margin: 0 0 0.45rem;
      color: var(--p-text-color);
      font-size: 1.35rem;
    }

    .timeline-card p {
      margin: 0;
      color: var(--landing-muted);
      line-height: 1.65;
    }

    .active-stack {
      display: inline-flex;
      margin-top: 0.75rem;
      color: var(--p-primary-700);
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .active-highlights {
      display: grid;
      gap: 0.45rem;
      margin: 0.85rem 0 0;
      padding: 0;
      list-style: none;
      color: var(--landing-muted);
    }

    .active-highlights li {
      position: relative;
      padding-left: 1rem;
      line-height: 1.45;
    }

    .active-highlights li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.62em;
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 999px;
      background: var(--p-primary-500);
    }

    .scroll-enter {
      animation: scrollFadeUp 0.65s ease both;
    }

    .scroll-leave {
      opacity: 0;
      transform: translateY(1.25rem);
    }

    .features-section {
      background: var(--p-surface-0);
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1.25rem;
    }

    .feature-icon {
      display: grid;
      place-items: center;
      width: 3.2rem;
      height: 3.2rem;
      margin: 1.25rem 1.25rem 0;
      border-radius: 1rem;
      background: color-mix(in srgb, var(--p-primary-500) 12%, var(--p-surface-0));
      color: var(--p-primary-600);
    }

    .feature-icon i {
      font-size: 1.45rem;
    }

    .feature-card h3 {
      margin: 0 0 1rem;
      color: var(--p-text-color);
      font-size: 1.2rem;
    }

    .feature-card ul {
      display: grid;
      gap: 0.72rem;
      padding: 0;
      margin: 0;
      list-style: none;
      color: var(--landing-muted);
    }

    .feature-card li {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      line-height: 1.5;
    }

    .feature-card li i {
      margin-top: 0.2rem;
      color: var(--p-primary-500);
      font-size: 0.8rem;
    }

    .tech-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 1rem;
    }

    .tech-card {
      padding: 1.25rem;
      border: 1px solid var(--landing-border);
      border-radius: 1rem;
      background: var(--landing-panel);
      box-shadow: var(--shadow-sm);
    }

    .tech-logo {
      display: grid;
      place-items: center;
      width: 3.2rem;
      height: 3.2rem;
      margin-bottom: 0.9rem;
      border-radius: 0.9rem;
      background: var(--p-surface-0);
      border: 1px solid var(--landing-border);
      box-shadow: var(--shadow-sm);
    }

    .tech-logo img {
      display: block;
      width: 2.25rem;
      height: 2.25rem;
      object-fit: contain;
    }

    .tech-card strong {
      display: block;
      color: var(--p-primary-700);
      font-size: 1.05rem;
      margin-bottom: 0.45rem;
    }

    .tech-card p {
      margin: 0;
      color: var(--landing-muted);
      line-height: 1.55;
      font-size: 0.95rem;
    }

    .contribution-section {
      padding-top: 2rem;
    }

    .contribution-panel {
      position: relative;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 1.5rem;
      align-items: center;
      padding: 2rem;
      border-radius: 1.5rem;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--p-primary-700) 92%, #000 8%), var(--landing-deep));
      color: var(--p-primary-contrast-color);
      overflow: hidden;
      box-shadow: var(--shadow-xl);
    }

    .contribution-panel::after {
      content: '';
      position: absolute;
      inset: auto 4rem 0 auto;
      width: 16rem;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--landing-accent), transparent);
      opacity: 0.65;
    }

    .activity-mark {
      position: relative;
      display: grid;
      place-items: center;
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 1.25rem;
      background: color-mix(in srgb, #fff 12%, transparent);
      border: 1px solid color-mix(in srgb, #fff 20%, transparent);
    }

    .activity-mark i {
      position: relative;
      z-index: 2;
      font-size: 2rem;
      color: #fff;
    }

    .activity-mark span {
      position: absolute;
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 999px;
      background: var(--landing-accent);
      animation: activityPulse 3.4s ease-in-out infinite;
    }

    .activity-mark span:nth-child(2) {
      top: 0.75rem;
      right: 0.8rem;
    }

    .activity-mark span:nth-child(3) {
      bottom: 0.85rem;
      left: 0.85rem;
      animation-delay: 0.8s;
    }

    .activity-mark span:nth-child(4) {
      right: 1.05rem;
      bottom: 1rem;
      animation-delay: 1.45s;
    }

    .contribution-copy .section-kicker {
      color: var(--p-yellow-100);
      background: color-mix(in srgb, var(--landing-accent) 18%, transparent);
    }

    .contribution-copy h2 {
      color: var(--p-primary-contrast-color);
    }

    .contribution-copy p {
      max-width: 45rem;
      color: color-mix(in srgb, #fff 80%, transparent);
    }

    :host ::ng-deep {
      .project-timeline.p-timeline {
        max-width: 62rem;
        margin: 0 auto;
        padding: 1.2rem 1rem;
        border: 1px solid color-mix(in srgb, var(--p-primary-500) 14%, var(--landing-border));
        border-radius: 1rem;
        background: var(--landing-panel);
        box-shadow: var(--shadow-md);
      }

      .project-timeline .p-timeline-event {
        min-height: 11rem;
      }

      .project-timeline .p-timeline-event-opposite {
        flex: 0 0 11rem;
        padding: 0 1.2rem 0 0;
      }

      .project-timeline .p-timeline-event-content {
        padding: 0 0 1.2rem 1.2rem;
      }

      .project-timeline .p-timeline-event-separator {
        min-width: 3rem;
      }

      .project-timeline .p-timeline-event-connector {
        width: 2px;
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--p-primary-500) 52%, transparent),
          color-mix(in srgb, var(--p-primary-500) 12%, var(--landing-border))
        );
      }

      .landing-card {
        height: 100%;
        border-radius: 1rem;
        border: 1px solid var(--landing-border);
        box-shadow: var(--shadow-sm);
      }

      .landing-card .p-card-body {
        padding: 1.25rem;
      }

      .landing-page .p-button {
        font-weight: 700;
      }

      .landing-page .github-hero-button {
        border-color: color-mix(in srgb, #fff 72%, transparent);
        background: color-mix(in srgb, #fff 14%, transparent);
        color: #fff;
      }

      .landing-page .github-hero-button:hover {
        border-color: #fff;
        background: #fff;
        color: var(--p-primary-800);
      }

      .landing-page .contributing-button {
        border-color: color-mix(in srgb, #fff 76%, transparent);
        color: #fff;
      }

      .landing-page .contributing-button:hover {
        border-color: #fff;
        background: color-mix(in srgb, #fff 14%, transparent);
        color: #fff;
      }
    }

    @keyframes activityPulse {
      0%, 100% {
        opacity: 0.45;
        transform: scale(0.85);
      }

      50% {
        opacity: 1;
        transform: scale(1.18);
      }
    }

    @keyframes scrollFadeUp {
      from {
        opacity: 0;
        transform: translateY(1.25rem);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 1200px) {
      .feature-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .tech-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 900px) {
      .hero-grid,
      .contribution-panel {
        grid-template-columns: 1fr;
      }

      .hero-section {
        padding-top: 4rem;
      }

      .contribution-actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 640px) {
      .journey-section,
      .features-section,
      .technology-section,
      .contribution-section {
        padding: 3.5rem 0;
      }

      .hero-indicators {
        flex-direction: column;
        align-items: flex-start;
      }

      .hero-actions,
      .contribution-actions {
        flex-direction: column;
      }

      .timeline-card {
        padding: 1rem;
      }

      .timeline-opposite {
        padding-top: 0;
        text-align: left;
      }

      .feature-grid,
      .tech-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .scroll-enter,
      .scroll-leave,
      .timeline-marker,
      .timeline-card,
      .activity-mark span {
        animation: none;
        transition: none;
        transform: none;
      }
    }

    @media (max-width: 640px) {
      :host ::ng-deep {
        .project-timeline.p-timeline {
          padding: 0.9rem;
        }

        .project-timeline .p-timeline-event {
          min-height: auto;
        }

        .project-timeline .p-timeline-event-opposite {
          display: none;
        }

        .project-timeline .p-timeline-event-content {
          padding: 0 0 1rem 0.85rem;
        }

        .project-timeline .p-timeline-event-separator {
          min-width: 2.7rem;
        }
      }
    }
  `]
})
export class LandingPageComponent {
  private readonly router = inject(Router);
  readonly i18n = inject(LanguageService);

  readonly timelineMilestones: TimelineMilestone[] = [
    {
      title: 'Solar Planner v1',
      label: 'Foundation',
      author: 'Rayeen Hamada',
      description:
        'The first version established the core idea of a photovoltaic planning tool with production estimates, charts and report generation.',
      icon: 'foundation',
      stack: 'Angular 17, JavaScript and an earlier MEAN stack.',
      highlights: [
        'PVGIS-based photovoltaic estimation.',
        'Complete production charts for project analysis.',
        'PDF report generation for sharing results.',
      ],
    },
    {
      title: 'Solar Planner v2',
      label: 'Modernization',
      author: 'Santiago Linares',
      description:
        'The current version modernizes the application architecture, interface and calculation model while preserving the original planning purpose.',
      icon: 'bolt',
      stack: 'Angular 21.1, TypeScript 5.9, Express 5.2, Mongoose 9.6 and PrimeNG 21.1.',
      highlights: [
        'Modern look and feel aligned with the new Angular and PrimeNG stack.',
        'Own production model based on the NREL PVWatts V5 manual, reducing full dependency on PVGIS.',
        'Economic analytics with payback, ROI and long-term savings charts.',
      ],
    },
    {
      title: 'Open Evolution',
      label: 'Future Work',
      author: 'Planned extensions',
      description:
        'The project can evolve toward richer agrivoltaic, spatial and energy-flow analysis for more realistic photovoltaic planning.',
      icon: 'rocket_launch',
      stack: 'A scalable roadmap for physical feasibility, storage modeling and advanced simulation.',
      highlights: [
        'Crop-installation compatibility models to evaluate shading, orientation and agrivoltaic benefits.',
        '3D terrain and obstacle representation with dynamic annual shadow projection.',
        'Topology-aware panel layout plus inverter, battery, regulator, storage and energy-flow analysis.',
      ],
    },
  ];

  readonly featureCards: FeatureCard[] = [
    {
      title: 'Interactive Mapping',
      icon: 'pi pi-map',
      points: [
        'Draw and edit project areas',
        'Calculate selected surface',
        'OpenStreetMap-based visualization',
        'Import/export geospatial data if available',
      ],
    },
    {
      title: 'Production Analysis',
      icon: 'pi pi-chart-bar',
      points: [
        'Monthly production estimates',
        'System losses calculation',
        'External solar data integration',
        'Performance charts',
      ],
    },
    {
      title: 'Panel Optimization',
      icon: 'pi pi-bolt',
      points: [
        'Panel database support',
        'Configuration comparison',
        'Efficiency-oriented design',
        'Electrical setup preparation',
      ],
    },
    {
      title: 'PDF Reports',
      icon: 'pi pi-file-pdf',
      points: [
        'Professional project reports',
        'Executive summary',
        'Technical indicators',
        'Export-ready documentation',
      ],
    },
  ];

  readonly technologyCards: TechnologyCard[] = [
    {
      name: 'MongoDB',
      description: 'Flexible NoSQL persistence for projects and calculated data.',
      logoSrc: 'assets/tech/mongodb.svg',
    },
    {
      name: 'Express.js',
      description: 'Backend API layer for project and estimation services.',
      logoSrc: 'assets/tech/express.svg',
    },
    {
      name: 'Angular',
      description: 'Modular frontend framework for the web interface.',
      logoSrc: 'assets/tech/angular.svg',
    },
    {
      name: 'Node.js',
      description: 'Runtime environment for the server-side application.',
      logoSrc: 'assets/tech/nodejs.svg',
    },
    {
      name: 'TypeScript',
      description: 'Typed language layer that keeps the Angular and Node.js codebase safer.',
      logoSrc: 'assets/tech/typescript.svg',
    },
    {
      name: 'PrimeNG',
      description: 'UI component suite used to build a consistent interface.',
      logoSrc: 'assets/tech/primeng.png',
    },
  ];

  selectedMilestoneIndex = 0;

  get activeMilestone(): TimelineMilestone {
    return this.timelineMilestones[this.selectedMilestoneIndex];
  }

  goToEstimate(): void {
    void this.router.navigate(['/estimate']);
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  goToRegister(): void {
    void this.router.navigate(['/registration']);
  }

  openGithub(): void {
    window.open(environment.githubUrl, '_blank', 'noopener,noreferrer');
  }

  openContributing(): void {
    window.open(environment.githubContributingUrl, '_blank', 'noopener,noreferrer');
  }

  selectMilestone(index: number): void {
    this.selectedMilestoneIndex = index;
  }
}
