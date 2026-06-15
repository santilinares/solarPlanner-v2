import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import { environment } from '../../../../environments/environment';

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
  imports: [NgOptimizedImage, ButtonModule, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="landing-page">
      <section class="hero-section" aria-labelledby="hero-title">
        <div class="container hero-grid">
          <div class="hero-copy">
            <span class="eyebrow">Plan. Simulate. Optimize.</span>
            <h1 id="hero-title">Design better solar projects with confidence</h1>
            <p class="hero-subtitle">
              Solar Planner helps you design, simulate and evaluate photovoltaic installations using real data,
              technical indicators and clear visual reports.
            </p>

            <div class="hero-indicators" aria-label="Platform strengths">
              <span><i class="pi pi-check-circle" aria-hidden="true"></i> Accurate simulations</span>
              <span><i class="pi pi-database" aria-hidden="true"></i> Data-driven decisions</span>
              <span><i class="pi pi-leaf" aria-hidden="true"></i> Sustainable future</span>
            </div>

            <div class="hero-actions">
              <p-button
                label="Try Now"
                icon="pi pi-arrow-right"
                iconPos="right"
                [raised]="true"
                (onClick)="goToEstimate()"
              />
              <p-button
                label="View on GitHub"
                icon="pi pi-github"
                [outlined]="true"
                severity="secondary"
                (onClick)="openGithub()"
              />
            </div>
          </div>

          <div class="hero-visual" aria-label="Solar project planning preview">
            <div class="planner-mockup">
              <div class="mockup-toolbar">
                <span></span>
                <span></span>
                <span></span>
                <strong>Site estimate</strong>
              </div>
              <div class="mockup-body">
                <div class="map-canvas">
                  <div class="map-grid" aria-hidden="true"></div>
                  <div class="site-area" aria-hidden="true">
                    <div class="panel-field">
                      @for (panel of panelBlocks; track panel) {
                        <span class="panel-block"></span>
                      }
                    </div>
                  </div>
                  <div class="north-marker" aria-hidden="true">N</div>
                  <div class="map-scale" aria-hidden="true"></div>
                </div>
                <aside class="metrics-panel" aria-label="Example project metrics">
                  <header>
                    <span>PV feasibility</span>
                    <strong>High</strong>
                  </header>
                  @for (metric of heroMetrics; track metric.label) {
                    <div class="metric-row">
                      <span>{{ metric.label }}</span>
                      <strong>{{ metric.value }}</strong>
                    </div>
                  }
                </aside>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="documentation" class="journey-section" aria-labelledby="journey-title">
        <div class="container">
          <div class="section-heading">
            <span class="section-kicker">Roadmap</span>
            <h2 id="journey-title">Development Journey</h2>
            <p>From initial prototype to an evolving open-source platform.</p>
          </div>

          <div class="timeline-shell timeline-line-shell">
            <div class="timeline-topbar">
              <div class="timeline-progress-label">
                <span>{{ activeMilestone.label }}</span>
                <strong>{{ activeMilestone.title }}</strong>
              </div>
            </div>

            <div class="timeline-track" role="tablist" aria-label="Development milestones">
              @for (milestone of timelineMilestones; track milestone.title; let index = $index) {
                <button
                  type="button"
                  class="milestone"
                  role="tab"
                  [id]="'milestone-tab-' + index"
                  [attr.aria-selected]="selectedMilestoneIndex === index"
                  [attr.aria-controls]="'milestone-panel-' + index"
                  [class.active]="selectedMilestoneIndex === index"
                  (click)="selectMilestone(index)"
                >
                  <span class="milestone-node">
                    <span class="milestone-icon material-symbols-outlined" aria-hidden="true">{{ milestone.icon }}</span>
                  </span>
                  <span class="milestone-date">{{ milestone.label }}</span>
                  <span class="milestone-title">{{ milestone.title }}</span>
                </button>
              }
            </div>

            <article
              class="active-milestone"
              role="tabpanel"
              [id]="'milestone-panel-' + selectedMilestoneIndex"
              [attr.aria-labelledby]="'milestone-tab-' + selectedMilestoneIndex"
            >
              <span class="active-icon material-symbols-outlined" aria-hidden="true">
                {{ activeMilestone.icon }}
              </span>
              <div>
                <span>{{ activeMilestone.label }} · {{ activeMilestone.author }}</span>
                <h3>{{ activeMilestone.title }}</h3>
                <p>{{ activeMilestone.description }}</p>
                <strong class="active-stack">{{ activeMilestone.stack }}</strong>
                <ul class="active-highlights">
                  @for (highlight of activeMilestone.highlights; track highlight) {
                    <li>{{ highlight }}</li>
                  }
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="features-section" aria-labelledby="features-title">
        <div class="container">
          <div class="section-heading">
            <span class="section-kicker">Capabilities</span>
            <h2 id="features-title">Everything you need to design and evaluate solar projects</h2>
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

      <section class="technology-section" aria-labelledby="technology-title">
        <div class="container">
          <div class="section-heading compact">
            <span class="section-kicker">Stack</span>
            <h2 id="technology-title">Built with modern technologies</h2>
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

      <section class="contribution-section" aria-labelledby="contribution-title">
        <div class="container contribution-panel">
          <div class="activity-mark" aria-hidden="true">
            <i class="pi pi-github"></i>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="contribution-copy">
            <span class="section-kicker">Open source</span>
            <h2 id="contribution-title">Open to contributing. Built to evolve.</h2>
            <p>
              Solar Planner v2.0 is a Final Year Project designed as a solid foundation for future improvements.
              Contributions, issues and new ideas can help extend its technical and functional scope.
            </p>
          </div>
          <div class="contribution-actions">
            <p-button label="View on GitHub" icon="pi pi-github" (onClick)="openGithub()" />
            <p-button
              label="Star the Repository"
              icon="pi pi-star"
              [outlined]="true"
              severity="secondary"
              (onClick)="openGithub()"
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
      min-width: 0;
    }

    .planner-mockup {
      position: relative;
      border-radius: 1.5rem;
      overflow: hidden;
      background: color-mix(in srgb, var(--p-surface-0) 10%, transparent);
      border: 1px solid color-mix(in srgb, #fff 22%, transparent);
      box-shadow: 0 2rem 4rem color-mix(in srgb, #000 28%, transparent);
    }

    .mockup-toolbar {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.85rem 1rem;
      background: color-mix(in srgb, #001f18 68%, transparent);
      border-bottom: 1px solid color-mix(in srgb, #fff 14%, transparent);
    }

    .mockup-toolbar span {
      width: 0.62rem;
      height: 0.62rem;
      border-radius: 999px;
      background: color-mix(in srgb, #fff 28%, transparent);
    }

    .mockup-toolbar span:first-child {
      background: var(--landing-accent);
    }

    .mockup-toolbar strong {
      margin-left: 0.4rem;
      color: color-mix(in srgb, #fff 86%, transparent);
      font-size: 0.82rem;
      letter-spacing: 0;
    }

    .mockup-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 17rem;
      gap: 1rem;
      min-height: 28rem;
      padding: 1rem;
      background:
        radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--p-primary-300) 22%, transparent), transparent 28%),
        linear-gradient(145deg, var(--p-primary-800), var(--p-primary-600));
    }

    .map-canvas {
      position: relative;
      min-height: 25rem;
      overflow: hidden;
      border-radius: 1rem;
      background:
        linear-gradient(32deg, transparent 45%, color-mix(in srgb, #fff 20%, transparent) 46% 48%, transparent 49%),
        linear-gradient(118deg, transparent 42%, color-mix(in srgb, #fff 14%, transparent) 43% 45%, transparent 46%),
        linear-gradient(160deg, color-mix(in srgb, var(--p-green-900, #064e3b) 82%, #0ea5e9 18%), var(--p-primary-700));
      border: 1px solid color-mix(in srgb, #fff 18%, transparent);
    }

    .map-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(color-mix(in srgb, #fff 10%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, #fff 10%, transparent) 1px, transparent 1px);
      background-size: 3rem 3rem;
      opacity: 0.34;
      mask-image: linear-gradient(135deg, transparent, #000 18%, #000 82%, transparent);
    }

    .site-area {
      position: absolute;
      inset: 21% 12% 20% 10%;
      clip-path: polygon(10% 20%, 74% 8%, 94% 45%, 69% 91%, 20% 80%, 4% 47%);
      background: linear-gradient(135deg, color-mix(in srgb, var(--landing-accent) 24%, transparent), color-mix(in srgb, var(--p-green-500) 30%, transparent));
      border: 2px solid var(--landing-accent);
      box-shadow:
        inset 0 0 2.5rem color-mix(in srgb, var(--landing-accent) 12%, transparent),
        0 1rem 2rem color-mix(in srgb, #000 16%, transparent);
    }

    .panel-field {
      position: absolute;
      left: 16%;
      top: 28%;
      display: grid;
      grid-template-columns: repeat(4, 2.6rem);
      gap: 0.38rem;
      transform: rotate(-6deg);
    }

    .panel-block {
      width: 2.6rem;
      height: 1.25rem;
      border-radius: 0.28rem;
      background:
        linear-gradient(90deg, color-mix(in srgb, #fff 12%, transparent) 1px, transparent 1px),
        linear-gradient(180deg, var(--p-blue-900, #172554), var(--p-blue-700, #1d4ed8));
      background-size: 0.65rem 100%, 100% 100%;
      border: 1px solid color-mix(in srgb, #fff 32%, transparent);
      box-shadow: 0 0.5rem 1rem color-mix(in srgb, #000 18%, transparent);
    }

    .north-marker {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: grid;
      place-items: center;
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 999px;
      background: color-mix(in srgb, #fff 16%, transparent);
      border: 1px solid color-mix(in srgb, #fff 26%, transparent);
      color: #fff;
      font-size: 0.8rem;
      font-weight: 800;
    }

    .map-scale {
      position: absolute;
      left: 1rem;
      bottom: 1rem;
      width: 5rem;
      height: 0.35rem;
      border-right: 2px solid #fff;
      border-left: 2px solid #fff;
      border-bottom: 2px solid #fff;
      opacity: 0.72;
    }

    .metrics-panel {
      align-self: stretch;
      padding: 1rem;
      border-radius: 1rem;
      background: color-mix(in srgb, var(--p-surface-0) 94%, transparent);
      color: var(--p-text-color);
      box-shadow: var(--shadow-xl);
      backdrop-filter: blur(14px);
    }

    .metrics-panel header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.3rem;
      padding-bottom: 0.8rem;
      border-bottom: 1px solid var(--landing-border);
    }

    .metrics-panel header span {
      color: var(--landing-muted);
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .metrics-panel header strong {
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--p-green-500) 12%, transparent);
      color: var(--p-green-700, var(--p-green-500));
      font-size: 0.82rem;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.72rem 0;
      border-bottom: 1px solid var(--landing-border);
      font-size: 0.9rem;
    }

    .metric-row:last-child {
      border-bottom: 0;
    }

    .metric-row span {
      color: var(--landing-muted);
    }

    .metric-row strong {
      color: var(--p-primary-700);
      white-space: nowrap;
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

    .timeline-shell {
      padding: 1.4rem;
      border: 1px solid color-mix(in srgb, var(--p-primary-500) 14%, var(--landing-border));
      border-radius: 1.25rem;
      background: var(--landing-panel);
      box-shadow: var(--shadow-md);
    }

    .timeline-line-shell {
      overflow: hidden;
    }

    .timeline-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.45rem;
    }

    .timeline-progress-label {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      min-width: 0;
    }

    .timeline-progress-label span {
      color: var(--p-primary-700);
      font-size: 0.88rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .timeline-progress-label strong {
      color: var(--p-text-color);
      font-size: 1.05rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .milestone:focus-visible,
    .tech-card:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .timeline-track {
      display: grid;
      grid-template-columns: repeat(3, minmax(10rem, 1fr));
      gap: 1rem;
      overflow-x: auto;
      padding: 1rem 0.15rem 1.35rem;
      scrollbar-width: thin;
      position: relative;
    }

    .timeline-track::before {
      content: '';
      position: absolute;
      top: 2.62rem;
      left: 9%;
      right: 9%;
      height: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--p-primary-500) 70%, transparent), color-mix(in srgb, var(--p-primary-500) 16%, var(--landing-border)));
    }

    .milestone {
      position: relative;
      z-index: 1;
      display: grid;
      justify-items: center;
      gap: 0.45rem;
      min-height: 7rem;
      padding: 0.2rem 0.65rem 0.6rem;
      border: 0;
      border-radius: 1rem;
      background: transparent;
      color: var(--p-text-color);
      text-align: center;
      cursor: pointer;
      transition: transform 0.25s ease, background-color 0.25s ease, color 0.25s ease;
    }

    .milestone:hover,
    .milestone.active {
      transform: translateY(-0.22rem);
      background: color-mix(in srgb, var(--p-primary-500) 7%, transparent);
    }

    .milestone-node {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border: 4px solid var(--p-surface-0);
      border-radius: 999px;
      background: var(--p-surface-100);
      color: var(--p-primary-600);
      box-shadow: 0 0 0 1px var(--landing-border), var(--shadow-sm);
      transition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
    }

    .milestone:hover .milestone-node {
      box-shadow: 0 0 0 0.35rem color-mix(in srgb, var(--p-primary-500) 10%, transparent), var(--shadow-md);
      transform: scale(1.04);
    }

    .milestone.active .milestone-node {
      background: var(--p-primary-500);
      color: var(--p-primary-contrast-color);
      box-shadow: 0 0 0 0.35rem color-mix(in srgb, var(--p-primary-500) 16%, transparent), var(--shadow-md);
      transform: scale(1.08);
    }

    .milestone-icon,
    .active-icon {
      font-size: 1.7rem;
      line-height: 1;
    }

    .milestone-date {
      color: var(--landing-muted);
      font-size: 0.82rem;
      font-weight: 700;
    }

    .milestone-title {
      font-weight: 800;
      line-height: 1.25;
      max-width: 12rem;
    }

    .active-milestone {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.15rem;
      border-radius: 1rem;
      background: color-mix(in srgb, var(--p-primary-500) 8%, var(--p-surface-0));
      border: 1px solid color-mix(in srgb, var(--p-primary-500) 18%, var(--landing-border));
      transition: background-color 0.25s ease, border-color 0.25s ease;
    }

    .active-milestone span:not(.active-icon) {
      color: var(--p-primary-700);
      font-weight: 800;
      font-size: 0.88rem;
    }

    .active-milestone h3 {
      margin: 0.2rem 0 0.35rem;
      color: var(--p-text-color);
      font-size: 1.35rem;
    }

    .active-milestone p {
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

      .mockup-body {
        grid-template-columns: 1fr;
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

      .mockup-body {
        padding: 0.75rem;
      }

      .map-canvas {
        min-height: 20rem;
      }

      .panel-field {
        left: 16%;
        grid-template-columns: repeat(3, 2.7rem);
      }

      .panel-block {
        width: 2.7rem;
      }

      .timeline-shell {
        padding: 1rem;
      }

      .timeline-topbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .timeline-track {
        grid-template-columns: 1fr;
        overflow-x: visible;
        padding-top: 0;
      }

      .timeline-track::before {
        top: 1.6rem;
        bottom: 1.6rem;
        left: 1.6rem;
        right: auto;
        width: 3px;
        height: auto;
      }

      .milestone {
        grid-template-columns: 3rem 1fr;
        justify-items: start;
        align-items: center;
        min-height: auto;
        text-align: left;
      }

      .milestone-node {
        grid-row: span 2;
      }

      .milestone-title {
        max-width: none;
      }

      .milestone-date {
        align-self: end;
      }

      .milestone-title {
        align-self: start;
      }

      .active-milestone {
        min-height: auto;
      }

      .active-milestone {
        flex-direction: column;
      }

      .feature-grid,
      .tech-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .milestone,
      .activity-mark span {
        animation: none;
        transition: none;
      }
    }
  `]
})
export class LandingPageComponent {
  private readonly router = inject(Router);

  readonly panelBlocks = Array.from({ length: 16 }, (_, index) => index);

  readonly heroMetrics = [
    { label: 'Annual Production', value: '125.4 MWh' },
    { label: 'ROI', value: '18.7 %' },
    { label: 'Payback Period', value: '6.2 years' },
    { label: 'CO₂ Saved / year', value: '48.2 t' },
  ] as const;

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
      label: 'Refactor',
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
      label: 'Next',
      author: 'Open-source direction',
      description:
        'The project is prepared as a stronger base for future technical improvements, validation work and collaborative development.',
      icon: 'rocket_launch',
      stack: 'A maintainable TypeScript codebase designed to keep evolving.',
      highlights: [
        'Cleaner structure for extending calculation and reporting modules.',
        'Room for stronger validation against external datasets and real installations.',
        'Repository ready for issues, contributions and future thesis work.',
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

  selectMilestone(index: number): void {
    this.selectedMilestoneIndex = index;
  }
}
