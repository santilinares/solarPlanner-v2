import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { StepperModule } from 'primeng/stepper';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';

import { ProjectService } from '@core/services/project.service';
import { PanelService } from '@core/services/panel.service';
import {
  ProjectResponse,
  Panel,
  Coordinates,
  GeoPoint,
  ProjectUpdateRequest,
  OptimalConfigResponse,
  OptimalConfigFromPolygonRequest,
} from '@core/models';
import { LocationMapComponent } from '@shared/components/location-map/location-map.component';

interface OrientationOption {
  label: string;
  value: string;
  icon: string;
}

interface TimezoneOption {
  label: string;
  value: string;
}

interface CurrencyOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-configure-project',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    StepperModule,
    FloatLabelModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    MessageModule,
    SkeletonModule,
    TooltipModule,
    LocationMapComponent,
  ],
  template: `
    <section class="configure-page animate-fade-in-up">
      <!-- Loading skeleton -->
      @if (isLoading()) {
        <div class="skeleton-wrapper">
          <p-skeleton width="40%" height="2.5rem" borderRadius="16px" />
          <p-skeleton width="60%" height="1rem" class="mt-3" borderRadius="8px" />
          <div class="skeleton-stepper mt-6">
            <p-skeleton width="100%" height="4rem" borderRadius="16px" />
            <p-skeleton width="100%" height="24rem" class="mt-4" borderRadius="24px" />
          </div>
        </div>
      }

      <!-- Error state -->
      @else if (errorMessage()) {
        <div class="error-wrapper">
          <p-card class="error-card">
            <div class="error-content">
              <i class="pi pi-exclamation-triangle error-icon"></i>
              <h2>Something went wrong</h2>
              <p>{{ errorMessage() }}</p>
              <p-button
                label="Back to Projects"
                icon="pi pi-arrow-left"
                routerLink="/projects/all"
                severity="secondary"
                [rounded]="true"
              />
            </div>
          </p-card>
        </div>
      }

      <!-- Main content -->
      @else if (projectData()) {
        <header class="page-header">
          <a class="back-link" [routerLink]="'/projects/' + projectId()">
            <i class="pi pi-arrow-left"></i>
            Back to Project
          </a>
          <div class="header-row">
            <div class="header-title-area">
              <div class="editable-name-wrapper">
                <input
                  type="text"
                  class="editable-name"
                  [formControl]="configForm.controls.name"
                  placeholder="Project Name"
                  autocomplete="off"
                  spellcheck="false"
                />
                <i class="pi pi-pencil editable-name-hint"></i>
              </div>
              <p class="subtitle">
                <i class="pi pi-cog"></i>
                Configure your solar project
              </p>
            </div>
            <p-tag
              [value]="hasUnsavedChanges() ? 'Unsaved Changes' : 'All Saved'"
              [severity]="hasUnsavedChanges() ? 'warn' : 'success'"
              [rounded]="true"
              [icon]="hasUnsavedChanges() ? 'pi pi-pencil' : 'pi pi-check'"
            />
          </div>
        </header>

        <!-- ─── Sticky Navigation Bar ─── -->
        <div class="step-nav-bar">
          <p-button
            label="Back"
            icon="pi pi-arrow-left"
            severity="secondary"
            [rounded]="true"
            [disabled]="activeStep() === 1"
            (onClick)="activeStep.set(activeStep() - 1)"
            size="small"
          />
          <span class="step-nav-indicator">
            Step {{ activeStep() }} of 2 — <strong>{{ stepNavTitle() }}</strong>
          </span>
          @if (activeStep() < 2) {
            <p-button
              [label]="stepNextLabel()"
              icon="pi pi-arrow-right"
              iconPos="right"
              [rounded]="true"
              (onClick)="activeStep.set(activeStep() + 1)"
              size="small"
            />
          } @else {
            <p-button
              label="Save Changes"
              icon="pi pi-check"
              [rounded]="true"
              [loading]="isSaving()"
              [disabled]="!canSave()"
              (onClick)="onSave()"
              size="small"
            />
          }
        </div>

        <p-stepper [(value)]="activeStep" class="configure-stepper">
          <p-step-list>
            <p-step [value]="1">
              <ng-template #content let-activateCallback="activateCallback" let-value="value">
                <button
                  class="step-btn"
                  (click)="activateCallback()"
                  [class.step-active]="value <= activeStep()"
                >
                  <span class="step-icon-wrapper" [class.active]="value <= activeStep()">
                    <i class="pi pi-sun"></i>
                  </span>
                  <span class="step-label">Panel Setup</span>
                </button>
              </ng-template>
            </p-step>
            <p-step [value]="2">
              <ng-template #content let-activateCallback="activateCallback" let-value="value">
                <button
                  class="step-btn"
                  (click)="activateCallback()"
                  [class.step-active]="value <= activeStep()"
                >
                  <span class="step-icon-wrapper" [class.active]="value <= activeStep()">
                    <i class="pi pi-check-circle"></i>
                  </span>
                  <span class="step-label">Review & Save</span>
                </button>
              </ng-template>
            </p-step>
          </p-step-list>

          <p-step-panels>
            <!-- ════════ STEP 1: Panel Setup (metadata strip + 2×2 Grid) ════════ -->
            <p-step-panel [value]="1">
              <ng-template #content>
                <!-- ── Metadata Strip ── -->
                <div class="metadata-strip" [formGroup]="configForm">
                  <p-tag [value]="formValue().country || 'Search a location'" icon="pi pi-globe" [rounded]="true" pTooltip="Auto-detected from location search" />
                  <p-tag [value]="timezoneLabel()" icon="pi pi-clock" [rounded]="true" pTooltip="Auto-detected from country" />
                  <div class="meta-separator"></div>
                  <div class="meta-editable">
                    <label for="strip-currency">Currency</label>
                    <p-select
                      [options]="currencyOptions"
                      optionLabel="label"
                      optionValue="value"
                      formControlName="currency"
                      inputId="strip-currency"
                      appendTo="body"
                      [style]="{ 'min-width': '130px' }"
                    />
                  </div>
                  <div class="meta-editable">
                    <label for="strip-price">Energy Price</label>
                    <p-inputnumber
                      formControlName="price"
                      inputId="strip-price"
                      mode="decimal"
                      [minFractionDigits]="2"
                      [maxFractionDigits]="4"
                      [min]="0"
                      [maxlength]="16"
                      [placeholder]="'Price of KW/h'"
                      suffix=" /kWh"
                      [style]="{ 'max-width': '170px' }"
                    />
                  </div>
                </div>

                <div class="setup-grid">
                  <!-- ── Location & Area (top-left) ── -->
                  <div class="step-card map-edit-card">
                    <div class="step-card-header">
                      <div class="step-card-icon location-icon">
                        <i class="pi pi-map-marker"></i>
                      </div>
                      <div>
                        <h2>Location & Area</h2>
                        <p>Search for an address and draw the installation area polygon.</p>
                      </div>
                    </div>

                    <p-divider />

                    <div class="location-search">
                      <span class="p-input-icon-right location-search-input">
                        <input
                          pInputText
                          type="text"
                          placeholder="Search address or place…"
                          [value]="addressQuery()"
                          (input)="addressQuery.set($any($event.target).value)"
                          (keydown.enter)="searchAddress()"
                          aria-label="Search location"
                          class="w-full"
                        />
                      </span>
                      <p-button
                        icon="pi pi-search"
                        [rounded]="true"
                        [loading]="isSearching()"
                        [disabled]="isSearching() || !addressQuery().trim()"
                        (onClick)="searchAddress()"
                        pTooltip="Search location"
                        aria-label="Go to location"
                        size="small"
                      />
                    </div>
                    @if (searchError()) {
                      <small class="field-error">{{ searchError() }}</small>
                    }

                    <div class="map-container">
                      <app-location-map
                        [editable]="true"
                        [centerOnUser]="mapLat() == null || mapLng() == null"
                        [center]="mapCenter()"
                        [lat]="mapLat() ?? 0"
                        [lng]="mapLng() ?? 0"
                        [polygon]="polygonCoords()"
                        (polygonChange)="onPolygonChange($event)"
                      />
                    </div>

                    @if (polygonCoords().length === 0) {
                      <div class="map-instructions">
                        <i class="pi pi-info-circle"></i>
                        <span>Use the polygon draw tool on the map to define the installation area.</span>
                      </div>
                    } @else {
                      <div class="map-status">
                        <i class="pi pi-check-circle"></i>
                        <span>Polygon defined with {{ polygonCoords().length }} points</span>
                      </div>
                    }
                  </div>

                  <!-- ── Panel & Installation (top-right) ── -->
                  <div class="step-card">
                    <div class="step-card-header">
                      <div class="step-card-icon panel-icon">
                        <i class="pi pi-sun"></i>
                      </div>
                      <div>
                        <h2>Panel & Installation</h2>
                        <p>Configure solar panel type, tilt, orientation and layout.</p>
                      </div>
                    </div>

                    <p-divider />

                    <form [formGroup]="configForm" class="form-grid">
                      <div class="form-field full-width">
                        <p-floatlabel variant="on">
                          <p-select
                            [options]="panelsWithLabel()"
                            optionLabel="displayLabel"
                            optionValue="id"
                            formControlName="panelId"
                            inputId="panelId"
                            [filter]="true"
                            filterBy="brand,model"
                            placeholder="Choose a panel"
                            class="w-full"
                          >
                            <ng-template #selectedItem let-selectedPanel>
                              @if (selectedPanel) {
                                <div class="panel-option">
                                  <strong>{{ selectedPanel.brand }} {{ selectedPanel.model }}</strong>
                                  <span class="panel-watts">{{ selectedPanel.wattPeak }}W</span>
                                </div>
                              }
                            </ng-template>
                            <ng-template #item let-panel>
                              <div class="panel-option">
                                <div>
                                  <strong>{{ panel.brand }} {{ panel.model }}</strong>
                                  <small class="panel-meta">
                                    {{ panel.wattPeak }}W · {{ panel.efficiency }}% eff · {{ panel.technology }}
                                  </small>
                                </div>
                                <span class="panel-watts">{{ panel.wattPeak }}W</span>
                              </div>
                            </ng-template>
                          </p-select>
                          <label for="panelId">Solar Panel</label>
                        </p-floatlabel>
                      </div>

                      <div class="form-field">
                        <p-floatlabel variant="on">
                          <p-inputnumber
                            formControlName="panelNumber"
                            inputId="panelNumber"
                            [showButtons]="true"
                            [min]="1"
                            [max]="9999"
                            class="w-full"
                          />
                          <label for="panelNumber">Number of Panels</label>
                        </p-floatlabel>
                      </div>

                      <div class="form-field">
                        <p-floatlabel variant="on">
                          <p-inputnumber
                            formControlName="tilt"
                            inputId="tilt"
                            [showButtons]="true"
                            [min]="0"
                            [max]="90"
                            suffix="°"
                            class="w-full"
                          />
                          <label for="tilt">Tilt / Inclination</label>
                        </p-floatlabel>
                      </div>

                      <div class="form-field">
                        <p-floatlabel variant="on">
                          <p-select
                            [options]="orientationOptions"
                            optionLabel="label"
                            optionValue="value"
                            formControlName="direction"
                            inputId="direction"
                            placeholder="Select orientation"
                            class="w-full"
                          >
                            <ng-template #selectedItem let-opt>
                              @if (opt) {
                                <span><i [class]="opt.icon" class="mr-2"></i>{{ opt.label }}</span>
                              }
                            </ng-template>
                            <ng-template #item let-opt>
                              <span><i [class]="opt.icon" class="mr-2"></i>{{ opt.label }}</span>
                            </ng-template>
                          </p-select>
                          <label for="direction">Orientation / Direction</label>
                        </p-floatlabel>
                      </div>

                      <div class="form-field">
                        <p-floatlabel variant="on">
                          <p-inputnumber
                            formControlName="azimuth"
                            inputId="azimuth"
                            [showButtons]="true"
                            [min]="0"
                            [max]="360"
                            suffix="°"
                            class="w-full"
                          />
                          <label for="azimuth">Azimuth</label>
                        </p-floatlabel>
                        <small class="field-hint">0° = North, 180° = South</small>
                      </div>

                      <div class="form-field">
                        <p-floatlabel variant="on">
                          <p-inputnumber
                            formControlName="rawSpacing"
                            inputId="rawSpacing"
                            mode="decimal"
                            [minFractionDigits]="1"
                            [maxFractionDigits]="2"
                            [min]="0"
                            suffix=" m"
                            class="w-full"
                          />
                          <label for="rawSpacing">Row Spacing</label>
                        </p-floatlabel>
                      </div>
                    </form>
                  </div>

                  <!-- ── 3D View Placeholder (bottom-left) ── -->
                  <div class="step-card placeholder-3d-card">
                    <div class="step-card-header">
                      <div class="step-card-icon threedee-icon">
                        <i class="pi pi-box"></i>
                      </div>
                      <div>
                        <h2>3D Installation View</h2>
                        <p>Visual preview of the planned installation.</p>
                      </div>
                    </div>

                    <p-divider />

                    <div class="placeholder-content">
                      <i class="pi pi-box placeholder-main-icon"></i>
                      <span class="placeholder-title">Coming Soon</span>
                      <span class="placeholder-text">
                        Interactive 3D preview of your solar panel installation will appear here.
                      </span>
                    </div>
                  </div>

                  <!-- ── Live Capacity Preview (bottom-right) ── -->
                  <div class="step-card capacity-preview-card">
                    <div class="step-card-header">
                      <div class="step-card-icon capacity-icon">
                        <i class="pi pi-bolt"></i>
                      </div>
                      <div>
                        <h2>Live Capacity Preview</h2>
                        <p>Real-time estimation based on your configuration.</p>
                      </div>
                      <p-tag
                        [value]="isUsingOptimalConfig() ? 'Optimal' : 'Custom'"
                        [severity]="isUsingOptimalConfig() ? 'success' : 'info'"
                        [rounded]="true"
                        [icon]="isUsingOptimalConfig() ? 'pi pi-check-circle' : 'pi pi-pencil'"
                        class="config-badge"
                      />
                    </div>

                    <p-divider />

                    @if (isCalculating()) {
                      <div class="calculating-state">
                        <p-skeleton width="100%" height="3rem" borderRadius="12px" />
                        <p-skeleton width="100%" height="3rem" borderRadius="12px" />
                        <p-skeleton width="100%" height="4rem" borderRadius="12px" />
                      </div>
                    } @else if (selectedPanelData(); as sp) {
                      <div class="capacity-grid">
                        <div class="capacity-item">
                          <span class="capacity-label">Selected Panel</span>
                          <strong>{{ sp.brand }} {{ sp.model }}</strong>
                        </div>
                        <div class="capacity-item">
                          <span class="capacity-label">Panel Power</span>
                          <strong>{{ sp.wattPeak }} W</strong>
                        </div>
                        <div class="capacity-item">
                          <span class="capacity-label">Total Panels</span>
                          <strong>{{ formValue().panelNumber || 0 }}</strong>
                        </div>
                        <div class="capacity-item highlight">
                          <span class="capacity-label">Total Capacity</span>
                          <strong>{{ totalCapacityKw() | number: '1.1-2' }} kW</strong>
                        </div>
                        @if (optimalConfig(); as oc) {
                          <div class="capacity-item">
                            <span class="capacity-label">Est. Annual Production</span>
                            <strong>{{ oc.estimatedProduction | number: '1.0-0' }} kWh/yr</strong>
                          </div>
                          <div class="capacity-item">
                            <span class="capacity-label">Area Coverage</span>
                            <strong>{{ oc.coverage | number: '1.0-1' }}%</strong>
                          </div>
                        }
                      </div>
                      @if (!isUsingOptimalConfig() && optimalConfig()) {
                        <div class="optimal-hint">
                          <i class="pi pi-info-circle"></i>
                          <span>Custom configuration active.</span>
                          <button class="link-btn" (click)="applyOptimalConfig()">
                            Restore optimal ({{ optimalConfig()!.recommendedPanels }} panels)
                          </button>
                        </div>
                      }
                    } @else {
                      <div class="no-panel-message">
                        <i class="pi pi-info-circle"></i>
                        <span>Select a panel to see the capacity preview.</span>
                      </div>
                    }
                  </div>
                </div>
              </ng-template>
            </p-step-panel>

            <!-- ════════ STEP 2: Review & Save ════════ -->
            <p-step-panel [value]="2">
              <ng-template #content>
                <div class="step-content">
                  <div class="review-grid">
                    <!-- Project & Metadata Summary -->
                    <div class="step-card review-card">
                      <div class="review-card-header">
                        <h3><i class="pi pi-file-edit"></i> Project & Metadata</h3>
                      </div>
                      <p-divider />
                      <div class="review-items">
                        <div class="review-item">
                          <span>Project Name</span>
                          <strong>{{ formValue().name || '—' }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Country</span>
                          <strong>{{ formValue().country || '—' }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Timezone</span>
                          <strong>{{ formValue().timezone || '—' }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Currency</span>
                          <strong>{{ formValue().currency || '—' }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Energy Price</span>
                          <strong>{{ formValue().price != null ? (formValue().price | number: '1.2-4') + '/kWh' : '—' }}</strong>
                        </div>
                      </div>
                    </div>

                    <!-- Location & Area Summary -->
                    <div class="step-card review-card">
                      <div class="review-card-header">
                        <h3><i class="pi pi-map-marker"></i> Location & Area</h3>
                        <p-button
                          icon="pi pi-pencil"
                          [rounded]="true"
                          [text]="true"
                          size="small"
                          pTooltip="Edit Location"
                          (onClick)="activeStep.set(1)"
                        />
                      </div>
                      <p-divider />
                      <div class="review-items">
                        <div class="review-item">
                          <span>Coordinates</span>
                          <strong>{{ locationSummary() }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Installation Area</span>
                          <strong>{{ polygonCoords().length >= 3 ? polygonCoords().length + ' points defined' : 'Not defined' }}</strong>
                        </div>
                        @if (optimalConfig(); as oc) {
                          <div class="review-item">
                            <span>Area Coverage</span>
                            <strong>{{ oc.coverage | number: '1.0-1' }}%</strong>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Panel & Installation Summary -->
                    <div class="step-card review-card">
                      <div class="review-card-header">
                        <h3><i class="pi pi-sun"></i> Panel & Installation</h3>
                        <p-button
                          icon="pi pi-pencil"
                          [rounded]="true"
                          [text]="true"
                          size="small"
                          pTooltip="Edit Panel Setup"
                          (onClick)="activeStep.set(1)"
                        />
                      </div>
                      <p-divider />
                      <div class="review-items">
                        <div class="review-item">
                          <span>Solar Panel</span>
                          <strong>{{ selectedPanelLabel() }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Number of Panels</span>
                          <strong>{{ formValue().panelNumber || '—' }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Tilt</span>
                          <strong>{{ formValue().tilt != null ? formValue().tilt + '°' : '—' }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Direction</span>
                          <strong>{{ selectedDirectionLabel() }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Azimuth</span>
                          <strong>{{ formValue().azimuth != null ? formValue().azimuth + '°' : '—' }}</strong>
                        </div>
                        <div class="review-item">
                          <span>Row Spacing</span>
                          <strong>{{ formValue().rawSpacing != null ? formValue().rawSpacing + ' m' : '—' }}</strong>
                        </div>
                      </div>
                    </div>

                    <!-- Capacity Summary -->
                    <div class="step-card review-card">
                      <div class="review-card-header">
                        <h3><i class="pi pi-bolt"></i> Capacity</h3>
                        <p-tag
                          [value]="isUsingOptimalConfig() ? 'Optimal' : 'Custom'"
                          [severity]="isUsingOptimalConfig() ? 'success' : 'info'"
                          [rounded]="true"
                          [icon]="isUsingOptimalConfig() ? 'pi pi-check-circle' : 'pi pi-pencil'"
                        />
                      </div>
                      <p-divider />
                      <div class="review-items">
                        <div class="review-item">
                          <span>Total Capacity</span>
                          <strong>{{ totalCapacityKw() | number: '1.1-2' }} kW</strong>
                        </div>
                        @if (optimalConfig(); as oc) {
                          <div class="review-item">
                            <span>Est. Annual Production</span>
                            <strong>{{ oc.estimatedProduction | number: '1.0-0' }} kWh/yr</strong>
                          </div>
                          <div class="review-item">
                            <span>Area Coverage</span>
                            <strong>{{ oc.coverage | number: '1.0-1' }}%</strong>
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Total capacity highlight card -->
                  <div class="step-card total-capacity-card">
                    <div class="total-capacity-content">
                      <div class="capacity-sun-icon">
                        <i class="pi pi-sun"></i>
                      </div>
                      <div class="capacity-info">
                        <span>Estimated Total Capacity</span>
                        <strong>{{ totalCapacityKw() | number: '1.1-2' }} kW</strong>
                      </div>
                    </div>
                  </div>

                  @if (saveError()) {
                    <p-message severity="error" [text]="saveError()!" class="w-full" />
                  }

                  @if (saveSuccess()) {
                    <p-message
                      severity="success"
                      text="Project updated successfully!"
                      class="w-full"
                    />
                  }
                </div>
              </ng-template>
            </p-step-panel>
          </p-step-panels>
        </p-stepper>
      }
    </section>
  `,
  styles: [
    `
      /* ─── Page Layout ─── */
      .configure-page {
        max-width: 1280px;
        margin: 0 auto;
        padding: 1.5rem;
      }

      /* ─── Skeleton Loading ─── */
      .skeleton-wrapper {
        padding: 2rem 0;
      }
      .skeleton-stepper {
        display: flex;
        flex-direction: column;
      }

      /* ─── Error State ─── */
      .error-wrapper {
        display: flex;
        justify-content: center;
        padding: 4rem 1rem;
      }
      :host ::ng-deep .error-card {
        max-width: 480px;
        text-align: center;
        border-radius: 24px !important;
      }
      .error-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }
      .error-icon {
        font-size: 3rem;
        color: var(--p-red-500);
      }
      .error-content h2 {
        margin: 0;
        color: var(--p-text-color);
      }
      .error-content p {
        color: var(--p-text-muted-color);
        margin: 0;
      }

      /* ─── Header ─── */
      .page-header {
        margin-bottom: 1rem;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: var(--p-primary-color);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 600;
        transition: color 0.2s;
      }
      .back-link:hover {
        color: var(--p-text-color);
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .header-row h1 {
        margin: 0;
        font-size: clamp(1.75rem, 3vw, 2.25rem);
        font-weight: 800;
        color: var(--p-text-color);
      }
      .subtitle {
        color: var(--p-text-muted-color);
        margin: 0.25rem 0 0;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      /* ─── Inline Editable Name ─── */
      .header-title-area {
        flex: 1;
        min-width: 0;
      }
      .editable-name-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        position: relative;
      }
      .editable-name {
        font-size: clamp(1.75rem, 3vw, 2.25rem);
        font-weight: 800;
        color: var(--p-text-color);
        border: none;
        background: transparent;
        outline: none;
        width: 100%;
        padding: 0.1rem 0;
        border-bottom: 2px solid transparent;
        transition: border-color 0.25s ease;
        font-family: inherit;
        line-height: 1.2;
      }
      .editable-name:hover {
        border-bottom-color: var(--p-primary-200);
      }
      .editable-name:focus {
        border-bottom-color: var(--p-primary-color);
      }
      .editable-name::placeholder {
        color: var(--p-text-muted-color);
      }
      .editable-name-hint {
        font-size: 0.85rem;
        color: var(--p-text-muted-color);
        flex-shrink: 0;
        pointer-events: none;
        transition: color 0.2s;
      }
      .editable-name-wrapper:focus-within .editable-name-hint {
        color: var(--p-primary-color);
      }

      /* ─── Metadata Strip ─── */
      .metadata-strip {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        background: transparent;
        flex-wrap: wrap;
      }
      .meta-separator {
        width: 1px;
        height: 28px;
        background: var(--p-content-border-color);
        flex-shrink: 0;
      }
      .meta-editable {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.75rem;
        background: var(--p-tag-primary-background);
        color: var(--p-tag-primary-color);
        font-size: var(--p-tag-font-size);
        font-weight: var(--p-tag-font-weight);
        border-radius: var(--p-tag-rounded-border-radius);
        white-space: nowrap;
      }
      .meta-editable label {
        font-weight: inherit;
        color: inherit;
        white-space: nowrap;
      }
      :host ::ng-deep .meta-editable .p-select,
      :host ::ng-deep .meta-editable .p-inputnumber {
        font-size: inherit;
      }
      :host ::ng-deep .meta-editable .p-select .p-select-label,
      :host ::ng-deep .meta-editable .p-inputnumber .p-inputnumber-input {
        padding: 0rem 0.5rem;
        font-size: inherit;
        font-weight: inherit;
        color: inherit;
        background: transparent;
        border: none;
        box-shadow: none;
        text-align: right;
      }
      :host ::ng-deep .meta-editable .p-select {
        background: transparent;
        border: none;
        box-shadow: none;
      }
      :host ::ng-deep .meta-editable .p-inputnumber-input {
        background: transparent;
        border: none;
        box-shadow: none;
      }

      /* ─── Sticky Navigation Bar ─── */
      .step-nav-bar {
        position: sticky;
        top: 0;
        z-index: 100;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.65rem 1.25rem;
        margin-bottom: 1rem;
        background: color-mix(in srgb, var(--p-surface-0) 92%, transparent);
        backdrop-filter: blur(12px);
        border: 1px solid var(--p-content-border-color);
        border-radius: 16px;
        box-shadow: 0 2px 8px color-mix(in srgb, var(--p-text-color) 8%, transparent);
      }
      .step-nav-indicator {
        font-size: 0.9rem;
        color: var(--p-text-muted-color);
        font-weight: 500;
      }
      .step-nav-indicator strong {
        color: var(--p-text-color);
      }

      /* ─── Stepper Custom Steps ─── */
      .step-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        transition: all 0.25s;
      }
      .step-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--p-content-border-color);
        color: var(--p-primary-color);
        font-size: 1.1rem;
        transition: all 0.3s ease;
      }
      .step-icon-wrapper.active {
        background: var(--p-primary-color);
        border-color: var(--p-primary-color);
        color: var(--p-primary-contrast-color);
        box-shadow: 0 4px 14px color-mix(in srgb, var(--p-primary-color) 32%, transparent);
      }
      .step-label {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--p-text-muted-color);
      }

      /* ─── Step Content Area ─── */
      .step-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem 0;
      }

      /* ─── Setup Grid (Step 2 — 2×2 layout) ─── */
      .setup-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        padding: 1.5rem 0;
      }

      /* ─── Step Cards ─── */
      .step-card {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        border-radius: 24px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px color-mix(in srgb, var(--p-text-color) 10%, transparent);
        transition: box-shadow 0.25s, border-color 0.25s;
      }
      .step-card:hover {
        box-shadow: 0 4px 16px color-mix(in srgb, var(--p-text-color) 14%, transparent);
      }

      .step-card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .step-card-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--p-text-color);
      }
      .step-card-header p {
        margin: 0.25rem 0 0;
        color: var(--p-text-muted-color);
        font-size: 0.85rem;
      }

      .step-card-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
      }
      .general-icon {
        background: linear-gradient(135deg, var(--p-green-100), var(--p-green-300));
        color: var(--p-green-800);
      }
      .panel-icon {
        background: linear-gradient(135deg, var(--p-amber-100), var(--p-yellow-400));
        color: var(--p-amber-900);
      }
      .location-icon {
        background: linear-gradient(135deg, var(--p-sky-100), var(--p-cyan-400));
        color: var(--p-cyan-900);
      }
      .threedee-icon {
        background: linear-gradient(135deg, var(--p-indigo-100), var(--p-indigo-400));
        color: var(--p-indigo-900);
      }
      .capacity-icon {
        background: linear-gradient(135deg, var(--p-amber-100), var(--p-yellow-400));
        color: var(--p-amber-900);
      }

      /* ─── Form Grid ─── */
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-top: 0.5rem;
      }
      .form-field.full-width {
        grid-column: 1 / -1;
      }
      .w-full {
        width: 100%;
      }
      .mr-2 {
        margin-right: 0.5rem;
      }

      .field-error {
        color: var(--p-red-500);
        font-size: 0.8rem;
        margin-top: 0.35rem;
        display: block;
      }
      .field-hint {
        color: var(--p-text-muted-color);
        font-size: 0.8rem;
        margin-top: 0.35rem;
        display: block;
      }

      /* ─── Location Map ─── */
      .location-search {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }
      .location-search-input {
        flex: 1;
      }
      .map-container {
        height: 320px;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid var(--p-content-border-color);
      }
      .map-instructions,
      .map-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding: 0.6rem 1rem;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .map-instructions {
        background: color-mix(in srgb, var(--p-amber-100) 60%, var(--p-surface-0));
        color: var(--p-amber-800);
      }
      .map-status {
        background: color-mix(in srgb, var(--p-green-100) 65%, var(--p-surface-0));
        color: var(--p-green-800);
      }

      /* ─── Panel Option Template ─── */
      .panel-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        width: 100%;
      }
      .panel-option strong {
        color: var(--p-text-color);
      }
      .panel-meta {
        display: block;
        color: var(--p-text-muted-color);
        font-size: 0.8rem;
        margin-top: 0.15rem;
      }
      .panel-watts {
        font-weight: 700;
        color: var(--p-primary-color);
        white-space: nowrap;
      }

      /* ─── 3D Placeholder ─── */
      .placeholder-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 220px;
        gap: 0.75rem;
        text-align: center;
      }
      .placeholder-main-icon {
        font-size: 3.5rem;
        color: var(--p-indigo-400);
        opacity: 0.35;
      }
      .placeholder-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--p-text-color);
      }
      .placeholder-text {
        font-size: 0.85rem;
        color: var(--p-text-muted-color);
        max-width: 300px;
        line-height: 1.45;
      }

      /* ─── Capacity Preview ─── */
      .config-badge {
        margin-left: auto;
        flex-shrink: 0;
      }
      .capacity-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      .capacity-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.75rem;
        background: var(--p-content-hover-background);
        border-radius: 12px;
      }
      .capacity-item.highlight {
        grid-column: 1 / -1;
        background: linear-gradient(135deg, var(--p-amber-100) 0%, var(--p-yellow-400) 100%);
        text-align: center;
      }
      .capacity-item.highlight strong {
        font-size: 1.3rem;
        color: var(--p-text-color);
      }
      .capacity-label {
        font-size: 0.8rem;
        color: var(--p-text-muted-color);
        font-weight: 500;
      }
      .capacity-item strong {
        color: var(--p-text-color);
        font-weight: 700;
      }
      .calculating-state {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .no-panel-message {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        border-radius: 12px;
        background: var(--p-content-hover-background);
        color: var(--p-text-muted-color);
        font-size: 0.88rem;
      }

      /* ─── Optimal Config Hint ─── */
      .optimal-hint {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding: 0.6rem 1rem;
        border-radius: 12px;
        font-size: 0.85rem;
        background: color-mix(in srgb, var(--p-primary-100) 45%, var(--p-surface-0));
        color: var(--p-text-color);
      }
      .link-btn {
        background: none;
        border: none;
        color: var(--p-primary-color);
        font-weight: 700;
        cursor: pointer;
        text-decoration: underline;
        font-size: 0.85rem;
        padding: 0;
      }
      .link-btn:hover {
        color: var(--p-text-color);
      }

      /* ─── Review Grid ─── */
      .review-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }
      .review-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .review-card-header h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--p-text-color);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .review-items {
        display: flex;
        flex-direction: column;
      }
      .review-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 0.55rem 0;
        border-bottom: 1px solid var(--p-content-border-color);
        color: var(--p-text-muted-color);
        font-size: 0.9rem;
      }
      .review-item:last-child {
        border-bottom: none;
      }
      .review-item strong {
        color: var(--p-text-color);
        font-weight: 700;
        text-align: right;
      }

      /* ─── Total Capacity Highlight ─── */
      .total-capacity-card {
        background: linear-gradient(
          135deg,
          var(--p-amber-100) 0%,
          var(--p-yellow-400) 50%,
          var(--p-yellow-300) 100%
        );
        border-color: var(--p-yellow-400);
      }
      .total-capacity-content {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }
      .capacity-sun-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--p-surface-0) 60%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        color: var(--p-amber-900);
        box-shadow: 0 0 20px color-mix(in srgb, var(--p-yellow-400) 45%, transparent);
        flex-shrink: 0;
      }
      .capacity-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .capacity-info span {
        font-size: 0.95rem;
        color: var(--p-amber-900);
        font-weight: 500;
      }
      .capacity-info strong {
        font-size: 2rem;
        font-weight: 800;
        color: var(--p-text-color);
      }

      /* ─── Responsive ─── */
      @media (max-width: 960px) {
        .setup-grid {
          grid-template-columns: 1fr;
        }
        .metadata-strip {
          gap: 0.5rem;
        }
      }
      @media (max-width: 768px) {
        .configure-page {
          padding: 1rem;
        }
        .form-grid {
          grid-template-columns: 1fr;
        }
        .review-grid {
          grid-template-columns: 1fr;
        }
        .capacity-grid {
          grid-template-columns: 1fr;
        }
        .step-label {
          display: none;
        }
        .total-capacity-content {
          flex-direction: column;
          text-align: center;
        }
        .capacity-info strong {
          font-size: 1.5rem;
        }
        .step-nav-bar {
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }
        .step-nav-indicator {
          order: -1;
          width: 100%;
          text-align: center;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class ConfigureProjectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly projectService = inject(ProjectService);
  private readonly panelService = inject(PanelService);
  private readonly destroyRef = inject(DestroyRef);

  // ─── State ───
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isCalculating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly projectData = signal<ProjectResponse | null>(null);
  readonly panels = signal<Panel[]>([]);
  readonly projectId = signal('');
  activeStep = signal(1);

  // ─── Map / Location State ───
  readonly mapLat = signal<number | null>(null);
  readonly mapLng = signal<number | null>(null);
  readonly polygonCoords = signal<Coordinates[]>([]);
  readonly addressQuery = signal('');
  readonly isSearching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly mapCenter = signal<Coordinates | null>(null);
  readonly polygonEdited = signal(false);

  // ─── Optimal Config State ───
  readonly optimalConfig = signal<OptimalConfigResponse | null>(null);

  // ─── Country → Currency / Timezone Mappings ───
  private readonly COUNTRY_CURRENCY: Record<string, string> = {
    us: 'USD', gb: 'GBP', jp: 'JPY', cn: 'CNY', in: 'INR',
    au: 'AUD', ca: 'CAD', ch: 'CHF', ar: 'ARS', br: 'BRL',
    cl: 'CLP', mx: 'MXN', co: 'COP', nz: 'AUD',
    // Eurozone
    de: 'EUR', fr: 'EUR', es: 'EUR', it: 'EUR', pt: 'EUR',
    nl: 'EUR', be: 'EUR', at: 'EUR', ie: 'EUR', fi: 'EUR',
    gr: 'EUR', ee: 'EUR', lt: 'EUR', lv: 'EUR', sk: 'EUR',
    si: 'EUR', cy: 'EUR', mt: 'EUR', lu: 'EUR', hr: 'EUR',
  };

  private readonly COUNTRY_TIMEZONE: Record<string, string> = {
    us: 'America/New_York', gb: 'Europe/London', jp: 'Asia/Tokyo',
    cn: 'Asia/Singapore', in: 'Asia/Kolkata', au: 'Australia/Sydney',
    ca: 'America/New_York', ch: 'Europe/Berlin', nz: 'Pacific/Auckland',
    ar: 'America/Argentina/Buenos_Aires', br: 'America/Argentina/Buenos_Aires',
    cl: 'America/Halifax', mx: 'America/Chicago', co: 'America/New_York',
    ru: 'Europe/Moscow', ae: 'Asia/Dubai', pk: 'Asia/Karachi',
    bd: 'Asia/Dhaka', th: 'Asia/Bangkok', sg: 'Asia/Singapore',
    // Europe
    de: 'Europe/Berlin', fr: 'Europe/Berlin', es: 'Europe/Berlin',
    it: 'Europe/Berlin', pt: 'Europe/London', nl: 'Europe/Berlin',
    be: 'Europe/Berlin', at: 'Europe/Berlin', ie: 'Europe/London',
    fi: 'Europe/Athens', gr: 'Europe/Athens', ee: 'Europe/Athens',
    lt: 'Europe/Athens', lv: 'Europe/Athens', sk: 'Europe/Berlin',
    si: 'Europe/Berlin', cy: 'Europe/Athens', mt: 'Europe/Berlin',
    lu: 'Europe/Berlin', hr: 'Europe/Berlin',
  };

  // ─── Options ───
  readonly orientationOptions: OrientationOption[] = [
    { label: 'South', value: 'south', icon: 'pi pi-arrow-down' },
    { label: 'South-East', value: 'southeast', icon: 'pi pi-arrow-down-right' },
    { label: 'South-West', value: 'southwest', icon: 'pi pi-arrow-down-left' },
    { label: 'East', value: 'east', icon: 'pi pi-arrow-right' },
    { label: 'West', value: 'west', icon: 'pi pi-arrow-left' },
    { label: 'North', value: 'north', icon: 'pi pi-arrow-up' },
    { label: 'North-East', value: 'northeast', icon: 'pi pi-arrow-up-right' },
    { label: 'North-West', value: 'northwest', icon: 'pi pi-arrow-up-left' },
  ];

  readonly timezoneOptions: TimezoneOption[] = [
    { label: 'UTC-12:00', value: 'Etc/GMT+12' },
    { label: 'UTC-11:00', value: 'Pacific/Midway' },
    { label: 'UTC-10:00 (Hawaii)', value: 'Pacific/Honolulu' },
    { label: 'UTC-09:00 (Alaska)', value: 'America/Anchorage' },
    { label: 'UTC-08:00 (Pacific)', value: 'America/Los_Angeles' },
    { label: 'UTC-07:00 (Mountain)', value: 'America/Denver' },
    { label: 'UTC-06:00 (Central)', value: 'America/Chicago' },
    { label: 'UTC-05:00 (Eastern)', value: 'America/New_York' },
    { label: 'UTC-04:00 (Atlantic)', value: 'America/Halifax' },
    { label: 'UTC-03:00 (Buenos Aires)', value: 'America/Argentina/Buenos_Aires' },
    { label: 'UTC-02:00', value: 'Atlantic/South_Georgia' },
    { label: 'UTC-01:00 (Azores)', value: 'Atlantic/Azores' },
    { label: 'UTC+00:00 (London)', value: 'Europe/London' },
    { label: 'UTC+01:00 (Berlin/Paris)', value: 'Europe/Berlin' },
    { label: 'UTC+02:00 (Athens/Cairo)', value: 'Europe/Athens' },
    { label: 'UTC+03:00 (Moscow)', value: 'Europe/Moscow' },
    { label: 'UTC+04:00 (Dubai)', value: 'Asia/Dubai' },
    { label: 'UTC+05:00 (Karachi)', value: 'Asia/Karachi' },
    { label: 'UTC+05:30 (Mumbai)', value: 'Asia/Kolkata' },
    { label: 'UTC+06:00 (Dhaka)', value: 'Asia/Dhaka' },
    { label: 'UTC+07:00 (Bangkok)', value: 'Asia/Bangkok' },
    { label: 'UTC+08:00 (Singapore)', value: 'Asia/Singapore' },
    { label: 'UTC+09:00 (Tokyo)', value: 'Asia/Tokyo' },
    { label: 'UTC+10:00 (Sydney)', value: 'Australia/Sydney' },
    { label: 'UTC+11:00', value: 'Pacific/Noumea' },
    { label: 'UTC+12:00 (Auckland)', value: 'Pacific/Auckland' },
  ];

  readonly currencyOptions: CurrencyOption[] = [
    { label: 'USD ($)', value: 'USD' },
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'GBP (£)', value: 'GBP' },
    { label: 'ARS ($)', value: 'ARS' },
    { label: 'BRL (R$)', value: 'BRL' },
    { label: 'CLP ($)', value: 'CLP' },
    { label: 'MXN ($)', value: 'MXN' },
    { label: 'COP ($)', value: 'COP' },
    { label: 'JPY (¥)', value: 'JPY' },
    { label: 'CNY (¥)', value: 'CNY' },
    { label: 'INR (₹)', value: 'INR' },
    { label: 'AUD (A$)', value: 'AUD' },
    { label: 'CAD (C$)', value: 'CAD' },
    { label: 'CHF', value: 'CHF' },
  ];

  // ─── Reactive Form ───
  readonly configForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    country: [''],
    timezone: [''],
    currency: [''],
    price: [null as number | null],
    panelId: [''],
    panelNumber: [1, [Validators.required, Validators.min(1)]],
    tilt: [30, [Validators.required, Validators.min(0), Validators.max(90)]],
    direction: ['south', Validators.required],
    azimuth: [null as number | null, [Validators.min(0), Validators.max(360)]],
    rawSpacing: [null as number | null],
  });

  readonly formValue = toSignal(this.configForm.valueChanges, {
    initialValue: this.configForm.value,
  });

  // ─── Derived Signals ───
  readonly panelsWithLabel = computed(() =>
    this.panels().map((p) => ({
      ...p,
      displayLabel: `${p.brand} ${p.model} (${p.wattPeak}W)`,
    })),
  );

  readonly selectedPanelData = computed(() => {
    const panelId = this.formValue().panelId;
    if (!panelId) return null;
    return this.panels().find((p) => (p.id || p._id) === panelId) ?? null;
  });

  readonly selectedPanelLabel = computed(() => {
    const p = this.selectedPanelData();
    return p ? `${p.brand} ${p.model} (${p.wattPeak}W)` : '—';
  });

  readonly selectedDirectionLabel = computed(() => {
    const dir = this.formValue().direction;
    return this.orientationOptions.find((o) => o.value === dir)?.label ?? dir ?? '—';
  });

  readonly totalCapacityKw = computed(() => {
    const panel = this.selectedPanelData();
    const count = this.formValue().panelNumber ?? 0;
    if (!panel || count <= 0) return 0;
    return (panel.wattPeak * count) / 1000;
  });

  readonly locationSummary = computed(() => {
    const lat = this.mapLat();
    const lng = this.mapLng();
    if (lat != null && lng != null) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return 'Not set';
  });

  readonly hasUnsavedChanges = computed(() => {
    const data = this.projectData();
    if (!data) return false;
    const fv = this.formValue();
    return (
      fv.name !== data.name ||
      fv.country !== (data.country ?? '') ||
      fv.timezone !== (data.timezone ?? '') ||
      fv.currency !== (data.currency ?? '') ||
      fv.price !== (data.price ?? null) ||
      fv.tilt !== data.tilt ||
      fv.direction !== data.direction ||
      fv.panelNumber !== data.panelNumber ||
      this.polygonEdited()
    );
  });

  readonly canSave = computed(() => {
    return this.configForm.valid && !this.isSaving();
  });

  readonly isUsingOptimalConfig = computed(() => {
    const opt = this.optimalConfig();
    if (!opt) return false;
    return this.formValue().panelNumber === opt.recommendedPanels;
  });

  readonly timezoneLabel = computed(() => {
    const tz = this.formValue().timezone;
    if (!tz) return 'Set by location';
    return this.timezoneOptions.find((o) => o.value === tz)?.label ?? tz;
  });

  readonly stepNextLabel = computed(() => {
    return this.activeStep() === 1 ? 'Next: Review & Save' : 'Next';
  });

  readonly stepNavTitle = computed(() => {
    return this.activeStep() === 1 ? 'Panel Setup' : 'Review & Save';
  });

  // ─── Lifecycle ───
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid project ID.');
      this.isLoading.set(false);
      return;
    }
    this.projectId.set(id);
    this.loadData(id);
  }

  // ─── Data Loading ───
  private loadData(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      project: this.projectService.getProjectById(id),
      panels: this.panelService.getAllPanels(1, 200),
    }).subscribe({
      next: ({ project, panels: panelRes }) => {
        const projectResponse = project as unknown as ProjectResponse;
        this.projectData.set(projectResponse);
        // Normalize: ensure every panel has `id` (API returns `_id` only)
        this.panels.set(
          (panelRes.panels ?? []).map((p) => ({ ...p, id: p.id ?? p._id ?? '' })),
        );
        this.populateForm(projectResponse);
        this.extractMapData(projectResponse);
        this.isLoading.set(false);

        // Calculate initial optimal baseline without auto-applying
        this.fetchOptimalConfig(false);

        // Set up form watchers AFTER initial population
        this.setupFormWatchers();
      },
      error: () => {
        this.errorMessage.set('Project not found or unavailable.');
        this.isLoading.set(false);
      },
    });
  }

  private populateForm(project: ProjectResponse): void {
    this.configForm.patchValue({
      name: project.name ?? '',
      country: project.country ?? '',
      timezone: project.timezone ?? '',
      currency: project.currency ?? '',
      price: project.price ?? null,
      panelId: project.panel ?? '',
      panelNumber: project.panelNumber ?? 1,
      tilt: project.tilt ?? 30,
      direction: project.direction ?? 'south',
      azimuth: project.azimuth ?? null,
      rawSpacing: project.rawSpacing ?? null,
    });
  }

  private extractMapData(project: ProjectResponse): void {
    this.mapLat.set(typeof project.lat === 'number' ? project.lat : null);
    this.mapLng.set(typeof project.lon === 'number' ? project.lon : null);

    const coords: Coordinates[] =
      Array.isArray(project.area) && project.area.length >= 3
        ? project.area.map((p: GeoPoint) => ({ lat: p.lat, lng: p.lon }))
        : [];
    this.polygonCoords.set(coords);
  }

  /**
   * Subscribe to panel/tilt form changes to recalculate optimal config.
   * Called after initial form population to avoid triggering on patchValue.
   */
  private setupFormWatchers(): void {
    this.configForm
      .get('panelId')
      ?.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchOptimalConfig(true));

    this.configForm
      .get('tilt')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchOptimalConfig(true));
  }

  // ─── Polygon Change ───
  onPolygonChange(coords: Coordinates[]): void {
    this.polygonCoords.set(coords);
    this.polygonEdited.set(true);
    this.fetchOptimalConfig(true);
  }

  // ─── Optimal Config ───
  /**
   * Call the server to compute the optimal panel configuration from the current
   * polygon, selected panel, and tilt.
   * @param autoApply When true, auto-updates the panel number to the optimal value.
   */
  private fetchOptimalConfig(autoApply: boolean): void {
    const panelId = this.configForm.get('panelId')?.value;
    const tilt = this.configForm.get('tilt')?.value;
    const coords = this.polygonCoords();

    if (!panelId || tilt == null || coords.length < 3) return;

    this.isCalculating.set(true);
    const area = coords.map((c) => ({ lat: c.lat, lon: c.lng }));
    const request: OptimalConfigFromPolygonRequest = { area, panelId, tilt };

    this.projectService.calculateOptimalConfig(request).subscribe({
      next: (res) => {
        this.optimalConfig.set(res);
        if (autoApply) {
          this.configForm.patchValue({ panelNumber: res.recommendedPanels });
        }
        this.isCalculating.set(false);
      },
      error: () => {
        this.isCalculating.set(false);
      },
    });
  }

  applyOptimalConfig(): void {
    const opt = this.optimalConfig();
    if (opt) {
      this.configForm.patchValue({ panelNumber: opt.recommendedPanels });
    }
  }

  // ─── Address Search ───
  searchAddress(): void {
    const query = this.addressQuery().trim();
    if (!query) return;

    this.isSearching.set(true);
    this.searchError.set(null);

    interface NominatimResult {
      lat: string;
      lon: string;
      address?: { country?: string; country_code?: string };
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&accept-language=en`;
    this.http.get<NominatimResult[]>(url).subscribe({
      next: (results) => {
        this.isSearching.set(false);
        if (results.length === 0) {
          this.searchError.set('Location not found. Try a more specific address.');
          return;
        }
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        this.mapCenter.set({ lat, lng });
        this.mapLat.set(lat);
        this.mapLng.set(lng);

        // Auto-populate country, timezone, currency from location
        this.applyLocationMetadata(result.address);
      },
      error: () => {
        this.isSearching.set(false);
        this.searchError.set('Search failed. Please try again.');
      },
    });
  }

  /** Derive country, timezone, and currency from Nominatim address data. */
  private applyLocationMetadata(address?: { country?: string; country_code?: string }): void {
    if (!address) return;

    const cc = address.country_code?.toLowerCase() ?? '';
    const country = address.country ?? '';
    const timezone = this.COUNTRY_TIMEZONE[cc] ?? '';
    const currency = this.COUNTRY_CURRENCY[cc] ?? 'EUR';

    this.configForm.patchValue({
      country,
      ...(timezone ? { timezone } : {}),
      currency,
    });
  }

  // ─── Save ───
  onSave(): void {
    if (!this.canSave()) return;

    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const fv = this.configForm.getRawValue();

    const payload: Record<string, unknown> = {};
    if (fv.name) payload['name'] = fv.name;
    if (fv.tilt != null) payload['tilt'] = fv.tilt;
    if (fv.direction) payload['direction'] = fv.direction;
    if (fv.azimuth != null) payload['azimuth'] = fv.azimuth;
    if (fv.rawSpacing != null) payload['rawSpacing'] = fv.rawSpacing;
    if (fv.panelNumber != null) payload['panelNumber'] = fv.panelNumber;
    if (fv.panelId) payload['panelId'] = fv.panelId;
    if (fv.country) payload['country'] = fv.country;
    if (fv.timezone) payload['timezone'] = fv.timezone;
    if (fv.currency) payload['currency'] = fv.currency;
    if (fv.price != null) payload['price'] = fv.price;

    if (this.polygonEdited() && this.polygonCoords().length >= 3) {
      payload['area'] = this.polygonCoords().map((c) => ({ lat: c.lat, lon: c.lng }));
    } else {
      const src = this.projectData();
      if (src && Array.isArray(src.area)) {
        payload['area'] = src.area;
      }
    }

    this.projectService.updateProject(this.projectId(), payload as ProjectUpdateRequest).subscribe({
      next: (updated) => {
        this.projectData.set(updated as unknown as ProjectResponse);
        this.saveSuccess.set(true);
        this.isSaving.set(false);
      },
      error: (err) => {
        console.error('Update failed', err);
        this.saveError.set('Failed to save. Please check your inputs and try again.');
        this.isSaving.set(false);
      },
    });
  }
}
