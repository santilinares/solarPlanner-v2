import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { DecimalPipe } from '@angular/common';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { ProjectAnalytics } from '@core/models';
import { getCurrencySymbol } from '@core/utils/chart.utils';

@Component({
  selector: 'app-project-analytics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, HighchartsChartModule, DividerModule, SkeletonModule],
  templateUrl: './project-analytics.component.html',
  styleUrls: ['./project-analytics.component.scss'],
})
export class ProjectAnalyticsComponent {
  readonly analytics = input<ProjectAnalytics | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly currency = input<string>('EUR');
  readonly price = input<number | null>(null);
  readonly pvgisYearlyKwh = input<number | null>(null);
  readonly savingsChartOptions = input<Highcharts.Options>({});

  readonly Highcharts: typeof Highcharts = Highcharts;

  getCurrencySymbol(currency: string): string {
    return getCurrencySymbol(currency);
  }
}
