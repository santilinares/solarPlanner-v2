import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { FieldsetModule } from 'primeng/fieldset';

import { ProjectService } from '@core/services/project.service';
import { PanelService } from '@core/services/panel.service';
import { GeocodingService } from '@core/services/geocoding.service';
import {
  ProjectResponse,
  Panel,
  Coordinates,
  GeoPoint,
  ProjectUpdateRequest,
  OptimalConfigResponse,
  OptimalConfigFromPolygonRequest,
  SunPathData,
  ProjectConfigPreview,
  ProjectConfigPreviewRequest,
  SystemLosses,
} from '@core/models';
import { BASE_CHART_OPTIONS, CHART_COLORS, MONTH_LABELS } from '@core/utils/chart.utils';
import { ConfigureLocationStepComponent } from './components/configure-location-step/configure-location-step.component';
import { ConfigurePanelFormStepComponent } from './components/configure-panel-form-step/configure-panel-form-step.component';
import { ConfigureReviewStepComponent } from './components/configure-review-step/configure-review-step.component';

export interface OrientationOption {
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

export interface ReviewChange {
  label: string;
  before: string;
  after: string;
}

export type ConfigFormValue = ReturnType<ConfigureProjectComponent['configForm']['getRawValue']>;

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
    ConfirmDialogModule,
    ToastModule,
    FieldsetModule,
    HighchartsChartModule,
    ConfigureLocationStepComponent,
    ConfigurePanelFormStepComponent,
    ConfigureReviewStepComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './configure-project.component.html',
  styleUrls: ['./configure-project.component.scss'],
})
export class ConfigureProjectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly geocodingService = inject(GeocodingService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
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
  readonly sunPathData = signal<SunPathData | null>(null);
  readonly isSunPathLoading = signal(false);
  readonly panels = signal<Panel[]>([]);
  readonly projectId = signal('');
  readonly activeStep = signal(1);
  readonly configPreview = signal<ProjectConfigPreview | null>(null);
  readonly isPreviewLoading = signal(false);

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
  readonly Highcharts: typeof Highcharts = Highcharts;

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

  readonly segmentOptions = [
    { label: 'Residential', value: 'residential' },
    { label: 'Commercial', value: 'commercial' },
    { label: 'Utility', value: 'utility' },
    { label: 'Agrivoltaic', value: 'agrivoltaic' },
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
    installationCost: [null as number | null],
    segment: ['residential' as 'residential' | 'commercial' | 'utility' | 'agrivoltaic'],
    dcAcRatio: [1.1 as number | null, [Validators.min(0.5), Validators.max(3)]],
    albedo: [0.2 as number | null, [Validators.min(0), Validators.max(1)]],
    systemLosses: this.fb.group({
      inverterEfficiency: [0.96 as number | null, [Validators.min(0), Validators.max(1)]],
      dcWiring: [2 as number | null, [Validators.min(0), Validators.max(100)]],
      acWiring: [1 as number | null, [Validators.min(0), Validators.max(100)]],
      mismatch: [2 as number | null, [Validators.min(0), Validators.max(100)]],
      soiling: [3 as number | null, [Validators.min(0), Validators.max(100)]],
      shadingStatic: [0 as number | null, [Validators.min(0), Validators.max(100)]],
      degradationExtra: [0 as number | null, [Validators.min(0), Validators.max(100)]],
    }),
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
      fv.installationCost !== (data.installationCost ?? null) ||
      fv.segment !== (data.segment ?? 'residential') ||
      fv.dcAcRatio !== (data.dcAcRatio ?? 1.1) ||
      fv.albedo !== (data.albedo ?? 0.2) ||
      fv.tilt !== data.tilt ||
      fv.direction !== data.direction ||
      fv.azimuth !== (data.azimuth ?? null) ||
      fv.rawSpacing !== (data.rawSpacing ?? null) ||
      fv.panelNumber !== data.panelNumber ||
      fv.panelId !== this.getProjectPanelId(data.panel) ||
      JSON.stringify(fv.systemLosses ?? {}) !== JSON.stringify(data.systemLosses ?? {
        inverterEfficiency: 0.96,
        dcWiring: 2,
        acWiring: 1,
        mismatch: 2,
        soiling: 3,
        shadingStatic: 0,
        degradationExtra: 0,
      }) ||
      this.polygonEdited()
    );
  });

  readonly canSave = computed(() => this.configForm.valid && !this.isSaving());

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

  readonly stepNextLabel = computed(() =>
    this.activeStep() === 1 ? 'Next: Review & Save' : 'Next'
  );

  readonly projectTotalArea = computed(() => {
    const fromProject = this.projectData()?.surface;
    if (typeof fromProject === 'number' && Number.isFinite(fromProject)) {
      return fromProject;
    }
    const fromOptimal = this.optimalConfig()?.surfaceArea;
    if (typeof fromOptimal === 'number' && Number.isFinite(fromOptimal)) {
      return fromOptimal;
    }
    return 0;
  });

  readonly panelTagEntries = computed(() => {
    const panel = this.selectedPanelData();
    if (!panel) return [];
    const maybeBifacial = panel as Panel & { bifacial?: boolean };
    const isBifacial =
      typeof maybeBifacial.bifacial === 'boolean'
        ? maybeBifacial.bifacial ? 'Yes' : 'No'
        : 'N/A';
    return [
      { label: 'Efficiency', value: `${panel.efficiency}%`, icon: 'pi pi-gauge', severity: 'success' as const },
      { label: 'Peak', value: `${panel.wattPeak}W`, icon: 'pi pi-bolt', severity: 'warn' as const },
      { label: 'Technology', value: panel.technology ?? 'N/A', icon: 'pi pi-cog', severity: 'info' as const },
      { label: 'Bifacial', value: isBifacial, icon: 'pi pi-sparkles', severity: 'secondary' as const },
    ];
  });

  readonly selectedPanelName = computed(() => {
    const panel = this.selectedPanelData();
    if (!panel) return 'Panel details';
    return `${panel.brand} ${panel.model}`;
  });

  readonly selectedPanelTechDimensions = computed(() => {
    const panel = this.selectedPanelData();
    if (!panel) return 'N/A - N/A';
    const technology = panel.technology ?? 'N/A';
    const widthM = panel.dimensions.width / 1000;
    const heightM = panel.dimensions.height / 1000;
    const dimensions = `${widthM.toFixed(2)} m x ${heightM.toFixed(2)} m`;
    return `${technology} - ${dimensions}`;
  });

  readonly polygonAreaLabel = computed(() => `${this.projectTotalArea().toLocaleString(undefined, { maximumFractionDigits: 0 })} m²`);

  readonly previewWarnings = computed(() => this.configPreview()?.warnings ?? []);

  readonly annualProductionDelta = computed(() => {
    const preview = this.configPreview();
    if (!preview?.preview.annualProductionKwh || !preview.current.annualProductionKwh) return null;
    return preview.preview.annualProductionKwh - preview.current.annualProductionKwh;
  });

  readonly annualSavingsDelta = computed(() => {
    const preview = this.configPreview();
    if (preview?.preview.annualSavings == null || preview.current.annualSavings == null) return null;
    return preview.preview.annualSavings - preview.current.annualSavings;
  });

  readonly monthlyProductionChartOptions = computed((): Highcharts.Options => {
    const currentMonthly = this.projectData()?.pvgisRef?.monthlyKwh;
    const previewMonthly = this.configPreview()?.preview.monthlyProductionKwh;
    const monthly = previewMonthly ?? currentMonthly;
    if (!monthly?.length) return {};
    return {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, type: 'column', reflow: true },
      xAxis: { categories: MONTH_LABELS },
      yAxis: { title: { text: 'kWh/month' }, min: 0 },
      tooltip: { valueDecimals: 0, valueSuffix: ' kWh' },
      legend: { enabled: Boolean(currentMonthly?.length && previewMonthly?.length) },
      series: [
        ...(currentMonthly?.length && previewMonthly?.length
          ? [{ type: 'column' as const, name: 'Current', data: currentMonthly, color: CHART_COLORS.neutral, borderRadius: 4 }]
          : []),
        { type: 'column', name: previewMonthly?.length ? 'Preview estimate' : 'Production estimate', data: monthly, color: CHART_COLORS.production, borderRadius: 4 },
      ],
    };
  });

  readonly comparisonChartOptions = computed((): Highcharts.Options => {
    const preview = this.configPreview();
    if (!preview) return {};
    const currentProduction = preview.current.annualProductionKwh ?? 0;
    const previewProduction = preview.preview.annualProductionKwh ?? 0;
    const categories = ['Panels', 'Capacity', 'Annual production', 'Coverage'];
    const currentValues = [
      preview.current.panelNumber,
      preview.current.capacityKw,
      currentProduction / 1000,
      preview.current.coverage ?? 0,
    ];
    const previewValues = [
      preview.preview.panelNumber,
      preview.preview.capacityKw,
      previewProduction / 1000,
      preview.preview.coverage ?? 0,
    ];
    const normalize = (values: number[], index: number) => {
      const max = Math.max(currentValues[index] ?? 0, previewValues[index] ?? 0);
      return max > 0 ? (values[index] / max) * 100 : 0;
    };
    return {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, type: 'bar', reflow: true },
      xAxis: { categories },
      yAxis: { title: { text: 'Relative to best value' }, min: 0, max: 100, labels: { format: '{value}%' } },
      tooltip: { valueDecimals: 0, valueSuffix: '%' },
      legend: { enabled: true },
      series: [
        {
          type: 'bar',
          name: 'Current',
          data: currentValues.map((_, index) => normalize(currentValues, index)),
          color: CHART_COLORS.neutral,
          borderRadius: 4,
        },
        {
          type: 'bar',
          name: 'Preview',
          data: previewValues.map((_, index) => normalize(previewValues, index)),
          color: CHART_COLORS.savings,
          borderRadius: 4,
        },
      ],
    };
  });

  readonly sunPathChartOptions = computed((): Highcharts.Options => {
    const sp = this.sunPathData();
    if (!sp) return {};
    return {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, type: 'spline', reflow: true },
      xAxis: { categories: ['Summer', 'Equinox', 'Winter'] },
      yAxis: [
        { title: { text: 'Noon altitude °' }, min: 0 },
        { title: { text: 'Daylight hours' }, opposite: true, min: 0 },
      ],
      tooltip: { shared: true },
      legend: { enabled: true },
      plotOptions: { spline: { marker: { radius: 4 }, lineWidth: 3 } },
      series: [
        {
          type: 'spline',
          name: 'Noon altitude',
          data: [sp.summerSolstice.noonAltitude, sp.equinox.noonAltitude, sp.winterSolstice.noonAltitude],
          color: CHART_COLORS.production,
        },
        {
          type: 'spline',
          name: 'Daylight',
          data: [sp.summerSolstice.daylightHours, sp.equinox.daylightHours, sp.winterSolstice.daylightHours],
          yAxis: 1,
          color: CHART_COLORS.forecast,
        },
      ],
    };
  });

  readonly reviewChanges = computed<ReviewChange[]>(() => {
    const project = this.projectData();
    if (!project) return [];
    const fv = this.configForm.getRawValue();
    const changes: ReviewChange[] = [];
    const add = (label: string, before: unknown, after: unknown) => {
      const beforeText = before == null || before === '' ? '—' : String(before);
      const afterText = after == null || after === '' ? '—' : String(after);
      if (beforeText !== afterText) changes.push({ label, before: beforeText, after: afterText });
    };

    add('Project Name', project.name, fv.name);
    add('Country', project.country, fv.country);
    add('Timezone', project.timezone, fv.timezone);
    add('Currency', project.currency, fv.currency);
    add('Energy Price', project.price, fv.price);
    add('Panel', this.getProjectPanelId(project.panel), fv.panelId);
    add('Panel Count', project.panelNumber, fv.panelNumber);
    add('Tilt', project.tilt != null ? `${project.tilt}°` : null, fv.tilt != null ? `${fv.tilt}°` : null);
    add('Direction', project.direction, fv.direction);
    add('Azimuth', project.azimuth != null ? `${project.azimuth}°` : null, fv.azimuth != null ? `${fv.azimuth}°` : null);
    add('Row Spacing', project.rawSpacing != null ? `${project.rawSpacing} m` : null, fv.rawSpacing != null ? `${fv.rawSpacing} m` : null);
    add('Installation Cost', project.installationCost, fv.installationCost);
    add('Segment', project.segment ?? 'residential', fv.segment);
    add('DC:AC Ratio', project.dcAcRatio ?? 1.1, fv.dcAcRatio);
    add('Albedo', project.albedo ?? 0.2, fv.albedo);
    if (this.polygonEdited()) add('Area Polygon', `${project.area?.length ?? 0} points`, `${this.polygonCoords().length} points`);
    return changes;
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
        const projectPanel =
          projectResponse.panel && typeof projectResponse.panel !== 'string'
            ? ({ ...projectResponse.panel, id: projectResponse.panel.id || projectResponse.panel._id } as Panel)
            : null;
        const loadedPanels = (panelRes.panels ?? []).map((p) => ({ ...p, id: p.id ?? p._id ?? '' }));
        this.projectData.set(projectResponse);
        this.panels.set(
          projectPanel && !loadedPanels.some((p) => (p.id || p._id) === projectPanel.id)
            ? [projectPanel, ...loadedPanels]
            : loadedPanels,
        );
        this.populateForm(projectResponse);
        this.extractMapData(projectResponse);
        this.isLoading.set(false);
        this.fetchOptimalConfig(false);
        this.fetchConfigPreview();
        this.loadSunPath(id);
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
      panelId: this.getProjectPanelId(project.panel),
      panelNumber: project.panelNumber ?? 1,
      tilt: project.tilt ?? 30,
      direction: project.direction ?? 'south',
      azimuth: project.azimuth ?? null,
      rawSpacing: project.rawSpacing ?? null,
      installationCost: project.installationCost ?? null,
      segment: project.segment ?? 'residential',
      dcAcRatio: project.dcAcRatio ?? 1.1,
      albedo: project.albedo ?? 0.2,
      systemLosses: {
        inverterEfficiency: project.systemLosses?.inverterEfficiency ?? 0.96,
        dcWiring: project.systemLosses?.dcWiring ?? 2,
        acWiring: project.systemLosses?.acWiring ?? 1,
        mismatch: project.systemLosses?.mismatch ?? 2,
        soiling: project.systemLosses?.soiling ?? 3,
        shadingStatic: project.systemLosses?.shadingStatic ?? 0,
        degradationExtra: project.systemLosses?.degradationExtra ?? 0,
      },
    });
  }

  private getProjectPanelId(panel: ProjectResponse['panel']): string {
    if (!panel) return '';
    if (typeof panel === 'string') return panel;
    return panel.id || panel._id || '';
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

  private setupFormWatchers(): void {
    this.configForm
      .get('panelId')
      ?.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchOptimalConfig(true));

    this.configForm
      .get('tilt')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchOptimalConfig(true));

    this.configForm
      .get('azimuth')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchOptimalConfig(true));

    this.configForm.valueChanges
      .pipe(debounceTime(700), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchConfigPreview());
  }

  // ─── Sun Path ───
  private loadSunPath(id: string): void {
    this.isSunPathLoading.set(true);
    this.projectService.getSunPath(id).subscribe({
      next: (data) => { this.sunPathData.set(data); this.isSunPathLoading.set(false); },
      error: () => { this.isSunPathLoading.set(false); },
    });
  }

  formatDecimalHours(h: number): string {
    const totalMinutes = Math.round(h * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  // ─── Polygon Change ───
  onPolygonChange(coords: Coordinates[]): void {
    this.polygonCoords.set(coords);
    this.polygonEdited.set(true);
    this.fetchOptimalConfig(true);
    this.fetchConfigPreview();
  }

  // ─── Optimal Config ───
  private fetchOptimalConfig(autoApply: boolean): void {
    const panelId = this.configForm.get('panelId')?.value;
    const tilt = this.configForm.get('tilt')?.value;
    const coords = this.polygonCoords();
    if (!panelId || tilt == null || coords.length < 3) return;

    this.isCalculating.set(true);
    const area = coords.map((c) => ({ lat: c.lat, lon: c.lng }));
    const azimuth = this.configForm.get('azimuth')?.value ?? undefined;
    const request: OptimalConfigFromPolygonRequest = { area, panelId, tilt, azimuth };

    this.projectService.calculateOptimalConfig(request).subscribe({
      next: (res) => {
        this.optimalConfig.set(res);
        if (autoApply) {
          this.configForm.patchValue({ panelNumber: res.recommendedPanels });
        }
        this.isCalculating.set(false);
      },
      error: () => { this.isCalculating.set(false); },
    });
  }

  private fetchConfigPreview(): void {
    if (!this.projectId() || !this.configForm.valid) return;

    this.isPreviewLoading.set(true);
    this.projectService.previewConfig(this.projectId(), this.buildProjectPayload()).subscribe({
      next: (preview) => {
        this.configPreview.set(preview);
        if (preview.optimal) this.optimalConfig.set(preview.optimal);
        this.isPreviewLoading.set(false);
      },
      error: () => {
        this.isPreviewLoading.set(false);
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
  searchAddress(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) return;

    this.isSearching.set(true);
    this.searchError.set(null);

    this.geocodingService.search(trimmed).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (result) => {
        this.isSearching.set(false);
        this.mapCenter.set({ lat: result.lat, lng: result.lng });
        this.mapLat.set(result.lat);
        this.mapLng.set(result.lng);
        const timezone = this.geocodingService.getTimezoneForCountry(result.countryCode);
        this.configForm.patchValue({
          country: result.country,
          currency: this.geocodingService.getCurrencyForCountry(result.countryCode),
          ...(timezone ? { timezone } : {}),
        });
      },
      error: () => {
        this.isSearching.set(false);
        this.searchError.set('Location not found. Try a more specific address.');
      },
    });
  }

  // ─── Exit / Save ───
  onExitEditMode(): void {
    const targetUrl = ['/projects', this.projectId()];
    if (!this.hasUnsavedChanges()) {
      void this.router.navigate(targetUrl);
      return;
    }
    this.confirmationService.confirm({
      header: 'Discard unsaved changes?',
      message: 'You have unsaved changes. If you exit edit mode now, those changes will be lost.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Discard and Exit',
      rejectLabel: 'Stay Editing',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => void this.router.navigate(targetUrl),
    });
  }

  onSave(): void {
    if (!this.canSave()) return;

    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const payload = this.buildProjectPayload();

    this.projectService.updateProject(this.projectId(), payload as ProjectUpdateRequest).subscribe({
      next: (updated) => {
        this.projectData.set(updated as unknown as ProjectResponse);
        this.polygonEdited.set(false);
        this.saveSuccess.set(true);
        this.isSaving.set(false);
        this.fetchConfigPreview();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.saveError.set('Failed to save. Please check your inputs and try again.');
        this.isSaving.set(false);
      },
    });
  }

  private buildProjectPayload(): ProjectUpdateRequest & ProjectConfigPreviewRequest {
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
    if (fv.installationCost != null) payload['installationCost'] = fv.installationCost;
    if (fv.segment) payload['segment'] = fv.segment;
    if (fv.dcAcRatio != null) payload['dcAcRatio'] = fv.dcAcRatio;
    if (fv.albedo != null) payload['albedo'] = fv.albedo;
    const systemLosses = this.cleanSystemLosses(fv.systemLosses);
    if (Object.keys(systemLosses).length > 0) payload['systemLosses'] = systemLosses;

    if (this.polygonEdited() && this.polygonCoords().length >= 3) {
      payload['area'] = this.polygonCoords().map((c) => ({ lat: c.lat, lon: c.lng }));
    } else {
      const src = this.projectData();
      if (src && Array.isArray(src.area)) {
        payload['area'] = src.area;
      }
    }

    return payload as ProjectUpdateRequest & ProjectConfigPreviewRequest;
  }

  private cleanSystemLosses(losses: Partial<Record<keyof SystemLosses, number | null>> | null | undefined): SystemLosses {
    const clean: SystemLosses = {};
    if (!losses) return clean;
    for (const [key, value] of Object.entries(losses) as Array<[keyof SystemLosses, number | null]>) {
      if (value != null) clean[key] = value;
    }
    return clean;
  }
}
