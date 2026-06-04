import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { EnergyPriceSuggestion, GeoPoint, OptimalConfig, Panel, ProjectCreateRequest } from '../../../core/models';
import { PanelService, ProjectService } from '../../../core/services';

type WizardStep = 0 | 1 | 2 | 3;

@Component({
  selector: 'app-add-project',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="add-project">
      <header class="page-header">
        <div>
          <p class="eyebrow">Solar installation project</p>
          <h1>Create a project</h1>
        </div>
        <div class="progress" aria-label="Project creation progress">
          @for (step of steps; track step.label; let index = $index) {
            <button
              type="button"
              class="step"
              [class.active]="currentStep() === index"
              [class.complete]="currentStep() > index"
              (click)="goToStep(index)"
            >
              <span>{{ index + 1 }}</span>
              {{ step.label }}
            </button>
          }
        </div>
      </header>

      @if (errorMessage()) {
        <p class="alert error" role="alert">{{ errorMessage() }}</p>
      }

      <section class="wizard-shell">
        @switch (currentStep()) {
          @case (0) {
            <form class="step-panel" [formGroup]="projectForm">
              <div class="section-title">
                <p class="eyebrow">Step 1</p>
                <h2>Project basics</h2>
              </div>

              <label>
                Project name
                <input type="text" formControlName="name" placeholder="Home rooftop Madrid" />
              </label>

              <div class="field-grid">
                <label>
                  Country
                  <select formControlName="country" (change)="loadEnergyPriceSuggestion()">
                    <option value="ES">Spain</option>
                    <option value="PT">Portugal</option>
                    <option value="FR">France</option>
                    <option value="DE">Germany</option>
                    <option value="IT">Italy</option>
                  </select>
                </label>

                <label>
                  Currency
                  <input type="text" formControlName="currency" />
                </label>
              </div>

              <div class="price-box">
                <div>
                  <label>
                    Energy price
                    <input type="number" min="0" step="0.0001" formControlName="energyPrice" />
                  </label>
                  <small>{{ projectForm.controls.currency.value }}/kWh</small>
                </div>
                <button type="button" class="secondary" (click)="loadEnergyPriceSuggestion()" [disabled]="priceLoading()">
                  {{ priceLoading() ? 'Checking market...' : 'Refresh market suggestion' }}
                </button>
              </div>

              @if (priceSuggestion()) {
                <p class="alert info">
                  Suggested {{ priceSuggestion()!.price | number: '1.3-4' }} {{ priceSuggestion()!.currency }}/kWh
                  from {{ priceSuggestion()!.source === 'entsoe' ? 'ENTSO-E day-ahead market data' : 'a regional fallback' }}.
                  Update this field if the bill has a different contracted price.
                </p>
              }
            </form>
          }

          @case (1) {
            <form class="step-panel" [formGroup]="siteForm">
              <div class="section-title">
                <p class="eyebrow">Step 2</p>
                <h2>Roof and location</h2>
              </div>

              <div class="field-grid">
                <label>
                  Latitude
                  <input type="number" min="-90" max="90" step="0.000001" formControlName="latitude" (change)="refreshOptimalConfig()" />
                </label>

                <label>
                  Longitude
                  <input type="number" min="-180" max="180" step="0.000001" formControlName="longitude" />
                </label>
              </div>

              <label>
                Usable roof area
                <input type="number" min="1" step="0.1" formControlName="surfaceArea" (change)="refreshOptimalConfig()" />
                <small>m2 available for panels. The map/drawing flow can replace this later with the measured polygon.</small>
              </label>

              <div class="map-preview" aria-label="Roof area preview">
                <div class="roof-shape"></div>
                <div>
                  <strong>{{ siteForm.controls.surfaceArea.value | number: '1.0-0' }} m2</strong>
                  <span>usable roof polygon preview</span>
                </div>
              </div>
            </form>
          }

          @case (2) {
            <form class="step-panel" [formGroup]="configForm">
              <div class="section-title">
                <p class="eyebrow">Step 3</p>
                <h2>Installation configuration</h2>
              </div>

              <label>
                Panel model
                <select formControlName="panelId" (change)="refreshOptimalConfig()">
                  <option value="">Use default 430 W panel</option>
                  @for (panel of panels(); track panel._id) {
                    <option [value]="panel._id">{{ panel.name }} - {{ panel.capacity }} W</option>
                  }
                </select>
              </label>

              <div class="field-grid">
                <label>
                  Tilt
                  <input type="number" min="0" max="90" step="1" formControlName="tilt" (change)="refreshOptimalConfig()" />
                </label>

                <label>
                  Direction
                  <select formControlName="direction">
                    <option value="south">South</option>
                    <option value="south-east">South-east</option>
                    <option value="south-west">South-west</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                  </select>
                </label>
              </div>

              <div class="field-grid">
                <label>
                  Row spacing
                  <input type="number" min="0.1" step="0.1" formControlName="rawSpacing" />
                </label>

                <label>
                  Number of panels
                  <input type="number" min="1" step="1" formControlName="panelNumber" />
                </label>
              </div>

              <div class="recommendation">
                <div>
                  <p class="eyebrow">Optimal configuration</p>
                  @if (optimalLoading()) {
                    <h3>Calculating...</h3>
                  } @else if (optimalConfig()) {
                    <h3>{{ optimalConfig()!.recommendedPanels }} panels</h3>
                    <p>
                      {{ optimalConfig()!.estimatedCapacity | number: '1.1-2' }} kW,
                      {{ optimalConfig()!.estimatedProduction | number: '1.0-0' }} kWh/year,
                      {{ optimalConfig()!.coverage | number: '1.0-0' }}% roof coverage.
                    </p>
                  } @else {
                    <h3>Ready when site data is valid</h3>
                    <p>Fill the roof area and panel dimensions to calculate one consistent recommendation.</p>
                  }
                </div>
                <button type="button" class="secondary" (click)="applyOptimalConfig()" [disabled]="!optimalConfig()">
                  Apply recommendation
                </button>
              </div>

              @if (isModifiedFromOptimal()) {
                <p class="alert warning">
                  This configuration differs from the optimal recommendation. That can be useful for budget,
                  aesthetics, or roof constraints, but the estimate below will use your custom panel count.
                </p>
              }
            </form>
          }

          @case (3) {
            <section class="review">
              <div class="section-title">
                <p class="eyebrow">Step 4</p>
                <h2>Review project</h2>
              </div>

              <div class="review-hero">
                <div>
                  <p class="eyebrow">Ready to create</p>
                  <h3>{{ projectForm.controls.name.value || 'Untitled project' }}</h3>
                  <p>
                    {{ configForm.controls.panelNumber.value }} panels facing
                    {{ configForm.controls.direction.value }} at {{ configForm.controls.tilt.value }} degrees.
                  </p>
                </div>
                <div class="capacity-badge">
                  <span>{{ estimatedCustomCapacity() | number: '1.1-2' }}</span>
                  kW
                </div>
              </div>

              <div class="summary-grid">
                <article>
                  <span>Energy price</span>
                  <strong>{{ projectForm.controls.energyPrice.value | number: '1.3-4' }} {{ projectForm.controls.currency.value }}/kWh</strong>
                  <small>Editable suggestion; verify against the bill.</small>
                </article>
                <article>
                  <span>Roof area</span>
                  <strong>{{ siteForm.controls.surfaceArea.value | number: '1.0-0' }} m2</strong>
                  <small>Converted into a project polygon for now.</small>
                </article>
                <article>
                  <span>Annual production</span>
                  <strong>{{ estimatedCustomProduction() | number: '1.0-0' }} kWh</strong>
                  <small>Scaled from the single optimal calculation.</small>
                </article>
                <article [class.warn-card]="isModifiedFromOptimal()">
                  <span>Recommendation</span>
                  <strong>{{ optimalConfig()?.recommendedPanels || configForm.controls.panelNumber.value }} panels</strong>
                  <small>{{ isModifiedFromOptimal() ? 'User-customized panel count.' : 'Using optimal panel count.' }}</small>
                </article>
              </div>
            </section>
          }
        }

        <footer class="wizard-actions">
          <button type="button" class="secondary" (click)="previousStep()" [disabled]="currentStep() === 0">
            Back
          </button>

          @if (currentStep() < 3) {
            <button type="button" class="primary" (click)="nextStep()">Continue</button>
          } @else {
            <button type="button" class="primary" (click)="submitProject()" [disabled]="submitting()">
              {{ submitting() ? 'Creating...' : 'Create project' }}
            </button>
          }
        </footer>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .add-project {
      color: #1b1f23;
      max-width: 1120px;
      margin: 0 auto;
    }

    .page-header {
      display: grid;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1 {
      font-size: 2rem;
      line-height: 1.15;
    }

    h2 {
      font-size: 1.35rem;
    }

    h3 {
      font-size: 1.2rem;
    }

    .eyebrow {
      color: #5c6670;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .progress {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .step {
      align-items: center;
      background: #f3f6f6;
      border: 1px solid #d7e0df;
      border-radius: 8px;
      color: #34403f;
      cursor: pointer;
      display: flex;
      font-weight: 700;
      gap: 0.5rem;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      text-align: left;
    }

    .step span {
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd8d6;
      border-radius: 50%;
      display: inline-flex;
      flex: 0 0 1.6rem;
      height: 1.6rem;
      justify-content: center;
      width: 1.6rem;
    }

    .step.active,
    .step.complete {
      background: #0f6b5f;
      border-color: #0f6b5f;
      color: #ffffff;
    }

    .wizard-shell,
    .step-panel,
    .review {
      display: grid;
      gap: 1.25rem;
    }

    .wizard-shell {
      background: #ffffff;
      border: 1px solid #dfe7e5;
      border-radius: 8px;
      box-shadow: 0 10px 24px rgba(25, 39, 36, 0.08);
      padding: 1.25rem;
    }

    .section-title {
      display: grid;
      gap: 0.25rem;
    }

    label {
      color: #2d3735;
      display: grid;
      font-weight: 700;
      gap: 0.45rem;
    }

    input,
    select {
      background: #ffffff;
      border: 1px solid #c9d5d3;
      border-radius: 8px;
      color: #1b1f23;
      font: inherit;
      min-height: 44px;
      padding: 0.65rem 0.75rem;
      width: 100%;
    }

    input:focus,
    select:focus,
    button:focus-visible {
      outline: 3px solid rgba(15, 107, 95, 0.25);
      outline-offset: 2px;
    }

    small {
      color: #62706d;
      font-weight: 500;
    }

    .field-grid,
    .price-box,
    .summary-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .price-box {
      align-items: end;
    }

    .alert {
      border-radius: 8px;
      line-height: 1.45;
      padding: 0.85rem 1rem;
    }

    .alert.info {
      background: #eaf5f2;
      border: 1px solid #b8dcd4;
      color: #174c44;
    }

    .alert.warning {
      background: #fff8e6;
      border: 1px solid #efd48d;
      color: #614a08;
    }

    .alert.error {
      background: #fff0f0;
      border: 1px solid #e6bbbb;
      color: #7a2020;
      margin-bottom: 1rem;
    }

    .map-preview {
      align-items: center;
      background: #f4f7f5;
      border: 1px solid #dce6e1;
      border-radius: 8px;
      display: flex;
      gap: 1rem;
      min-height: 140px;
      padding: 1rem;
    }

    .roof-shape {
      aspect-ratio: 1;
      background:
        linear-gradient(135deg, rgba(15, 107, 95, 0.18) 25%, transparent 25%) 0 0 / 18px 18px,
        #dbece6;
      border: 2px solid #0f6b5f;
      clip-path: polygon(12% 18%, 88% 8%, 78% 92%, 20% 80%);
      flex: 0 0 110px;
    }

    .map-preview div:last-child {
      display: grid;
      gap: 0.25rem;
    }

    .recommendation,
    .review-hero {
      align-items: center;
      background: #eef6f3;
      border: 1px solid #c8ded8;
      border-radius: 8px;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding: 1rem;
    }

    .recommendation div,
    .review-hero div:first-child {
      display: grid;
      gap: 0.35rem;
    }

    .capacity-badge {
      align-items: center;
      background: #173f3a;
      border-radius: 8px;
      color: #ffffff;
      display: grid;
      flex: 0 0 120px;
      justify-items: center;
      min-height: 96px;
      padding: 0.75rem;
    }

    .capacity-badge span {
      font-size: 1.8rem;
      font-weight: 800;
    }

    .summary-grid article {
      background: #fbfcfc;
      border: 1px solid #dfe7e5;
      border-radius: 8px;
      display: grid;
      gap: 0.4rem;
      min-height: 118px;
      padding: 1rem;
    }

    .summary-grid span {
      color: #5c6670;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .summary-grid strong {
      font-size: 1.25rem;
    }

    .summary-grid .warn-card {
      background: #fffaf0;
      border-color: #efd48d;
    }

    .wizard-actions {
      border-top: 1px solid #e5ecea;
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding-top: 1rem;
    }

    button {
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      min-height: 44px;
      padding: 0.65rem 1rem;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .primary {
      background: #0f6b5f;
      border: 1px solid #0f6b5f;
      color: #ffffff;
    }

    .secondary {
      background: #ffffff;
      border: 1px solid #b9c8c5;
      color: #20302d;
    }

    @media (max-width: 760px) {
      .progress,
      .field-grid,
      .price-box,
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .step {
        min-width: 0;
      }

      .recommendation,
      .review-hero,
      .map-preview {
        align-items: stretch;
        flex-direction: column;
      }

      .capacity-badge {
        flex-basis: auto;
      }

      .wizard-actions {
        flex-direction: column-reverse;
      }
    }
  `]
})
export class AddProjectComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly panelService = inject(PanelService);
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);

  readonly steps = [
    { label: 'Basics' },
    { label: 'Roof' },
    { label: 'Configuration' },
    { label: 'Review' },
  ];

  readonly currentStep = signal<WizardStep>(0);
  readonly panels = signal<Panel[]>([]);
  readonly optimalConfig = signal<OptimalConfig | null>(null);
  readonly priceSuggestion = signal<EnergyPriceSuggestion | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly optimalLoading = signal(false);
  readonly priceLoading = signal(false);
  readonly submitting = signal(false);

  readonly projectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    country: ['ES', Validators.required],
    currency: ['EUR', Validators.required],
    energyPrice: [0.22, [Validators.required, Validators.min(0)]],
  });

  readonly siteForm = this.fb.nonNullable.group({
    latitude: [40.4168, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [-3.7038, [Validators.required, Validators.min(-180), Validators.max(180)]],
    surfaceArea: [80, [Validators.required, Validators.min(1)]],
  });

  readonly configForm = this.fb.nonNullable.group({
    panelId: [''],
    tilt: [30, [Validators.required, Validators.min(0), Validators.max(90)]],
    direction: ['south', Validators.required],
    rawSpacing: [1.2, [Validators.required, Validators.min(0.1)]],
    panelNumber: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadPanels();
    this.loadEnergyPriceSuggestion();
    this.refreshOptimalConfig();
  }

  goToStep(step: number): void {
    if (step < 0 || step > 3) {
      return;
    }

    this.currentStep.set(step as WizardStep);
  }

  nextStep(): void {
    if (!this.isCurrentStepValid()) {
      this.errorMessage.set('Please complete the required fields before continuing.');
      return;
    }

    this.errorMessage.set(null);
    this.currentStep.update((step) => Math.min(step + 1, 3) as WizardStep);
  }

  previousStep(): void {
    this.errorMessage.set(null);
    this.currentStep.update((step) => Math.max(step - 1, 0) as WizardStep);
  }

  loadEnergyPriceSuggestion(): void {
    const country = this.projectForm.controls.country.value;
    this.priceLoading.set(true);

    this.projectService.getEnergyPriceSuggestion(country).pipe(
      catchError(() => of({
        price: 0.22,
        currency: 'EUR',
        country,
        source: 'fallback' as const,
        message: 'Using a regional default because the market suggestion is unavailable.',
      })),
      finalize(() => this.priceLoading.set(false))
    ).subscribe((suggestion) => {
      this.priceSuggestion.set(suggestion);
      this.projectForm.patchValue({
        currency: suggestion.currency,
        energyPrice: suggestion.price,
      });
    });
  }

  refreshOptimalConfig(): void {
    if (this.siteForm.invalid || this.configForm.controls.tilt.invalid) {
      this.optimalConfig.set(null);
      return;
    }

    const panel = this.selectedPanel();
    this.optimalLoading.set(true);

    this.projectService.calculateOptimalConfig({
      surfaceArea: this.siteForm.controls.surfaceArea.value,
      panelWidth: this.dimensionInMeters(panel?.width ?? 1.134),
      panelHeight: this.dimensionInMeters(panel?.height ?? 1.722),
      tilt: this.configForm.controls.tilt.value,
      latitude: this.siteForm.controls.latitude.value,
    }).pipe(
      catchError(() => of(null)),
      finalize(() => this.optimalLoading.set(false))
    ).subscribe((config) => {
      this.optimalConfig.set(config);

      if (config && this.configForm.controls.panelNumber.value === 1) {
        this.configForm.controls.panelNumber.setValue(config.recommendedPanels);
      }
    });
  }

  applyOptimalConfig(): void {
    const config = this.optimalConfig();

    if (!config) {
      return;
    }

    this.configForm.controls.panelNumber.setValue(config.recommendedPanels);
  }

  isModifiedFromOptimal(): boolean {
    const config = this.optimalConfig();
    return !!config && this.configForm.controls.panelNumber.value !== config.recommendedPanels;
  }

  estimatedCustomCapacity(): number {
    const panelCapacityWatts = this.selectedPanel()?.capacity ?? 430;
    return (this.configForm.controls.panelNumber.value * panelCapacityWatts) / 1000;
  }

  selectedPanel(): Panel | null {
    const panelId = this.configForm.controls.panelId.value;
    return this.panels().find((panel) => panel._id === panelId) ?? null;
  }

  estimatedCustomProduction(): number {
    const config = this.optimalConfig();

    if (!config || config.recommendedPanels === 0) {
      const peakSunHours = 5.5 - Math.abs(this.siteForm.controls.latitude.value) * 0.02;
      return this.estimatedCustomCapacity() * peakSunHours * 365 * 0.85;
    }

    return config.estimatedProduction * (this.configForm.controls.panelNumber.value / config.recommendedPanels);
  }

  submitProject(): void {
    if (this.projectForm.invalid || this.siteForm.invalid || this.configForm.invalid) {
      this.errorMessage.set('Please review the form before creating the project.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.projectService.createProject(this.buildCreateRequest()).pipe(
      finalize(() => this.submitting.set(false))
    ).subscribe({
      next: (project) => this.router.navigate(['/projects', project._id]),
      error: () => this.errorMessage.set('The project could not be created. Please check the values and try again.'),
    });
  }

  private loadPanels(): void {
    this.panelService.getAllPanels(1, 100).pipe(
      catchError(() => of({ data: [], total: 0, page: 1, limit: 100, totalPages: 1 }))
    ).subscribe((response) => {
      this.panels.set(response.data);
      this.refreshOptimalConfig();
    });
  }

  private isCurrentStepValid(): boolean {
    if (this.currentStep() === 0) {
      this.projectForm.markAllAsTouched();
      return this.projectForm.valid;
    }

    if (this.currentStep() === 1) {
      this.siteForm.markAllAsTouched();
      return this.siteForm.valid;
    }

    if (this.currentStep() === 2) {
      this.configForm.markAllAsTouched();
      return this.configForm.valid;
    }

    return true;
  }

  private buildCreateRequest(): ProjectCreateRequest {
    const panelId = this.configForm.controls.panelId.value;

    return {
      name: this.projectForm.controls.name.value,
      area: this.buildSquarePolygon(),
      tilt: this.configForm.controls.tilt.value,
      direction: this.configForm.controls.direction.value,
      rawSpacing: this.configForm.controls.rawSpacing.value,
      panelNumber: Math.round(this.configForm.controls.panelNumber.value),
      ...(panelId ? { panelId } : {}),
      country: this.projectForm.controls.country.value,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: this.projectForm.controls.currency.value,
      price: this.projectForm.controls.energyPrice.value,
    };
  }

  private buildSquarePolygon(): GeoPoint[] {
    const lat = this.siteForm.controls.latitude.value;
    const lon = this.siteForm.controls.longitude.value;
    const sideMeters = Math.sqrt(this.siteForm.controls.surfaceArea.value);
    const latOffset = (sideMeters / 2) / 111_320;
    const lonOffset = (sideMeters / 2) / (111_320 * Math.cos((lat * Math.PI) / 180));

    return [
      { lat: lat - latOffset, lon: lon - lonOffset },
      { lat: lat - latOffset, lon: lon + lonOffset },
      { lat: lat + latOffset, lon: lon + lonOffset },
      { lat: lat + latOffset, lon: lon - lonOffset },
    ];
  }

  private dimensionInMeters(value: number): number {
    return value > 20 ? value / 1000 : value;
  }
}
