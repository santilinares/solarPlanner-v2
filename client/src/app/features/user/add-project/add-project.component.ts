import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { ProjectService } from '@core/services/project.service';
import { PanelService, PanelListResponse } from '@core/services/panel.service';
import { CultivarService } from '@core/services/cultivar.service';
import {
  Panel,
  OptimalConfigResponse,
  OptimalConfigFromPolygonRequest,
  ProjectCreateRequest,
  Coordinates,
  GeoPoint,
} from '@core/models';
import { Cultivar, CultivarListResponse } from '@core/models/cultivar.model';
import { HasUnsavedWork } from '@core/guards/unsaved-changes.guard';
import { LocationMapComponent } from '@shared/components/location-map/location-map.component';

type SpacingWarning = { type: 'ok' | 'warning' | 'error'; message: string; recommended?: string };

interface StepDef {
  label: string;
  icon: string;
}

@Component({
  selector: 'app-add-project',
  templateUrl: './add-project.component.html',
  styleUrls: ['./add-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DecimalPipe,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    InputNumberModule,
    ConfirmDialogModule,
    TagModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    LocationMapComponent,
  ],
  providers: [ConfirmationService],
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class AddProjectComponent implements OnInit, HasUnsavedWork {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly projectService = inject(ProjectService);
  private readonly panelService = inject(PanelService);
  private readonly cultivarService = inject(CultivarService);

  // ── Step management ──────────────────────────────
  activeStep = signal(0);

  steps = computed<StepDef[]>(() => [
    { label: 'Project Details', icon: 'pi pi-file' },
    { label: 'Location & Area', icon: 'pi pi-map-marker' },
    {
      label: this.projectType() === 'agrivoltaic' ? 'Agrivoltaic Config' : 'Roof Config',
      icon: 'pi pi-cog',
    },
    { label: 'Review', icon: 'pi pi-list-check' },
  ]);

  stepNextLabel = computed(() => {
    const nextStep = this.steps()[this.activeStep() + 1];
    return nextStep ? `Next: ${nextStep.label}` : 'Next';
  });

  // ── Step 1: Project Info ─────────────────────────
  projectName = signal('');
  projectDescription = signal('');
  projectType = signal<'roof' | 'agrivoltaic' | null>(null);

  // ── Step 2: Location & Area ──────────────────────
  addressQuery = signal('');
  isSearching = signal(false);
  isLocating = signal(false);
  searchError = signal<string | null>(null);
  mapCenter = signal<Coordinates | null>(null);
  drawnPolygonPoints = signal<Coordinates[]>([]);
  hasDrawnArea = computed(() => this.drawnPolygonPoints().length >= 3);
  detectedCountry = signal('');
  detectedTimezone = signal('');
  addressResult = signal('');
  addressLat = signal(0);
  addressLng = signal(0);
  hasValidLocation = computed(
    () =>
      this.addressResult().trim().length > 0 &&
      Number.isFinite(this.addressLat()) &&
      Number.isFinite(this.addressLng())
  );
  energyPrice = signal(0.12);

  // ── Step 3: Configuration ────────────────────────
  panels = signal<Panel[]>([]);
  cultivars = signal<Cultivar[]>([]);
  selectedPanelId = signal<string | null>(null);
  selectedCultivarId = signal<string | null>(null);
  panelCount = signal(20);
  tiltAngle = signal(30);
  selectedDirection = signal('south');
  rowSpacing = signal(1.5);
  minHeight = signal(3.0);
  estimation = signal<OptimalConfigResponse | null>(null);
  isCalculating = signal(false);

  directionOptions = [
    { label: 'South', value: 'south' },
    { label: 'South-East', value: 'southeast' },
    { label: 'South-West', value: 'southwest' },
    { label: 'East', value: 'east' },
    { label: 'West', value: 'west' },
  ];

  panelOptions = computed(() =>
    this.panels().map((p) => ({
      label: `${p.brand} — ${p.model}`,
      value: p._id,
      wattPeak: p.wattPeak,
    }))
  );

  cultivarOptions = computed(() =>
    this.cultivars().map((c) => ({
      label: c.name,
      value: c._id,
      category: c.category,
    }))
  );

  selectedPanelData = computed(() =>
    this.panels().find((p) => p._id === this.selectedPanelId())
  );

  selectedCultivarData = computed(() =>
    this.cultivars().find((c) => c._id === this.selectedCultivarId())
  );

  // ── Derived computations ─────────────────────────
  panelWidthM = computed(() => (this.selectedPanelData()?.dimensions.width ?? 0) / 1000);
  panelHeightM = computed(() => (this.selectedPanelData()?.dimensions.height ?? 0) / 1000);

  optimalSpacing = computed(() => {
    const panel = this.selectedPanelData();
    if (!panel) return 0;
    const h = panel.dimensions.height / 1000;
    const tiltRad = (this.tiltAngle() * Math.PI) / 180;
    const cultivar = this.selectedCultivarData();
    const tiltBased = Math.round(h * Math.sin(tiltRad) * 2.5 * 100) / 100;
    if (this.projectType() === 'agrivoltaic' && cultivar) {
      return Math.max(tiltBased, cultivar.recommendedSpacing);
    }
    return tiltBased;
  });

  maxPanels = computed(() => {
    const est = this.estimation();
    const panel = this.selectedPanelData();
    if (!est || !panel) return 0;
    const W = panel.dimensions.width / 1000;
    const H = panel.dimensions.height / 1000;
    const d = this.rowSpacing();
    const footprint = W * (H + d);
    if (footprint <= 0) return 0;
    const utilisation = this.projectType() === 'agrivoltaic' ? 0.70 : 0.85;
    const usableArea = est.surfaceArea * utilisation;
    return Math.max(0, Math.floor(usableArea / footprint));
  });

  totalPowerKWp = computed(() => {
    const panel = this.selectedPanelData();
    if (!panel) return 0;
    return (this.panelCount() * panel.wattPeak) / 1000;
  });

  totalPanelArea = computed(() => {
    const panel = this.selectedPanelData();
    if (!panel) return 0;
    return this.panelCount() * this.panelWidthM() * this.panelHeightM();
  });

  polygonArea = computed(() => this.estimation()?.surfaceArea ?? 0);

  spacingWarning = computed<SpacingWarning>(() => {
    const panel = this.selectedPanelData();
    if (!panel) return { type: 'ok', message: '' };
    const rs = this.rowSpacing();
    const opt = this.optimalSpacing();
    if (rs < 0.8) {
      return {
        type: 'error',
        message: `Row spacing too narrow (${rs}m). Minimum 0.8m required for maintenance access.`,
        recommended: `Recommended optimal spacing: ${opt}m`,
      };
    }
    if (rs < opt) {
      const reduction = Math.round(((opt - rs) / opt) * 30);
      return {
        type: 'warning',
        message: `Row spacing (${rs}m) is below optimal (${opt}m). This may cause inter-row shading and reduce energy yield by ${reduction}%.`,
        recommended: `Recommended optimal spacing: ${opt}m`,
      };
    }
    return { type: 'ok', message: 'Row spacing is adequate. No significant inter-row shading expected.' };
  });

  heightWarning = computed<{ type: 'ok' | 'warning'; message: string } | null>(() => {
    const cultivar = this.selectedCultivarData();
    if (!cultivar) return null;
    if (this.minHeight() < cultivar.minPanelHeight) {
      return {
        type: 'warning',
        message: `Minimum height (${this.minHeight()}m) is below the recommended ${cultivar.minPanelHeight}m for ${cultivar.name}. This may restrict crop growth and machinery access.`,
      };
    }
    return {
      type: 'ok',
      message: `Height clearance is adequate for ${cultivar.name}.`,
    };
  });

  // ── Step validation ──────────────────────────────
  canProceed = computed(() => {
    switch (this.activeStep()) {
      case 0: return this.projectName().trim().length > 0 && this.projectType() !== null;
      case 1: return this.hasValidLocation();
      case 2:
        if (this.projectType() === 'agrivoltaic') {
          return !!this.selectedPanelId() && !!this.selectedCultivarId();
        }
        return !!this.selectedPanelId();
      case 3: return true;
      default: return false;
    }
  });

  // ── Submission ───────────────────────────────────
  isSubmitting = signal(false);

  canSubmit = computed(
    () =>
      this.projectName().trim().length > 0 &&
      this.projectType() !== null &&
      !!this.selectedPanelId() &&
      this.panelCount() > 0
  );

  // ── Lifecycle ────────────────────────────────────
  ngOnInit(): void {
    this.loadPanels();
    this.loadCultivars();
  }

  // ── HasUnsavedWork interface ─────────────────────
  hasUnsavedWork(): boolean {
    return (
      this.projectName().length > 0 ||
      this.projectDescription().length > 0 ||
      this.hasDrawnArea() ||
      !!this.selectedPanelId()
    );
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedWork()) {
      event.preventDefault();
    }
  }

  // ── Navigation ───────────────────────────────────
  goToStep(step: number): void {
    if (step >= 0 && step <= 3) {
      this.activeStep.set(step);
    }
  }

  onBack(): void {
    if (this.activeStep() > 0) {
      this.activeStep.set(this.activeStep() - 1);
    }
  }

  onNext(): void {
    if (this.activeStep() < 3 && this.canProceed()) {
      this.activeStep.set(this.activeStep() + 1);
    }
  }

  onExit(): void {
    if (this.hasUnsavedWork()) {
      this.confirmationService.confirm({
        header: 'Leave project creation?',
        message: 'Your progress will not be saved. Are you sure you want to exit?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Leave',
        rejectLabel: 'Cancel',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => void this.router.navigate(['/projects']),
      });
    } else {
      void this.router.navigate(['/projects']);
    }
  }

  // ── Data loading ─────────────────────────────────
  private loadPanels(): void {
    this.panelService.getAllPanels(1, 100).subscribe({
      next: (res: PanelListResponse) => this.panels.set(res.panels ?? []),
      error: (err) => console.error('Failed to load panels', err),
    });
  }

  private loadCultivars(): void {
    this.cultivarService.getAllCultivars(1, 100).subscribe({
      next: (res: CultivarListResponse) => this.cultivars.set(res.data ?? []),
      error: (err) => console.error('Failed to load cultivars', err),
    });
  }

  // ── Step 2 methods ───────────────────────────────
  searchAddress(): void {
    const query = this.addressQuery().trim();
    if (!query) return;

    this.isSearching.set(true);
    this.searchError.set(null);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    this.http
      .get<Array<{ lat: string; lon: string; display_name?: string; address?: { country?: string; country_code?: string } }>>(url)
      .subscribe({
        next: (results) => {
          this.isSearching.set(false);
          if (results.length === 0) {
            this.searchError.set('Location not found. Try a more specific address.');
            return;
          }
          const r = results[0];
          const lat = parseFloat(r.lat);
          const lng = parseFloat(r.lon);
          this.applyResolvedLocation(
            lat,
            lng,
            r.display_name ?? query,
            r.address?.country,
            r.address?.country_code,
          );
        },
        error: () => {
          this.isSearching.set(false);
          this.searchError.set('Search failed. Please try again.');
        },
      });
  }

  onUserLocationFound(coords: Coordinates): void {
    this.applyResolvedLocation(coords.lat, coords.lng, 'Current location');
    this.reverseGeocode(coords.lat, coords.lng);
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
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  onPolygonChange(coords: Coordinates[]): void {
    this.drawnPolygonPoints.set(coords);
    this.estimation.set(null);
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
    if (country) {
      this.detectedCountry.set(country);
    }
    this.detectedTimezone.set(this.guessTimezone(countryCode));
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=json&addressdetails=1`;
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
        error: () => {
          this.addressResult.set(this.addressResult().trim() || 'Current location');
        },
      });
  }

  private guessTimezone(countryCode?: string): string {
    if (!countryCode) return '';
    const map: Record<string, string> = {
      es: 'Europe/Madrid', fr: 'Europe/Paris', de: 'Europe/Berlin',
      it: 'Europe/Rome', pt: 'Europe/Lisbon', gb: 'Europe/London',
      us: 'America/New_York', ar: 'America/Argentina/Buenos_Aires',
      br: 'America/Sao_Paulo', mx: 'America/Mexico_City',
      au: 'Australia/Sydney', jp: 'Asia/Tokyo', cn: 'Asia/Shanghai',
      in: 'Asia/Kolkata',
    };
    return map[countryCode.toLowerCase()] ?? '';
  }

  // ── Step 3 methods ───────────────────────────────
  onPanelChange(): void {
    this.estimation.set(null);
    const panel = this.selectedPanelData();
    if (panel) {
      this.rowSpacing.set(this.optimalSpacing());
    }
    if (this.hasDrawnArea() && this.selectedPanelId()) {
      this.onCalculate();
    }
  }

  onCultivarChange(): void {
    const crop = this.selectedCultivarData();
    if (crop) {
      this.minHeight.set(crop.minPanelHeight);
      this.rowSpacing.set(this.optimalSpacing());
    }
  }

  applyAutoSpacing(): void {
    this.rowSpacing.set(this.optimalSpacing());
  }

  onPanelCountChange(value: number): void {
    const max = this.maxPanels();
    if (max > 0 && value > max) {
      this.panelCount.set(max);
    } else {
      this.panelCount.set(value);
    }
  }

  onRowSpacingChange(value: number): void {
    this.rowSpacing.set(value);
    const max = this.maxPanels();
    if (max > 0) {
      this.panelCount.set(Math.min(this.panelCount(), max));
    }
  }

  canCalculate = computed(
    () => this.hasDrawnArea() && !!this.selectedPanelId() && this.tiltAngle() >= 0 && this.tiltAngle() <= 90
  );

  onCalculate(): void {
    if (!this.canCalculate()) return;
    this.isCalculating.set(true);

    const area = this.drawnPolygonPoints().map((c) => ({ lat: c.lat, lon: c.lng }));
    const request: OptimalConfigFromPolygonRequest = {
      area,
      panelId: this.selectedPanelId()!,
      tilt: this.tiltAngle(),
    };

    this.projectService.calculateOptimalConfig(request).subscribe({
      next: (res) => {
        this.isCalculating.set(false);
        this.estimation.set(res);
        this.rowSpacing.set(res.recommendedRowSpacing);
        this.panelCount.set(res.recommendedPanels);
      },
      error: (err) => {
        this.isCalculating.set(false);
        console.error('Estimation failed', err);
      },
    });
  }

  // ── Formatting helpers ───────────────────────────
  formatLightRequirement(lr: string): string {
    return lr.replace(/-/g, ' ');
  }

  capitalizeFirst(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ── Submit ───────────────────────────────────────
  onSubmit(): void {
    if (!this.canSubmit() || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const area: GeoPoint[] = this.drawnPolygonPoints().map((c) => ({
      lat: c.lat,
      lon: c.lng,
    }));

    const projectData: ProjectCreateRequest = {
      name: this.projectName(),
      description: this.projectDescription() || undefined,
      projectType: this.projectType()!,
      area,
      tilt: this.tiltAngle(),
      direction: this.selectedDirection(),
      panelNumber: this.panelCount(),
      panelId: this.selectedPanelId() ?? undefined,
      rawSpacing: this.rowSpacing(),
      cultivarId:
        this.projectType() === 'agrivoltaic'
          ? this.selectedCultivarId() ?? undefined
          : undefined,
    };

    this.projectService.createProject(projectData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.projectName.set('');
        this.projectDescription.set('');
        this.drawnPolygonPoints.set([]);
        this.selectedPanelId.set(null);
        void this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Creation failed', err);
      },
    });
  }
}

