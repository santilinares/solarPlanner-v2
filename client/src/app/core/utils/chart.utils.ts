import * as Highcharts from 'highcharts';

export const CHART_COLORS = {
  production: '#f59e0b',
  productionSoft: '#fcd34d',
  savings: '#22c55e',
  savingsSoft: '#86efac',
  forecast: '#0ea5e9',
  neutral: '#64748b',
  comparison: '#6366f1',
  cost: '#ef4444',
} as const;

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const BASE_CHART_OPTIONS: Highcharts.Options = {
  chart: {
    backgroundColor: 'transparent',
    panning: { enabled: true, type: 'x' },
    panKey: 'shift',
    style: { fontFamily: 'inherit' },
    width: undefined,
    zooming: { type: 'x' },
  },
  credits: { enabled: false },
  title: { text: undefined },
  legend: { enabled: false },
  tooltip: { valueDecimals: 2 },
};

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'Fr',
    ARS: '$',
    BRL: 'R$',
    CLP: '$',
    MXN: '$',
    COP: '$',
  };
  return symbols[currency] ?? currency;
}

export function cumulativeValues(values: number[]): number[] {
  let total = 0;
  return values.map((value) => {
    total += value;
    return total;
  });
}

export function findBreakEvenYear(cumulativeSavings: number[], installationCost: number | null | undefined): number | null {
  if (installationCost == null) return null;
  const index = cumulativeSavings.findIndex((value) => value >= installationCost);
  return index >= 0 ? index + 1 : null;
}
