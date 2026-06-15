import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import * as Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import { HighchartsChartModule } from 'highcharts-angular';
import { DecimalPipe } from '@angular/common';
import { DividerModule } from 'primeng/divider';

AccessibilityModule(Highcharts);

export interface EconomicValue {
  value: number;
  totalKwh: number;
  currency: string;
  symbol: string;
}

@Component({
  selector: 'app-production-charts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, HighchartsChartModule, DividerModule],
  templateUrl: './production-charts.component.html',
  styleUrls: ['./production-charts.component.scss'],
})
export class ProductionChartsComponent {
  readonly todayChartOptions = input<Highcharts.Options>({});
  readonly nextProdChartOptions = input<Highcharts.Options>({});
  readonly previousProdChartOptions = input<Highcharts.Options>({});
  readonly economicValue = input<EconomicValue | null>(null);
  readonly price = input<number | null>(null);
  readonly hasTodayData = input<boolean>(false);
  readonly hasPreviousProdData = input<boolean>(false);

  readonly Highcharts: typeof Highcharts = Highcharts;
}
