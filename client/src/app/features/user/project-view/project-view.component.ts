import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';

import { ProjectService } from '@core/services/project.service';
import { FileService } from '@core/services/file.service';
import { ProjectResponse, SunPathData, PlanData, ProjectAnalytics, ProjectPanelSummary } from '@core/models';
import {
  BASE_CHART_OPTIONS,
  CHART_COLORS,
  MONTH_LABELS,
  cumulativeValues,
  findBreakEvenYear,
  getCurrencySymbol,
} from '@core/utils/chart.utils';
import { ProjectAnalyticsComponent } from './components/project-analytics/project-analytics.component';
import { ProductionChartsComponent, EconomicValue } from './components/production-charts/production-charts.component';

@Component({
  selector: 'app-project-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DecimalPipe,
    ButtonModule,
    DividerModule,
    SkeletonModule,
    TagModule,
    ToastModule,
    CardModule,
    HighchartsChartModule,
    ProjectAnalyticsComponent,
    ProductionChartsComponent,
  ],
  providers: [MessageService],
  templateUrl: './project-view.component.html',
  styleUrls: ['./project-view.component.scss'],
})
export class ProjectViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly fileService = inject(FileService);
  private readonly messageService = inject(MessageService);

  // ─── State ───
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly isDownloadingPlan = signal(false);
  readonly isAnalyticsLoading = signal(false);
  readonly isSunPathLoading = signal(false);
  readonly projectData = signal<ProjectResponse | null>(null);
  readonly analytics = signal<ProjectAnalytics | null>(null);
  readonly sunPathData = signal<SunPathData | null>(null);
  readonly projectId = signal('');

  // ─── Highcharts ───
  readonly Highcharts: typeof Highcharts = Highcharts;

  // ─── Computed ───
  readonly hasProductionData = computed(() => {
    const data = this.projectData();
    return (
      (data?.prodToday?.length ?? 0) > 0 ||
      (data?.nextProd?.length ?? 0) > 0 ||
      (data?.previousProd?.length ?? 0) > 0
    );
  });

  readonly economicValue = computed((): EconomicValue | null => {
    const data = this.projectData();
    if (!data?.price) return null;
    const todaySum = (data.prodToday ?? []).reduce((s, p) => s + p.pv, 0);
    const previousSum = (data.previousProd ?? []).reduce((s, p) => s + p.pv, 0);
    const totalKwh = todaySum + previousSum;
    const value = totalKwh * data.price;
    const symbol = getCurrencySymbol(data.currency ?? 'EUR');
    return { value, totalKwh, currency: data.currency ?? 'EUR', symbol };
  });

  readonly hasTodayData = computed(() => (this.projectData()?.prodToday?.length ?? 0) > 0);
  readonly hasNextProdData = computed(() => (this.projectData()?.nextProd?.length ?? 0) > 0);
  readonly hasPreviousProdData = computed(() => (this.projectData()?.previousProd?.length ?? 0) > 0);

  readonly projectPanel = computed<ProjectPanelSummary | null>(() => {
    const panel = this.projectData()?.panel;
    return panel && typeof panel !== 'string' ? panel : null;
  });

  readonly totalCapacityKw = computed(() => {
    const project = this.projectData();
    const panel = this.projectPanel();
    return project && panel ? (panel.wattPeak * project.panelNumber) / 1000 : 0;
  });

  readonly todayProductionKwh = computed(() =>
    (this.projectData()?.prodToday ?? []).reduce((sum, point) => sum + point.pv, 0)
  );

  readonly freshnessLabel = computed(() => {
    const refreshed = this.projectData()?.lastRefreshedAt;
    if (!refreshed) return 'Production data not refreshed yet';
    return `Last refreshed ${new Date(refreshed).toLocaleString()}`;
  });

  readonly isProductionStale = computed(() => {
    const refreshed = this.projectData()?.lastRefreshedAt;
    if (!refreshed) return true;
    return Date.now() - new Date(refreshed).getTime() > 6 * 60 * 60 * 1000;
  });

  readonly todayChartOptions = computed((): Highcharts.Options => {
    const prodToday = this.projectData()?.prodToday ?? [];
    return {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, type: 'area', reflow: true },
      xAxis: {
        categories: prodToday.map((p) => {
          const d = new Date(p.dateTime);
          return `${d.getHours().toString().padStart(2, '0')}:00`;
        }),
        crosshair: true,
        title: { text: 'Hour' },
      },
      yAxis: { title: { text: 'kWh' }, min: 0 },
      tooltip: { valueDecimals: 2, valueSuffix: ' kWh' },
      plotOptions: {
        area: {
          marker: { enabled: false },
          fillOpacity: 0.22,
          lineWidth: 3,
        },
      },
      series: [{ type: 'area', name: 'Production curve', data: prodToday.map((p) => p.pv), color: CHART_COLORS.production }],
    };
  });

  readonly nextProdChartOptions = computed((): Highcharts.Options => {
    const nextProd = this.projectData()?.nextProd ?? [];
    return {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, type: 'column', reflow: true },
      xAxis: {
        categories: nextProd.map((p) => this.formatProductionSlotLabel(p.dateTime)),
        crosshair: true,
        labels: { rotation: -35, style: { fontSize: '0.72rem' } },
      },
      yAxis: { title: { text: 'kWh/interval' }, min: 0 },
      tooltip: { valueDecimals: 2, valueSuffix: ' kWh/interval' },
      series: [{ type: 'column', name: 'Forecast interval', data: nextProd.map((p) => p.pv), color: CHART_COLORS.forecast, borderRadius: 4 }],
    };
  });

  readonly previousProdChartOptions = computed((): Highcharts.Options => {
    const previousProd = this.projectData()?.previousProd ?? [];
    return {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, type: 'column', reflow: true },
      xAxis: {
        categories: previousProd.map((p) => this.formatProductionSlotLabel(p.dateTime)),
        crosshair: true,
        labels: { rotation: -35, style: { fontSize: '0.72rem' } },
      },
      yAxis: { title: { text: 'kWh/interval' }, min: 0 },
      tooltip: { valueDecimals: 2, valueSuffix: ' kWh/interval' },
      series: [{ type: 'column', name: 'Recent interval', data: previousProd.map((p) => p.pv), color: CHART_COLORS.comparison, borderRadius: 4 }],
    };
  });

  readonly savingsChartOptions = computed((): Highcharts.Options => {
    const perYear = this.analytics()?.annualSavingsPerYear;
    if (!perYear) return {};
    const cumulativeSavings = cumulativeValues(perYear);
    const installCost = this.analytics()?.installationCostUsed;
    const breakEvenYear = findBreakEvenYear(cumulativeSavings, installCost);
    const currency = this.projectData()?.currency ?? 'EUR';
    return {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, reflow: true },
      xAxis: {
        categories: perYear.map((_, i) => `Y${i + 1}`),
        crosshair: true,
        title: { text: 'Year' },
        plotLines: breakEvenYear
          ? [{
              color: CHART_COLORS.savings,
              dashStyle: 'ShortDash',
              value: breakEvenYear - 1,
              width: 2,
              label: { text: `Break-even Y${breakEvenYear}`, rotation: 0, y: 16 },
              zIndex: 5,
            }]
          : [],
      },
      yAxis: { title: { text: currency }, min: 0 },
      tooltip: { shared: true, valueDecimals: 0, valueSuffix: ` ${currency}` },
      legend: { enabled: true },
      series: [
        { type: 'spline', name: 'Cumulative avoided cost', data: cumulativeSavings, color: CHART_COLORS.savings, lineWidth: 3, zIndex: 2 },
        { type: 'column', name: 'Annual avoided cost', data: perYear, color: CHART_COLORS.savingsSoft, borderRadius: 4, yAxis: 0 },
        ...(installCost != null
          ? [{ type: 'line' as const, name: 'Installation cost', data: perYear.map(() => installCost), color: CHART_COLORS.cost, dashStyle: 'Dash' as const, marker: { enabled: false } }]
          : []),
      ],
    };
  });

  readonly monthlyProductionChartOptions = computed((): Highcharts.Options => {
    const monthly = this.projectData()?.pvgisRef?.monthlyKwh;
    if (!monthly?.length) return {};
    const annualTotal = monthly.reduce((sum, value) => sum + value, 0);
    const monthlyAverage = annualTotal / monthly.length;
    return {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, type: 'column', reflow: true },
      subtitle: { text: `Annual total ${annualTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh` },
      xAxis: { categories: MONTH_LABELS, crosshair: true },
      yAxis: { title: { text: 'kWh/month' }, min: 0 },
      tooltip: { valueDecimals: 0, valueSuffix: ' kWh' },
      legend: { enabled: true },
      series: [
        { type: 'column', name: 'Monthly production', data: monthly, color: CHART_COLORS.production, borderRadius: 4 },
        { type: 'line', name: 'Monthly average', data: monthly.map(() => monthlyAverage), color: CHART_COLORS.forecast, dashStyle: 'ShortDash', marker: { enabled: false } },
      ],
    };
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

  private loadData(id: string): void {
    this.projectService.getProjectById(id).subscribe({
      next: (project) => {
        this.projectData.set(project as unknown as ProjectResponse);
        this.isLoading.set(false);
        this.loadSunPath(id);
        this.loadAnalytics(id);
      },
      error: () => {
        this.errorMessage.set('Project not found or unavailable.');
        this.isLoading.set(false);
      },
    });
  }

  private loadAnalytics(id: string): void {
    this.isAnalyticsLoading.set(true);
    this.projectService.getAnalytics(id).subscribe({
      next: (data) => { this.analytics.set(data); this.isAnalyticsLoading.set(false); },
      error: () => { this.isAnalyticsLoading.set(false); },
    });
  }

  private loadSunPath(id: string): void {
    this.isSunPathLoading.set(true);
    this.projectService.getSunPath(id).subscribe({
      next: (data) => { this.sunPathData.set(data); this.isSunPathLoading.set(false); },
      error: () => { this.isSunPathLoading.set(false); },
    });
  }

  downloadPlan(): void {
    this.isDownloadingPlan.set(true);
    this.projectService.getPlanData(this.projectId()).subscribe({
      next: (planData: PlanData) => {
        this.fileService.generateProjectPDF({
          mode: 'view',
          project: this.projectData() ?? planData.project,
          planData,
          panelDetails: planData.panelDetails,
          totalCapacityKw: planData.totalCapacityKw,
          analytics: this.analytics(),
          sunPathData: this.sunPathData(),
          charts: [
            { title: 'Today Production', options: this.todayChartOptions() },
            { title: 'Forecast Production', options: this.nextProdChartOptions() },
            { title: 'Recent Production', options: this.previousProdChartOptions() },
            { title: 'Monthly Production Estimate', options: this.monthlyProductionChartOptions() },
            { title: '25-Year Avoided Cost Projection', options: this.savingsChartOptions() },
          ],
        }).then(() => {
          this.isDownloadingPlan.set(false);
        }).catch(() => {
          this.isDownloadingPlan.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Download Failed',
            detail: 'Could not generate the project plan. Please try again.',
          });
        });
      },
      error: () => {
        this.isDownloadingPlan.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: 'Could not generate the project plan. Please try again.',
        });
      },
    });
  }

  formatClockTime(value: string): string {
    return value.includes('T') ? value.slice(11, 16) : value;
  }

  private formatProductionSlotLabel(dateTime: string): string {
    const d = new Date(dateTime);
    return d.toLocaleString('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getCurrencySymbol(currency: string): string {
    return getCurrencySymbol(currency);
  }
}
