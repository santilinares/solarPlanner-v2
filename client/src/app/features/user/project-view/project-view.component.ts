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
import { ProjectResponse, SunPathData, PlanData, ProjectAnalytics } from '@core/models';
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

  private readonly CHART_THEME: Highcharts.Options = {
    chart: { backgroundColor: 'transparent', style: { fontFamily: 'inherit' }, width: undefined },
    credits: { enabled: false },
    title: { text: undefined },
    legend: { enabled: false },
    tooltip: { valueDecimals: 2, valueSuffix: ' kWh' },
  };

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
    const symbol = this.getCurrencySymbol(data.currency ?? 'EUR');
    return { value, totalKwh, currency: data.currency ?? 'EUR', symbol };
  });

  readonly hasTodayData = computed(() => (this.projectData()?.nextProd?.length ?? 0) > 0);
  readonly hasPreviousProdData = computed(() => (this.projectData()?.previousProd?.length ?? 0) > 0);

  readonly todayChartOptions = computed((): Highcharts.Options => {
    const prodToday = this.projectData()?.prodToday ?? [];
    return {
      ...this.CHART_THEME,
      chart: { ...this.CHART_THEME.chart, type: 'column', reflow: true },
      xAxis: {
        categories: prodToday.map((p) => {
          const d = new Date(p.dateTime);
          return `${d.getHours().toString().padStart(2, '0')}:00`;
        }),
        title: { text: 'Hour' },
      },
      yAxis: { title: { text: 'kWh' }, min: 0 },
      series: [{ type: 'column', name: 'Production', data: prodToday.map((p) => p.pv), color: '#f59e0b', borderRadius: 4 }],
    };
  });

  readonly nextProdChartOptions = computed((): Highcharts.Options => {
    const nextProd = this.projectData()?.nextProd ?? [];
    return {
      ...this.CHART_THEME,
      chart: { ...this.CHART_THEME.chart, type: 'bar', reflow: true },
      xAxis: {
        categories: nextProd.map((p) =>
          new Date(p.dateTime).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
        ),
      },
      yAxis: { title: { text: 'kWh/day' }, min: 0 },
      series: [{ type: 'bar', name: 'Forecast', data: nextProd.map((p) => p.pv), color: '#22c55e', borderRadius: 4 }],
    };
  });

  readonly previousProdChartOptions = computed((): Highcharts.Options => {
    const previousProd = this.projectData()?.previousProd ?? [];
    return {
      ...this.CHART_THEME,
      chart: { ...this.CHART_THEME.chart, type: 'bar', reflow: true },
      xAxis: {
        categories: previousProd.map((p) =>
          new Date(p.dateTime).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
        ),
      },
      yAxis: { title: { text: 'kWh/day' }, min: 0 },
      series: [{ type: 'bar', name: 'Actual', data: previousProd.map((p) => p.pv), color: '#6366f1', borderRadius: 4 }],
    };
  });

  readonly savingsChartOptions = computed((): Highcharts.Options => {
    const perYear = this.analytics()?.annualSavingsPerYear;
    if (!perYear) return {};
    return {
      ...this.CHART_THEME,
      chart: { ...this.CHART_THEME.chart, type: 'column', reflow: true },
      xAxis: { categories: perYear.map((_, i) => `Y${i + 1}`), title: { text: 'Year' } },
      yAxis: { title: { text: this.projectData()?.currency ?? 'EUR' }, min: 0 },
      tooltip: { valueDecimals: 2, valueSuffix: ` ${this.projectData()?.currency ?? 'EUR'}` },
      series: [{ type: 'column', name: 'Annual Savings', data: perYear, color: '#22c55e', borderRadius: 4 }],
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
        this.fileService.generateProjectPDF(planData);
        this.isDownloadingPlan.set(false);
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

  formatDecimalHours(h: number): string {
    const totalMinutes = Math.round(h * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      EUR: '€', USD: '$', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹',
      AUD: 'A$', CAD: 'C$', CHF: 'Fr', ARS: '$', BRL: 'R$', CLP: '$', MXN: '$', COP: '$',
    };
    return symbols[currency] ?? currency;
  }
}
