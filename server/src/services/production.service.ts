/**
 * Production Service
 * Implements the hourly PV output model and orchestrates the three production
 * time windows: prodToday, previousProd, nextProd.
 *
 * Units: all IProductionPoint.pv values are in kWh.
 *
 * Thermal model — Fuentes (PVWatts V5, Sandia SAND85-0330):
 *   U₀ and U₁ are derived from the panel's NOCT at standard conditions
 *   (G=800 W/m², W=1 m/s, T_a=20 °C) preserving the PVWatts V5 U₁/U₀ ratio.
 *   T_cell = T_a + GTI / (U₀ + U₁ × windSpeed)
 *
 * DC model — PVWatts V5 (Dobos 2014, NREL/TP-6A20-62641):
 *   P_dc = (GTI/1000) × wattPeak × (1 + γ/100 × ΔT) × degradation
 *
 * Loss model — multiplicative (PVWatts V5 §2.2):
 *   DC losses applied before inverter; AC wiring after; clipping at inverter nameplate.
 *   P_ac_nameplate = panelNumber × wattPeak / dcAcRatio
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
  // DC:AC ratio for inverter clipping (PVWatts V5 default: 1.1)
  dcAcRatio?: number;
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

export interface TodayAndForecastData {
  prodToday: IProductionPoint[];
  nextProd: IProductionPoint[];
}

class ProductionService {
  /**
   * Compute all three production windows for a project.
   * Used for initial project creation and forced full recalculation.
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
    const dcAcRatio = project.dcAcRatio ?? 1.1;

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
        point.windSpeed,
        panelParams,
        lossParams,
        project.panelNumber,
        year,
        dcAcRatio,
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
   * Compute only prodToday and nextProd (§5.3 — on-demand refresh).
   * Fetches from today midnight → +forecastDays. Does NOT fetch history.
   * previousProd is never modified by this method.
   */
  async computeTodayAndForecast(
    project: ProjectProductionParams,
    panel: IPanel | null,
  ): Promise<TodayAndForecastData> {
    if (!panel) return { prodToday: [], nextProd: [] };

    const forecastDays = parseInt(process.env.PRODUCTION_FORECAST_DAYS ?? '10', 10);

    const weatherPoints = await openMeteoService.fetchProductionWeather(
      project.lat,
      project.lon,
      project.tilt,
      project.azimuth,
      0, // no past days — only today + forecast
      forecastDays,
    );

    const panelParams = this.resolvePanelParams(panel);
    const lossParams = this.resolveLossParams(project.systemLosses);
    const year = this.yearOfOperation(project.installDate);
    const dcAcRatio = project.dcAcRatio ?? 1.1;

    const now = new Date();
    const todayMidnightMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const tomorrowMidnightMs = todayMidnightMs + 86_400_000;
    const currentHourMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
    );

    const prodToday: IProductionPoint[] = [];
    const nextProd: IProductionPoint[] = [];

    for (const point of weatherPoints) {
      const t = point.dateTime.getTime();
      const pv = this.calculateHourlyOutputKwh(
        point.gti,
        point.temperature,
        point.windSpeed,
        panelParams,
        lossParams,
        project.panelNumber,
        year,
        dcAcRatio,
      );

      if (t >= todayMidnightMs && t <= currentHourMs) {
        prodToday.push({ dateTime: point.dateTime, pv });
      } else if (t >= tomorrowMidnightMs) {
        nextProd.push({ dateTime: point.dateTime, pv });
      }
    }

    return { prodToday, nextProd };
  }

  /**
   * Hourly AC energy output for the entire array (kWh).
   *
   * 1. Cell temp  — Fuentes model (Sandia SAND85-0330, via PVWatts V5):
   *      U₀, U₁ derived from NOCT using the PVWatts V5 wind ratio (U₁/U₀ = 0.274)
   *      T_cell = T_a + GTI / (U₀ + U₁ × windSpeed)
   * 2. DC power   — PVWatts V5: P_dc = (GTI/1000) × wattPeak × (1 + γ/100 × ΔT)
   * 3. Degradation factor applied to P_dc
   * 4. Array DC   — multiply by panelNumber
   * 5. DC losses  — dcWiring, mismatch, soiling, shadingStatic, degradationExtra
   * 6. Inverter   — η_inv × P_dc_loss, clipped to P_ac_nameplate = ratedDc / dcAcRatio
   * 7. AC wiring  — applied after inverter
   * 8. Energy     — W × 1 h = Wh → kWh
   */
  calculateHourlyOutputKwh(
    gti: number,
    tAmb: number,
    windSpeed: number,
    panel: ResolvedPanelParams,
    losses: ResolvedLossParams,
    panelNumber: number,
    year: number,
    dcAcRatio: number,
  ): number {
    if (gti <= 0) return 0;

    // 1. Cell temperature — Fuentes model with wind speed (PVWatts V5)
    // U₀ + U₁ at NOCT conditions (G=800, W=1): uSum = 800 / (NOCT - 20)
    // U₁/U₀ ratio from PVWatts V5: 6.84/25 = 0.274
    const uSum = 800 / Math.max(panel.noct - 20, 1); // guard against NOCT ≤ 20
    const u0 = uSum / 1.274;
    const u1 = u0 * 0.274;
    const tCell = tAmb + gti / (u0 + u1 * windSpeed);

    // 2. Temperature-adjusted DC power per panel (W) — PVWatts V5 Eq. 2
    const deltaT = tCell - 25;
    const pDcPerPanel = panel.wattPeak * (1 + (panel.gammaPmp / 100) * deltaT);

    // 3. Degradation factor
    const degFactor =
      (1 - panel.degradationFirstYear / 100) *
      Math.pow(1 - panel.degradationAnnual / 100, year - 1);

    // 4. Array DC power scaled by irradiance ratio vs STC (1000 W/m²)
    const pArrayDc = pDcPerPanel * degFactor * (gti / 1000) * panelNumber;

    // 5. DC-side losses (before inverter)
    const pDcAfterLosses =
      pArrayDc *
      (1 - losses.dcWiring / 100) *
      (1 - losses.mismatch / 100) *
      (1 - losses.soiling / 100) *
      (1 - losses.shadingStatic / 100) *
      (1 - losses.degradationExtra / 100);

    // 6. Inverter with clipping — PVWatts V5 §3.1
    // P_ac_nameplate = rated DC capacity / DC:AC ratio
    const pAcNameplate = (panelNumber * panel.wattPeak) / dcAcRatio;
    const pInverterOut = Math.min(pDcAfterLosses * losses.inverterEfficiency, pAcNameplate);

    // 7. AC wiring loss
    const pAc = pInverterOut * (1 - losses.acWiring / 100);

    // 8. Energy: W × 1 h = Wh → kWh
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

/**
 * Compute the total effective system loss percentage to pass to PVGIS PVcalc.
 * PVGIS `loss` = all losses combined (inverter + wiring + mismatch + soiling + …).
 */
export function computeTotalSystemLossPct(
  systemLosses?: ProjectProductionParams['systemLosses'],
): number {
  const l = {
    inverterEfficiency: systemLosses?.inverterEfficiency ?? LOSS_DEFAULTS.inverterEfficiency,
    dcWiring:           systemLosses?.dcWiring           ?? LOSS_DEFAULTS.dcWiring,
    acWiring:           systemLosses?.acWiring           ?? LOSS_DEFAULTS.acWiring,
    mismatch:           systemLosses?.mismatch           ?? LOSS_DEFAULTS.mismatch,
    soiling:            systemLosses?.soiling            ?? LOSS_DEFAULTS.soiling,
    shadingStatic:      systemLosses?.shadingStatic      ?? LOSS_DEFAULTS.shadingStatic,
    degradationExtra:   systemLosses?.degradationExtra   ?? LOSS_DEFAULTS.degradationExtra,
  };
  const efficiency =
    l.inverterEfficiency *
    (1 - l.dcWiring        / 100) *
    (1 - l.acWiring        / 100) *
    (1 - l.mismatch        / 100) *
    (1 - l.soiling         / 100) *
    (1 - l.shadingStatic   / 100) *
    (1 - l.degradationExtra/ 100);
  // Round to one decimal place (PVGIS accepts integer or one-decimal values)
  return Math.round((1 - efficiency) * 1000) / 10;
}
