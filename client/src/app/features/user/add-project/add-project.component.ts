import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { Coordinates, GeoPoint, OptimalConfigFromPolygonRequest, OptimalConfigResponse, Panel, ProjectCreateRequest } from '@core/models';
import { PanelListResponse, PanelService } from '@core/services/panel.service';
import { ProjectService } from '@core/services/project.service';
import { HasUnsavedWork } from '@core/guards/unsaved-changes.guard';
import { LocationMapComponent } from '@shared/components/location-map/location-map.component';

interface StepDef {
  label: string;
  icon: string;
}

interface OptimalBaseline {
  panelCount: number;
  rowSpacing: number;
  config: OptimalConfigResponse;
}

type PriceSource = 'entsoe' | 'default' | 'manual' | 'unavailable';

@Component({
  selector: 'app-add-project',
  templateUrl: './add-project.component.html',
  styleUrls: ['./add-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TextareaModule,
    LocationMapComponent,
  ],
  providers: [ConfirmationService],
})
export class AddProjectComponent implements OnInit, OnDestroy, HasUnsavedWork {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly projectService = inject(ProjectService);
  private readonly panelService = inject(PanelService);

  private navigationSubscription?: Subscription;

  readonly activeStep = signal(0);
  readonly steps: StepDef[] = [
    { label: 'Project', icon: 'description' },
    { label: 'Site', icon: 'map' },
    { label: 'Energy Price', icon: 'bolt' },
    { label: 'Installation', icon: 'solar_power' },
    { label: 'Review', icon: 'fact_check' },
  ];

  readonly stepNextLabel = computed(() => {
    const nextStep = this.steps[this.activeStep() + 1];
    return nextStep ? `Next: ${nextStep.label}` : 'Next';
  });

  readonly projectName = signal('');
  readonly projectDescription = signal('');

  readonly addressQuery = signal('');
  readonly isSearching = signal(false);
  readonly isLocating = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly mapCenter = signal<Coordinates | null>(null);
  readonly drawnPolygonPoints = signal<Coordinates[]>([]);
  readonly addressResult = signal('');
  readonly addressLat = signal(0);
  readonly addressLng = signal(0);
  readonly detectedCountry = signal('');
  readonly detectedCountryCode = signal('');
  readonly detectedTimezone = signal('');

  readonly energyPrice = signal<number | null>(0.12);
  readonly currency = signal('EUR');
  readonly priceSuggestion = signal<number | null>(null);
  readonly priceSource = signal<PriceSource>('default');
  readonly isFetchingPrice = signal(false);
  readonly priceError = signal<string | null>(null);
  readonly userEditedPrice = signal(false);

  readonly panels = signal<Panel[]>([]);
  readonly selectedPanelId = signal<string | null>(null);
  readonly panelCount = signal(1);
  readonly tiltAngle = signal(30);
  readonly selectedDirection = signal('south');
  readonly rowSpacing = signal<number | null>(null);
  readonly optimalConfig = signal<OptimalConfigResponse | null>(null);
  readonly optimalBaseline = signal<OptimalBaseline | null>(null);
  readonly isCalculating = signal(false);
  readonly calculationError = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly directionOptions = [
    { label: 'South', value: 'south', azimuth: 180 },
    { label: 'South-East', value: 'southeast', azimuth: 135 },
    { label: 'South-West', value: 'southwest', azimuth: 225 },
    { label: 'East', value: 'east', azimuth: 90 },
    { label: 'West', value: 'west', azimuth: 270 },
  ];

  readonly panelOptions = computed(() =>
    this.panels().map((panel) => ({
      label: `${panel.brand} ${panel.model} (${panel.wattPeak}W)`,
      value: panel._id ?? panel.id,
    })),
  );

  readonly selectedPanelData = computed(() =>
    this.panels().find((panel) => (panel._id ?? panel.id) === this.selectedPanelId()) ?? null,
  );

  readonly hasValidLocation = computed(
    () =>
      this.addressResult().trim().length > 0 &&
      Number.isFinite(this.addressLat()) &&
      Number.isFinite(this.addressLng()),
  );

  readonly hasDrawnArea = computed(() => this.drawnPolygonPoints().length >= 3);
  readonly polygonArea = computed(() => this.optimalConfig()?.surfaceArea ?? 0);

  readonly totalPowerKWp = computed(() => {
    const panel = this.selectedPanelData();
    return panel ? (this.panelCount() * panel.wattPeak) / 1000 : 0;
  });

  readonly totalPanelArea = computed(() => {
    const panel = this.selectedPanelData();
    if (!panel) return 0;
    return this.panelCount() * (panel.dimensions.width / 1000) * (panel.dimensions.height / 1000);
  });

  readonly isUsingOptimalConfig = computed(() => {
    const baseline = this.optimalBaseline();
    if (!baseline) return false;
    const spacing = this.rowSpacing();
    return (
      this.panelCount() === baseline.panelCount &&
      spacing != null &&
      Math.abs(spacing - baseline.rowSpacing) < 0.005
    );
  });

  readonly annualSavingsEstimate = computed(() => {
    const price = this.energyPrice();
    const production = this.optimalConfig()?.estimatedProduction;
    if (price == null || production == null) return null;
    return price * production;
  });

  readonly canProceed = computed(() => {
    switch (this.activeStep()) {
      case 0:
        return this.projectName().trim().length >= 2;
      case 1:
        return this.hasValidLocation() && this.hasDrawnArea();
      case 2:
        return this.energyPrice() != null && this.energyPrice()! >= 0;
      case 3:
        return !!this.selectedPanelId() && this.panelCount() > 0 && this.rowSpacing() != null;
      case 4:
        return true;
      default:
        return false;
    }
  });

  readonly canCalculate = computed(
    () => this.hasDrawnArea() && !!this.selectedPanelId() && this.tiltAngle() >= 0 && this.tiltAngle() <= 90,
  );

  readonly canSubmit = computed(
    () =>
      this.projectName().trim().length >= 2 &&
      this.hasValidLocation() &&
      this.hasDrawnArea() &&
      !!this.selectedPanelId() &&
      this.panelCount() > 0 &&
      this.rowSpacing() != null &&
      !this.isSubmitting(),
  );

  ngOnInit(): void {
    this.loadPanels();
    this.navigationSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart && !event.url.startsWith('/projects/add')) {
        this.checkUnsavedNavigation(event.url);
      }
    });
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
  }

  hasUnsavedWork(): boolean {
    return (
      this.projectName().trim().length > 0 ||
      this.projectDescription().trim().length > 0 ||
      this.hasDrawnArea() ||
      !!this.selectedPanelId()
    );
  }

  goToStep(step: number): void {
    if (step >= 0 && step < this.steps.length && (step <= this.activeStep() || this.canProceed())) {
      this.activeStep.set(step);
    }
  }

  onBack(): void {
    if (this.activeStep() > 0) {
      this.activeStep.set(this.activeStep() - 1);
    }
  }

  onNext(): void {
    if (!this.canProceed() || this.activeStep() >= this.steps.length - 1) return;
    const next = this.activeStep() + 1;
    this.activeStep.set(next);
    if (next === 3 && this.canCalculate()) {
      this.calculateOptimalConfig(true);
    }
  }

  onExit(): void {
    if (this.hasUnsavedWork()) {
      this.showExitConfirmation(() => void this.router.navigate(['/projects']));
      return;
    }
    void this.router.navigate(['/projects']);
  }

  searchAddress(): void {
    const query = this.addressQuery().trim();
    if (!query) return;

    this.isSearching.set(true);
    this.searchError.set(null);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&accept-language=en`;
    this.http
      .get<Array<{ lat: string; lon: string; display_name?: string; address?: { country?: string; country_code?: string } }>>(url)
      .subscribe({
        next: (results) => {
          this.isSearching.set(false);
          if (results.length === 0) {
            this.searchError.set('Location not found. Try a more specific address.');
            return;
          }
          const result = results[0];
          this.applyResolvedLocation(
            parseFloat(result.lat),
            parseFloat(result.lon),
            result.display_name ?? query,
            result.address?.country,
            result.address?.country_code,
          );
        },
        error: () => {
          this.isSearching.set(false);
          this.searchError.set('Search failed. Please try again.');
        },
      });
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.searchError.set('Geolocation is not supported by this browser.');
      return;
    }

    this.isLocating.set(true);
    this.searchError.set(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating.set(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.applyResolvedLocation(lat, lng, 'Current location');
        this.reverseGeocode(lat, lng);
      },
      () => {
        this.isLocating.set(false);
        this.searchError.set('Unable to access your location. Please allow location permission.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  onUserLocationFound(coords: Coordinates): void {
    this.applyResolvedLocation(coords.lat, coords.lng, 'Current location');
    this.reverseGeocode(coords.lat, coords.lng);
  }

  onPolygonChange(coords: Coordinates[]): void {
    this.drawnPolygonPoints.set(coords);
    this.optimalConfig.set(null);
    this.optimalBaseline.set(null);
    if (this.canCalculate()) {
      this.calculateOptimalConfig(true);
    }
  }

  onPriceEdited(value: number | null): void {
    this.energyPrice.set(value);
    this.userEditedPrice.set(true);
    this.priceSource.set('manual');
  }

  onPanelChange(): void {
    this.optimalConfig.set(null);
    this.optimalBaseline.set(null);
    if (this.canCalculate()) {
      this.calculateOptimalConfig(true);
    }
  }

  onTiltChange(value: number): void {
    this.tiltAngle.set(value);
    this.optimalConfig.set(null);
    this.optimalBaseline.set(null);
    if (this.canCalculate()) {
      this.calculateOptimalConfig(true);
    }
  }

  onDirectionChange(value: string): void {
    this.selectedDirection.set(value);
    this.optimalConfig.set(null);
    this.optimalBaseline.set(null);
    if (this.canCalculate()) {
      this.calculateOptimalConfig(true);
    }
  }

  onPanelCountChange(value: number): void {
    this.panelCount.set(value);
  }

  onRowSpacingChange(value: number | null): void {
    this.rowSpacing.set(value);
  }

  restoreOptimal(): void {
    const baseline = this.optimalBaseline();
    if (!baseline) return;
    this.panelCount.set(baseline.panelCount);
    this.rowSpacing.set(baseline.rowSpacing);
  }

  calculateOptimalConfig(applyResult: boolean): void {
    if (!this.canCalculate()) return;

    this.isCalculating.set(true);
    this.calculationError.set(null);
    const request: OptimalConfigFromPolygonRequest = {
      area: this.drawnPolygonPoints().map((coords) => ({ lat: coords.lat, lon: coords.lng })),
      panelId: this.selectedPanelId()!,
      tilt: this.tiltAngle(),
      azimuth: this.directionToAzimuth(this.selectedDirection()),
    };

    this.projectService.calculateOptimalConfig(request).subscribe({
      next: (config) => {
        this.optimalConfig.set(config);
        this.optimalBaseline.set({
          panelCount: config.recommendedPanels,
          rowSpacing: config.recommendedRowSpacing,
          config,
        });
        if (applyResult) {
          this.panelCount.set(Math.max(1, config.recommendedPanels));
          this.rowSpacing.set(config.recommendedRowSpacing);
        }
        this.isCalculating.set(false);
      },
      error: () => {
        this.calculationError.set('Could not calculate the optimal layout. You can still enter the layout manually.');
        this.isCalculating.set(false);
      },
    });
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;
    this.isSubmitting.set(true);

    const payload: ProjectCreateRequest = {
      name: this.projectName().trim(),
      description: this.projectDescription().trim() || undefined,
      projectType: 'roof',
      area: this.drawnPolygonPoints().map((coords): GeoPoint => ({ lat: coords.lat, lon: coords.lng })),
      country: this.detectedCountry() || undefined,
      countryCode: this.detectedCountryCode() || undefined,
      timezone: this.detectedTimezone() || undefined,
      currency: this.currency() || undefined,
      price: this.energyPrice() ?? undefined,
      tilt: this.tiltAngle(),
      direction: this.selectedDirection(),
      azimuth: this.directionToAzimuth(this.selectedDirection()),
      panelNumber: this.panelCount(),
      panelId: this.selectedPanelId() ?? undefined,
      rawSpacing: this.rowSpacing() ?? undefined,
    };

    this.projectService.createProject(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.router.navigate(['/projects']);
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  formatPrice(value: number | null): string {
    if (value == null) return 'Not available';
    return `${this.currency()} ${value.toFixed(4)}/kWh`;
  }

  directionLabel(value: string): string {
    return this.directionOptions.find((option) => option.value === value)?.label ?? value;
  }

  private loadPanels(): void {
    this.panelService.getAllPanels(1, 200).subscribe({
      next: (res: PanelListResponse) => this.panels.set(res.panels ?? []),
      error: () => this.panels.set([]),
    });
  }

  private applyResolvedLocation(
    lat: number,
    lng: number,
    label: string,
    country?: string,
    countryCode?: string,
  ): void {
    this.mapCenter.set({ lat, lng });
    this.addressLat.set(lat);
    this.addressLng.set(lng);
    this.addressResult.set(label);

    if (country) this.detectedCountry.set(country);
    if (countryCode) {
      const normalized = countryCode.toUpperCase();
      this.detectedCountryCode.set(normalized);
      this.detectedTimezone.set(this.guessTimezone(countryCode));
      this.currency.set(this.guessCurrency(countryCode));
      this.fetchEnergyPriceSuggestion(normalized);
    }
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=json&addressdetails=1&accept-language=en`;
    this.http
      .get<{ display_name?: string; address?: { country?: string; country_code?: string } }>(url)
      .subscribe({
        next: (res) => {
          this.applyResolvedLocation(
            lat,
            lng,
            res.display_name ?? 'Current location',
            res.address?.country,
            res.address?.country_code,
          );
        },
        error: () => this.addressResult.set(this.addressResult().trim() || 'Current location'),
      });
  }

  private fetchEnergyPriceSuggestion(countryCode: string): void {
    this.isFetchingPrice.set(true);
    this.priceError.set(null);
    this.projectService.getElectricityPriceSuggestion(countryCode).subscribe({
      next: (suggestion) => {
        this.isFetchingPrice.set(false);
        this.priceSuggestion.set(suggestion.price);
        if (suggestion.currency) this.currency.set(suggestion.currency);
        if (suggestion.price != null) {
          this.priceSource.set('entsoe');
          if (!this.userEditedPrice()) {
            this.energyPrice.set(suggestion.price);
          }
        } else {
          this.priceSource.set('unavailable');
          this.priceError.set('No ENTSO-E price was available for this country. Keep or edit the default value.');
        }
      },
      error: () => {
        this.isFetchingPrice.set(false);
        this.priceSource.set('unavailable');
        this.priceError.set('Energy price lookup failed. Keep or edit the default value.');
      },
    });
  }

  private directionToAzimuth(direction: string): number {
    return this.directionOptions.find((option) => option.value === direction)?.azimuth ?? 180;
  }

  private guessCurrency(countryCode?: string): string {
    if (!countryCode) return 'EUR';
    const map: Record<string, string> = {
      ES: 'EUR', PT: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
      GB: 'GBP', US: 'USD', PL: 'PLN',
    };
    return map[countryCode.toUpperCase()] ?? 'EUR';
  }

  private guessTimezone(countryCode?: string): string {
    if (!countryCode) return '';
    const map: Record<string, string> = {
      es: 'Europe/Madrid', fr: 'Europe/Paris', de: 'Europe/Berlin', it: 'Europe/Rome',
      pt: 'Europe/Lisbon', gb: 'Europe/London', us: 'America/New_York',
      nl: 'Europe/Amsterdam', be: 'Europe/Brussels', at: 'Europe/Vienna', pl: 'Europe/Warsaw',
    };
    return map[countryCode.toLowerCase()] ?? '';
  }

  private checkUnsavedNavigation(targetUrl: string): void {
    if (!this.hasUnsavedWork()) return;
    this.showExitConfirmation(() => void this.router.navigateByUrl(targetUrl));
  }

  private showExitConfirmation(onAccept: () => void): void {
    this.confirmationService.confirm({
      header: 'Leave project creation?',
      message: 'Your progress will not be saved. Are you sure you want to exit?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Leave',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: onAccept,
    });
  }
}
