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
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

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

interface WarningItem {
  severity: 'warn' | 'info';
  message: string;
}

@Component({
  selector: 'app-add-project',
  templateUrl: './add-project.component.html',
  styleUrls: ['./add-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DecimalPipe,
    StepperModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    InputNumberModule,
    ConfirmDialogModule,
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
  activeStep = signal(1);
  totalSteps = signal(4);

  // ── Step 1: Project Info ─────────────────────────
  projectName = signal('');
  projectDescription = signal('');
  projectType = signal<'roof' | 'agrivoltaic'>('roof');

  // ── Step 2: Location & Area ──────────────────────
  addressQuery = signal('');
  isSearching = signal(false);
  searchError = signal<string | null>(null);
  mapCenter = signal<Coordinates | null>(null);
  drawnPolygonPoints = signal<Coordinates[]>([]);
  hasDrawnArea = computed(() => this.drawnPolygonPoints().length >= 3);
  detectedCountry = signal('');
  detectedTimezone = signal('');
  energyPrice = 0.15;

  // ── Step 3: Configuration ────────────────────────
  panels = signal<Panel[]>([]);
  cultivars = signal<Cultivar[]>([]);
  selectedPanelId: string | null = null;
  selectedCultivarId: string | null = null;
  panelCount = 0;
  tiltAngle = 30;
  selectedDirection = 'south';
  rowSpacing = 1.2;
  estimation = signal<OptimalConfigResponse | null>(null);
  isCalculating = signal(false);

  directionOptions = [
    { label: 'South', value: 'south' },
    { label: 'South-East', value: 'southeast' },
    { label: 'South-West', value: 'southwest' },
    { label: 'East', value: 'east' },
    { label: 'West', value: 'west' },
    { label: 'North', value: 'north' },
  ];

  panelOptions = computed(() =>
    this.panels().map((p) => ({
      label: `${p.brand} ${p.model} (${p.wattPeak}W)`,
      value: p._id,
    }))
  );

  cultivarOptions = computed(() =>
    this.cultivars().map((c) => ({
      label: `${c.name} (${c.category})`,
      value: c._id,
    }))
  );

  selectedPanelData = computed(() =>
    this.panels().find((p) => p._id === this.selectedPanelId)
  );

  selectedCultivarData = computed(() =>
    this.cultivars().find((c) => c._id === this.selectedCultivarId)
  );

  selectedPanelLabel = computed(() => {
    const p = this.selectedPanelData();
    return p ? `${p.brand} ${p.model}` : '—';
  });

  selectedPanelWatt = computed(() => this.selectedPanelData()?.wattPeak ?? 0);

  selectedCultivarLabel = computed(() => this.selectedCultivarData()?.name ?? '');

  totalCapacity = computed(() => {
    const watt = this.selectedPanelWatt();
    return (watt * this.panelCount) / 1000;
  });

  // ── Warnings ─────────────────────────────────────
  warnings = computed<WarningItem[]>(() => {
    const items: WarningItem[] = [];
    const est = this.estimation();
    if (!est) return items;

    const maxPanels = est.recommendedPanels;
    if (this.panelCount > maxPanels) {
      items.push({
        severity: 'warn',
        message: `Max recommended panels for this area is ${maxPanels}. Exceeding may cause overlap or insufficient spacing.`,
      });
    }

    if (this.projectType() === 'roof' && this.rowSpacing < 0.6) {
      items.push({
        severity: 'warn',
        message: 'Row spacing below 0.6m — insufficient for maintenance access.',
      });
    }

    const crop = this.selectedCultivarData();
    if (this.projectType() === 'agrivoltaic' && crop && this.rowSpacing < crop.recommendedSpacing) {
      items.push({
        severity: 'warn',
        message: `Row spacing below ${crop.name} requirement of ${crop.recommendedSpacing}m — machinery/growth access compromised.`,
      });
    }

    return items;
  });

  // ── Submission ───────────────────────────────────
  isSubmitting = signal(false);

  // ── Step validation ──────────────────────────────
  canProceedStep1 = computed(
    () => this.projectName().trim().length >= 2 && !!this.projectType()
  );

  canProceedStep2 = computed(() => this.hasDrawnArea());

  canCalculate = computed(
    () => this.hasDrawnArea() && !!this.selectedPanelId && this.tiltAngle >= 0 && this.tiltAngle <= 90
  );

  canProceedStep3 = computed(
    () => !!this.selectedPanelId && this.panelCount > 0 && this.estimation() !== null
  );

  canSubmit = computed(
    () =>
      this.canProceedStep1() &&
      this.canProceedStep2() &&
      this.canProceedStep3()
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
      !!this.selectedPanelId
    );
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedWork()) {
      event.preventDefault();
    }
  }

  // ── Navigation ───────────────────────────────────
  goToStep(step: number, activateCallback: (step: number) => void): void {
    this.activeStep.set(step);
    activateCallback(step);
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
        accept: () => this.router.navigate(['/projects']),
      });
    } else {
      this.router.navigate(['/projects']);
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
      .get<Array<{ lat: string; lon: string; address?: { country?: string; country_code?: string } }>>(url)
      .subscribe({
        next: (results) => {
          this.isSearching.set(false);
          if (results.length === 0) {
            this.searchError.set('Location not found. Try a more specific address.');
            return;
          }
          const r = results[0];
          this.mapCenter.set({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });

          // Auto-detect country/timezone
          if (r.address?.country) {
            this.detectedCountry.set(r.address.country);
          }
          // Approximate timezone from country_code — simple mapping
          this.detectedTimezone.set(this.guessTimezone(r.address?.country_code));
        },
        error: () => {
          this.isSearching.set(false);
          this.searchError.set('Search failed. Please try again.');
        },
      });
  }

  onPolygonChange(coords: Coordinates[]): void {
    this.drawnPolygonPoints.set(coords);
    this.estimation.set(null);
  }

  private guessTimezone(countryCode?: string): string {
    if (!countryCode) return '';
    const map: Record<string, string> = {
      es: 'Europe/Madrid',
      fr: 'Europe/Paris',
      de: 'Europe/Berlin',
      it: 'Europe/Rome',
      pt: 'Europe/Lisbon',
      gb: 'Europe/London',
      us: 'America/New_York',
      ar: 'America/Argentina/Buenos_Aires',
      br: 'America/Sao_Paulo',
      mx: 'America/Mexico_City',
      au: 'Australia/Sydney',
      jp: 'Asia/Tokyo',
      cn: 'Asia/Shanghai',
      in: 'Asia/Kolkata',
    };
    return map[countryCode.toLowerCase()] ?? '';
  }

  // ── Step 3 methods ───────────────────────────────
  onPanelChange(): void {
    this.estimation.set(null);
    // Auto-calculate if polygon exists
    if (this.hasDrawnArea() && this.selectedPanelId) {
      this.onCalculate();
    }
  }

  onCultivarChange(): void {
    const crop = this.selectedCultivarData();
    if (crop) {
      // Apply cultivar recommendations
      this.tiltAngle = Math.max(0, this.tiltAngle - crop.optimalTiltReduction);
      this.rowSpacing = Math.max(this.rowSpacing, crop.recommendedSpacing);
    }
  }

  onPanelCountChange(): void {
    // Warnings recompute automatically via computed signals
  }

  onConfigChange(): void {
    this.estimation.set(null);
  }

  onCalculate(): void {
    if (!this.canCalculate()) return;

    this.isCalculating.set(true);

    const area = this.drawnPolygonPoints().map((c) => ({ lat: c.lat, lon: c.lng }));
    const request: OptimalConfigFromPolygonRequest = {
      area,
      panelId: this.selectedPanelId!,
      tilt: this.tiltAngle,
    };

    this.projectService.calculateOptimalConfig(request).subscribe({
      next: (res) => {
        this.isCalculating.set(false);
        this.estimation.set(res);
        this.panelCount = res.recommendedPanels;
      },
      error: (err) => {
        this.isCalculating.set(false);
        console.error('Estimation failed', err);
      },
    });
  }

  resetToOptimal(): void {
    const est = this.estimation();
    if (est) {
      this.panelCount = est.recommendedPanels;
    }
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
      projectType: this.projectType(),
      area,
      tilt: this.tiltAngle,
      direction: this.selectedDirection,
      panelNumber: this.panelCount,
      panelId: this.selectedPanelId ?? undefined,
      rawSpacing: this.rowSpacing,
      cultivarId:
        this.projectType() === 'agrivoltaic'
          ? this.selectedCultivarId ?? undefined
          : undefined,
    };

    this.projectService.createProject(projectData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        // Clear state so guard doesn't fire
        this.projectName.set('');
        this.projectDescription.set('');
        this.drawnPolygonPoints.set([]);
        this.selectedPanelId = null;
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Creation failed', err);
      },
    });
  }
}

