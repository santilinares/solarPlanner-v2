import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import * as Highcharts from 'highcharts';
import {
  OptimalConfigResponse,
  PanelDetails,
  PlanData,
  ProjectAnalytics,
  ProjectConfigPreview,
  ProjectResponse,
  SunPathData,
} from '../models';
import { getCurrencySymbol } from '../utils/chart.utils';

export interface ProjectPdfChart {
  title: string;
  options: Highcharts.Options;
}

export interface ProjectPdfReviewChange {
  label: string;
  before: string;
  after: string;
}

interface ProjectPdfBaseContext {
  project: ProjectResponse;
  planData?: PlanData;
  panelDetails?: PanelDetails | null;
  totalCapacityKw?: number;
  sunPathData?: SunPathData | null;
  charts?: ProjectPdfChart[];
}

export interface ProjectPdfViewContext extends ProjectPdfBaseContext {
  mode: 'view';
  analytics?: ProjectAnalytics | null;
}

export interface ProjectPdfConfigurePreviewContext extends ProjectPdfBaseContext {
  mode: 'configure-preview';
  configPreview: ProjectConfigPreview | null;
  optimalConfig?: OptimalConfigResponse | null;
  reviewChanges: ProjectPdfReviewChange[];
  selectedPanelLabel: string;
  selectedDirectionLabel: string;
  projectTotalArea: number;
  hasUnsavedChanges: boolean;
}

export type ProjectPdfReportContext = ProjectPdfViewContext | ProjectPdfConfigurePreviewContext;

interface PdfRow {
  label: string;
  value: string;
}

interface PdfMetric {
  label: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly margin = 16;
  private readonly accentColor: [number, number, number] = [30, 120, 60];
  private readonly textColor: [number, number, number] = [34, 40, 49];
  private readonly mutedColor: [number, number, number] = [105, 113, 124];

  async generateProjectPDF(context: ProjectPdfReportContext): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const state = { y: 20 };
    const generatedAt = context.planData?.generatedAt ?? new Date().toISOString();

    this.addTitle(doc, state, context, generatedAt);
    this.addMetrics(doc, state, this.buildMainMetrics(context));
    this.addSection(doc, state, 'Project Summary');
    this.addRows(doc, state, this.buildProjectRows(context));

    const panelRows = this.buildPanelRows(context);
    if (panelRows.length) {
      this.addSection(doc, state, 'Panel Details');
      this.addRows(doc, state, panelRows);
    }

    if (context.mode === 'view') {
      this.addViewSections(doc, state, context);
    } else {
      this.addConfigurePreviewSections(doc, state, context);
    }

    await this.addCharts(doc, state, context.charts ?? []);
    this.addFooters(doc, generatedAt);
    doc.save(this.buildFilename(context));
  }

  private addTitle(
    doc: jsPDF,
    state: { y: number },
    context: ProjectPdfReportContext,
    generatedAt: string,
  ): void {
    const pageW = doc.internal.pageSize.getWidth();
    const title = context.project.name || 'Solar project';
    const subtitle = context.mode === 'view' ? 'Solar Project Report' : 'Solar Configuration Preview Report';

    doc.setFillColor(245, 250, 247);
    doc.rect(0, 0, pageW, 42, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    doc.setTextColor(...this.accentColor);
    doc.text(title, this.margin, state.y);
    state.y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...this.mutedColor);
    doc.text(subtitle, this.margin, state.y);
    state.y += 6;
    doc.text(`Generated ${new Date(generatedAt).toLocaleString()}`, this.margin, state.y);

    if (context.mode === 'configure-preview' && context.hasUnsavedChanges) {
      doc.setFillColor(255, 248, 225);
      doc.setDrawColor(236, 175, 20);
      doc.roundedRect(pageW - this.margin - 48, 16, 48, 10, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(130, 85, 0);
      doc.text('UNSAVED PREVIEW', pageW - this.margin - 43, 22.5);
    }

    state.y = 52;
  }

  private addViewSections(doc: jsPDF, state: { y: number }, context: ProjectPdfViewContext): void {
    const analytics = context.analytics;
    if (analytics) {
      const currency = context.project.currency ?? 'EUR';
      const symbol = getCurrencySymbol(currency);
      this.addSection(doc, state, 'Economic Analysis');
      this.addRows(doc, state, [
        { label: 'Annual avoided energy cost', value: this.money(analytics.annualSavingsEur, symbol) },
        { label: 'Payback', value: analytics.paybackYears != null ? `${this.number(analytics.paybackYears, 1)} years` : '-' },
        { label: '25-year gross ROI estimate', value: analytics.roi25Years != null ? `${this.number(analytics.roi25Years, 0)}%` : '-' },
        { label: 'Installation cost used', value: this.money(analytics.installationCostUsed, symbol) },
        { label: 'Installation cost source', value: analytics.installationCostSource ?? '-' },
        { label: 'Capacity factor', value: `${this.number(analytics.capacityFactor, 1)}%` },
        { label: 'Performance ratio', value: analytics.performanceRatio != null ? `${this.number(analytics.performanceRatio, 1)}%` : '-' },
      ]);
    }

    this.addSunPathSection(doc, state, context.sunPathData ?? null);
  }

  private addConfigurePreviewSections(
    doc: jsPDF,
    state: { y: number },
    context: ProjectPdfConfigurePreviewContext,
  ): void {
    const preview = context.configPreview;
    this.addSection(doc, state, 'Preview Configuration');
    this.addRows(doc, state, [
      { label: 'Selected panel', value: context.selectedPanelLabel },
      { label: 'Direction', value: context.selectedDirectionLabel },
      { label: 'Project area', value: `${this.number(context.projectTotalArea, 0)} m²` },
      { label: 'Current panel count', value: preview ? String(preview.current.panelNumber) : '-' },
      { label: 'Preview panel count', value: preview ? String(preview.preview.panelNumber) : '-' },
      { label: 'Preview capacity', value: preview ? `${this.number(preview.preview.capacityKw, 2)} kW` : '-' },
      { label: 'Preview annual production', value: this.kwh(preview?.preview.annualProductionKwh) },
      { label: 'Preview annual avoided cost', value: this.money(preview?.preview.annualSavings, preview?.currency ?? context.project.currency ?? 'EUR') },
      { label: 'Preview coverage', value: preview?.preview.coverage != null ? `${this.number(preview.preview.coverage, 1)}%` : '-' },
      { label: 'Recommended spacing', value: preview?.preview.rowSpacing != null ? `${this.number(preview.preview.rowSpacing, 2)} m` : '-' },
      { label: 'Optimal panel count', value: context.optimalConfig ? String(context.optimalConfig.recommendedPanels) : '-' },
    ]);

    if (context.reviewChanges.length) {
      this.addSection(doc, state, 'Pending Changes');
      this.addRows(
        doc,
        state,
        context.reviewChanges.map((change) => ({
          label: change.label,
          value: `${change.before} -> ${change.after}`,
        })),
      );
    }

    if (preview?.warnings.length) {
      this.addSection(doc, state, 'Preview Warnings');
      this.addBullets(doc, state, preview.warnings);
    }

    this.addSunPathSection(doc, state, context.sunPathData ?? null);
  }

  private addSunPathSection(doc: jsPDF, state: { y: number }, sunPathData: SunPathData | null): void {
    if (!sunPathData) return;
    this.addSection(doc, state, 'Sun Path');
    this.addRows(doc, state, [
      { label: 'Summer noon altitude', value: `${this.number(sunPathData.summerSolstice.noonAltitude, 1)}°` },
      { label: 'Equinox noon altitude', value: `${this.number(sunPathData.equinox.noonAltitude, 1)}°` },
      { label: 'Winter noon altitude', value: `${this.number(sunPathData.winterSolstice.noonAltitude, 1)}°` },
      { label: 'Summer daylight', value: `${this.number(sunPathData.summerSolstice.daylightHours, 1)} h` },
      { label: 'Equinox daylight', value: `${this.number(sunPathData.equinox.daylightHours, 1)} h` },
      { label: 'Winter daylight', value: `${this.number(sunPathData.winterSolstice.daylightHours, 1)} h` },
      ...(sunPathData.todaySunlight
        ? [
            { label: 'Today sunrise', value: this.clock(sunPathData.todaySunlight.sunrise) },
            { label: 'Today sunset', value: this.clock(sunPathData.todaySunlight.sunset) },
            { label: 'Today daylight', value: `${this.number(sunPathData.todaySunlight.daylightHours, 1)} h` },
          ]
        : []),
    ]);
  }

  private async addCharts(doc: jsPDF, state: { y: number }, charts: ProjectPdfChart[]): Promise<void> {
    const availableCharts = charts.filter((chart) => this.hasChartSeries(chart.options));
    if (!availableCharts.length) return;

    this.addSection(doc, state, 'Charts');
    for (const chart of availableCharts) {
      this.ensureSpace(doc, state, 82);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...this.textColor);
      doc.text(chart.title, this.margin, state.y);
      state.y += 4;

      const image = await this.renderChart(chart.options);
      if (image) {
        doc.addImage(image, 'PNG', this.margin, state.y, 178, 72);
        state.y += 80;
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...this.mutedColor);
        doc.text('Chart could not be rendered in this browser session.', this.margin, state.y);
        state.y += 8;
      }
    }
  }

  private addMetrics(doc: jsPDF, state: { y: number }, metrics: PdfMetric[]): void {
    const pageW = doc.internal.pageSize.getWidth();
    const gap = 4;
    const cardW = (pageW - this.margin * 2 - gap * 2) / 3;
    const cardH = 20;

    metrics.slice(0, 6).forEach((metric, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = this.margin + col * (cardW + gap);
      const y = state.y + row * (cardH + gap);
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...this.mutedColor);
      doc.text(metric.label, x + 4, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...this.textColor);
      doc.text(doc.splitTextToSize(metric.value, cardW - 8), x + 4, y + 14);
    });

    state.y += metrics.length > 3 ? 48 : 24;
  }

  private addSection(doc: jsPDF, state: { y: number }, title: string): void {
    this.ensureSpace(doc, state, 18);
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.accentColor);
    doc.text(title, this.margin, state.y);
    state.y += 2;
    doc.setDrawColor(...this.accentColor);
    doc.setLineWidth(0.35);
    doc.line(this.margin, state.y, pageW - this.margin, state.y);
    state.y += 6;
  }

  private addRows(doc: jsPDF, state: { y: number }, rows: PdfRow[]): void {
    for (const row of rows) {
      this.ensureSpace(doc, state, 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...this.mutedColor);
      doc.text(row.label, this.margin, state.y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.textColor);
      doc.text(doc.splitTextToSize(row.value || '-', 82), 95, state.y);
      state.y += 7;
    }
    state.y += 3;
  }

  private addBullets(doc: jsPDF, state: { y: number }, bullets: string[]): void {
    for (const bullet of bullets) {
      this.ensureSpace(doc, state, 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...this.textColor);
      const lines = doc.splitTextToSize(`- ${bullet}`, 170);
      doc.text(lines, this.margin, state.y);
      state.y += lines.length * 5 + 2;
    }
    state.y += 3;
  }

  private buildMainMetrics(context: ProjectPdfReportContext): PdfMetric[] {
    const project = context.project;
    const yearlyProduction = project.pvgisRef?.yearlyKwh ?? context.planData?.estimatedAnnualProduction ?? null;
    const totalCapacity = context.totalCapacityKw ?? context.planData?.totalCapacityKw ?? this.deriveCapacity(project);
    const todayProduction = (project.prodToday ?? []).reduce((sum, point) => sum + point.pv, 0);

    if (context.mode === 'configure-preview') {
      const preview = context.configPreview?.preview;
      return [
        { label: 'Preview Capacity', value: `${this.number(preview?.capacityKw ?? totalCapacity, 2)} kW` },
        { label: 'Annual Production', value: this.kwh(preview?.annualProductionKwh ?? yearlyProduction) },
        { label: 'Panel Count', value: String(preview?.panelNumber ?? project.panelNumber ?? '-') },
        { label: 'Coverage', value: preview?.coverage != null ? `${this.number(preview.coverage, 1)}%` : '-' },
        { label: 'Annual Avoided Cost', value: this.money(preview?.annualSavings, context.configPreview?.currency ?? project.currency ?? 'EUR') },
        { label: 'Report Mode', value: context.hasUnsavedChanges ? 'Unsaved preview' : 'Saved configuration' },
      ];
    }

    return [
      { label: 'Total Capacity', value: `${this.number(totalCapacity, 2)} kW` },
      { label: 'Annual Production', value: this.kwh(yearlyProduction) },
      { label: 'Today', value: this.kwh(todayProduction) },
      { label: 'Annual Avoided Cost', value: this.money(context.analytics?.annualSavingsEur, getCurrencySymbol(project.currency ?? 'EUR')) },
      { label: 'Payback', value: context.analytics?.paybackYears != null ? `${this.number(context.analytics.paybackYears, 1)} years` : '-' },
      { label: '25-Year ROI', value: context.analytics?.roi25Years != null ? `${this.number(context.analytics.roi25Years, 0)}%` : '-' },
    ];
  }

  private buildProjectRows(context: ProjectPdfReportContext): PdfRow[] {
    const project = context.project;
    return [
      { label: 'Location', value: `${project.lat ?? '-'}, ${project.lon ?? '-'}` },
      { label: 'Country', value: project.country ?? '-' },
      { label: 'Timezone', value: project.timezone ?? '-' },
      { label: 'Surface area', value: project.surface != null ? `${this.number(project.surface, 0)} m²` : '-' },
      { label: 'Tilt', value: `${project.tilt}°` },
      { label: 'Direction', value: project.direction ?? '-' },
      { label: 'Azimuth', value: project.azimuth != null ? `${project.azimuth}°` : '-' },
      { label: 'Row spacing', value: project.rawSpacing != null ? `${this.number(project.rawSpacing, 2)} m` : '-' },
      { label: 'Energy price', value: project.price != null ? `${this.number(project.price, 4)} ${project.currency ?? 'EUR'}/kWh` : '-' },
      { label: 'Install date', value: project.installDate ? new Date(project.installDate).toLocaleDateString() : '-' },
    ];
  }

  private buildPanelRows(context: ProjectPdfReportContext): PdfRow[] {
    const panel = context.panelDetails ?? context.planData?.panelDetails;
    if (panel) {
      return [
        { label: 'Panel', value: panel.name },
        { label: 'Technology', value: panel.technology },
        { label: 'Capacity per panel', value: `${panel.capacity} W` },
        { label: 'Dimensions', value: `${panel.width} mm x ${panel.height} mm` },
        { label: 'Panel count', value: String(context.project.panelNumber) },
      ];
    }

    const projectPanel = context.project.panel;
    if (!projectPanel || typeof projectPanel === 'string') return [];
    return [
      { label: 'Panel', value: `${projectPanel.brand} ${projectPanel.model}` },
      { label: 'Capacity per panel', value: `${projectPanel.wattPeak} W` },
      { label: 'Dimensions', value: `${projectPanel.dimensions.width} mm x ${projectPanel.dimensions.height} mm` },
      { label: 'Panel count', value: String(context.project.panelNumber) },
    ];
  }

  private async renderChart(options: Highcharts.Options): Promise<string | null> {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '0';
    host.style.width = '900px';
    host.style.height = '360px';
    document.body.appendChild(host);

    let chart: Highcharts.Chart | null = null;
    try {
      chart = Highcharts.chart(host, {
        ...options,
        chart: {
          ...(options.chart ?? {}),
          animation: false,
          backgroundColor: '#ffffff',
          height: 360,
          width: 900,
        },
        accessibility: { enabled: false },
      });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const svg = chart.container.querySelector('svg');
      if (!svg) return null;
      const svgText = new XMLSerializer().serializeToString(svg);
      return await this.svgToPng(svgText, 900, 360);
    } catch {
      return null;
    } finally {
      chart?.destroy();
      host.remove();
    }
  }

  private svgToPng(svgText: string, width: number, height: number): Promise<string | null> {
    return new Promise((resolve) => {
      const image = new Image();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(null);
        return;
      }

      image.onload = () => {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(image.src);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => {
        URL.revokeObjectURL(image.src);
        resolve(null);
      };
      image.src = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
    });
  }

  private hasChartSeries(options: Highcharts.Options): boolean {
    return Boolean(options.series?.some((series) => {
      const data = 'data' in series ? series.data : undefined;
      return Array.isArray(data) && data.length > 0;
    }));
  }

  private ensureSpace(doc: jsPDF, state: { y: number }, needed: number): void {
    const pageH = doc.internal.pageSize.getHeight();
    if (state.y + needed <= pageH - 18) return;
    doc.addPage();
    state.y = 20;
  }

  private addFooters(doc: jsPDF, generatedAt: string): void {
    const pageCount = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated ${new Date(generatedAt).toLocaleString()}`, this.margin, pageH - 9);
      doc.text(`Page ${page} / ${pageCount}`, pageW - this.margin - 18, pageH - 9);
    }
  }

  private buildFilename(context: ProjectPdfReportContext): string {
    const slug = (context.project.name || 'solar-plan')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return context.mode === 'view' ? `${slug}-solar-report.pdf` : `${slug}-configuration-preview.pdf`;
  }

  private deriveCapacity(project: ProjectResponse): number {
    const panel = project.panel;
    return panel && typeof panel !== 'string' ? (panel.wattPeak * project.panelNumber) / 1000 : 0;
  }

  private kwh(value: number | null | undefined): string {
    return value != null ? `${this.number(value, 0)} kWh` : '-';
  }

  private money(value: number | null | undefined, currencyOrSymbol: string): string {
    if (value == null) return '-';
    const symbol = currencyOrSymbol.length === 3 ? getCurrencySymbol(currencyOrSymbol) : currencyOrSymbol;
    return `${symbol} ${this.number(value, 0)}`;
  }

  private number(value: number | null | undefined, maximumFractionDigits: number): string {
    if (value == null || !Number.isFinite(value)) return '-';
    return value.toLocaleString(undefined, { maximumFractionDigits });
  }

  private clock(value: string): string {
    return value.includes('T') ? value.slice(11, 16) : value;
  }
}
