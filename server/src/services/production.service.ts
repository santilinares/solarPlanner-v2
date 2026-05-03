/**
 * Production Service
 * Implements the hourly PV output model (spec §5.4) and orchestrates the
 * three production time windows: prodToday, previousProd, nextProd.
 *
 * Units: all IProductionPoint.pv values are in kWh.
 *
 * Model summary (per §5.4):
 *   1. Cell temp   : t_cell = t_amb + (NOCT − 20) × (GTI / 800)
 *   2. Temp derating: p_dc  = wattPeak × (1 + γPmp/100 × ΔT)
 *   3. Degradation : p_dc  ×= (1 − degFirstYear%) × (1 − degAnnual%)^(year−1)
 *   4. Irradiance  : p_dc  ×= GTI / 1000
 *   5. Array DC    : p_arr = p_dc × panelCount
 *   6. System losses: p_ac = p_arr × η_inv × (1−dcWiring%) × …
 *   7. Energy      : E = p_ac / 1000  [kW → kWh per 1 h step]
 */

import { IProductionPoint } from '../models/project.model';
import { IPanel } from '../models/panel.model';
import { openMeteoService } from './openmeteo.service';

// Calculation defaults when the panel field is not populated (spec §1.3)
const PANEL_DEFAULTS = {
  gammaPmp: -0.40,
  noct: 45,
  bifacialityFactor: 0,
  degradationFirstYear: 2.0,
  degradationAnnual: 0.5,
};

// System-loss defaults (spec §2.1)
const LOSS_DEFAULTS = {
  inverterEfficiency: 0.96,
  dcWiring: 2,
  acWiring: 1,
  mismatch: 2,
  soiling: 3,
  shadingStatic: 0,
  degradationExtra: 0,
};

interface ResolvedPanelParams {
  wattPeak: number;
  gammaPmp: number;
  noct: number;
  degradationFirstYear: number;
  degradationAnnual: number;
}

interface ResolvedLossParams {
  inverterEfficiency: number;
  dcWiring: number;
  acWiring: number;
  mismatch: number;
  soiling: number;
  shadingStatic: number;
  degradationExtra: number;
}

export interface ProjectProductionParams {
  lat: number;
  lon: number;
  tilt: number;
  azimuth?: number;
  panelNumber: number;
  installDate: Date;
  systemLosses?: {
    inverterEfficiency?: number;
    dcWiring?: number;
    acWiring?: number;
    mismatch?: number;
    soiling?: number;
    shadingStatic?: number;
    degradationExtra?: number;
  };
}

export interface ProductionData {
  prodToday: IProductionPoint[];
  previousProd: IProductionPoint[];
  nextProd: IProductionPoint[];
}

class ProductionService {
  /**
   * Compute all three production windows for a project.
   * Returns empty arrays if panel is null (no panel associated).
   */
  async computeProductionData(
    project: ProjectProductionParams,
    panel: IPanel | null,
  ): Promise<ProductionData> {
    if (!panel) {
      return { prodToday: [], previousProd: [], nextProd: [] };
    }

    const historyDays = parseInt(process.env.PRODUCTION_HISTORY_DAYS ?? '7', 10);
    const forecastDays = parseInt(process.env.PRODUCTION_FORECAST_DAYS ?? '10', 10);

    const weatherPoints = await openMeteoService.fetchProductionWeather(
      project.lat,
      project.lon,
      project.tilt,
      project.azimuth,
      historyDays,
      forecastDays,
    );

    const panelParams = this.resolvePanelParams(panel);
    const lossParams = this.resolveLossParams(project.systemLosses);
    const year = this.yearOfOperation(project.installDate);

    // Build UTC midnight boundaries for today
    const now = new Date();
    const todayMidnightMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const tomorrowMidnightMs = todayMidnightMs + 86_400_000;
    const currentHourMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
    );

    const prodToday: IProductionPoint[] = [];
    const previousProd: IProductionPoint[] = [];
    const nextProd: IProductionPoint[] = [];

    for (const point of weatherPoints) {
      const t = point.dateTime.getTime();
      const pv = this.calculateHourlyOutputKwh(
        point.gti,
        point.temperature,
        panelParams,
        lossParams,
        project.panelNumber,
        year,
      );

      if (t >= todayMidnightMs && t <= currentHourMs) {
        prodToday.push({ dateTime: point.dateTime, pv });
      } else if (t < todayMidnightMs) {
        previousProd.push({ dateTime: point.dateTime, pv });
      } else if (t >= tomorrowMidnightMs) {
        nextProd.push({ dateTime: point.dateTime, pv });
      }
    }

    return { prodToday, previousProd, nextProd };
  }

  /**
   * §5.4 — Hourly AC energy output for the entire array (kWh).
   *
   * The formula is applied in sequence:
   *   1. Cell temperature from NOCT simplified model
   *   2. Temperature derating of DC power
   *   3. Degradation factor based on years of operation
   *   4. Scale by irradiance ratio vs STC (1000 W/m²)
   *   5. Multiply by panel count → array DC power
   *   6. Apply all system losses → AC power (W)
   *   7. Convert W → kWh (1 h time step)
   */
  calculateHourlyOutputKwh(
    gti: number,
    tAmb: number,
    panel: ResolvedPanelParams,
    losses: ResolvedLossParams,
    panelNumber: number,
    year: number,
  ): number {
    if (gti <= 0) return 0;

    // 1. Cell temperature (NOCT simplified model)
    const tCell = tAmb + (panel.noct - 20) * (gti / 800);

    // 2. Temperature-adjusted DC power per panel (W)
    const deltaT = tCell - 25;
    const pDcPerPanel = panel.wattPeak * (1 + (panel.gammaPmp / 100) * deltaT);

    // 3. Degradation factor (year 1 uses degradationFirstYear; subsequent years add annualRate)
    const degFactor =
      (1 - panel.degradationFirstYear / 100) *
      Math.pow(1 - panel.degradationAnnual / 100, year - 1);

    // 4. Irradiance factor relative to STC (1000 W/m²)
    const irrFactor = gti / 1000;

    // 5. Total DC array power (W)
    const pArrayDc = pDcPerPanel * degFactor * irrFactor * panelNumber;

    // 6. AC power after system losses (W)
    const pAc =
      pArrayDc *
      losses.inverterEfficiency *
      (1 - losses.dcWiring / 100) *
      (1 - losses.acWiring / 100) *
      (1 - losses.mismatch / 100) *
      (1 - losses.soiling / 100) *
      (1 - losses.shadingStatic / 100) *
      (1 - losses.degradationExtra / 100);

    // 7. Energy: W × 1 h = Wh → kWh
    return Math.max(0, pAc / 1000);
  }

  // Year of operation: 1 during the first 12 months, 2 during months 12-24, etc.
  private yearOfOperation(installDate: Date): number {
    const msPerYear = 365.25 * 24 * 3600 * 1000;
    const elapsed = (Date.now() - installDate.getTime()) / msPerYear;
    return Math.max(1, Math.floor(elapsed) + 1);
  }

  private resolvePanelParams(panel: IPanel): ResolvedPanelParams {
    return {
      wattPeak: panel.wattPeak,
      gammaPmp: panel.gammaPmp ?? PANEL_DEFAULTS.gammaPmp,
      noct: panel.noct ?? PANEL_DEFAULTS.noct,
      degradationFirstYear: panel.degradationFirstYear ?? PANEL_DEFAULTS.degradationFirstYear,
      degradationAnnual: panel.degradationAnnual ?? PANEL_DEFAULTS.degradationAnnual,
    };
  }

  private resolveLossParams(
    systemLosses?: ProjectProductionParams['systemLosses'],
  ): ResolvedLossParams {
    return {
      inverterEfficiency: systemLosses?.inverterEfficiency ?? LOSS_DEFAULTS.inverterEfficiency,
      dcWiring: systemLosses?.dcWiring ?? LOSS_DEFAULTS.dcWiring,
      acWiring: systemLosses?.acWiring ?? LOSS_DEFAULTS.acWiring,
      mismatch: systemLosses?.mismatch ?? LOSS_DEFAULTS.mismatch,
      soiling: systemLosses?.soiling ?? LOSS_DEFAULTS.soiling,
      shadingStatic: systemLosses?.shadingStatic ?? LOSS_DEFAULTS.shadingStatic,
      degradationExtra: systemLosses?.degradationExtra ?? LOSS_DEFAULTS.degradationExtra,
    };
  }
}

export const productionService = new ProductionService();
