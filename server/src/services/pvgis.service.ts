/**
 * PVGIS (Photovoltaic Geographical Information System) API client
 * EU Joint Research Centre tool for long-term PV production estimates.
 * No API key required. Respect rate limits: call once per project creation
 * or at most monthly — not on every request.
 *
 * Docs: https://re.jrc.ec.europa.eu/api/v5_2/
 */

const PVGIS_BASE = 'https://re.jrc.ec.europa.eu/api/v5_2';

export interface PvgisAnnualResult {
  yearlyKwh: number;              // kWh/year for the given peak power
  yearlyKwhPerKwp: number;        // kWh/kWp·year — location quality index
  monthlyKwh: number[];           // 12 monthly values (kWh/month)
  systemLossPercent: number;      // Total system loss used by PVGIS (%)
  yearlyPOAIrradiation: number;   // Global irradiation on tilted plane (kWh/m²/year) — H(i)_y
}

interface PvgisApiResponse {
  outputs: {
    totals: {
      fixed: {
        E_y: number;       // Yearly energy output (kWh)
        'H(i)_y': number;  // Yearly POA irradiation (kWh/m²/year)
        l_total: number;   // Total loss (%)
      };
    };
    monthly: {
      fixed: Array<{
        month: number;
        E_m: number; // Monthly energy (kWh)
      }>;
    };
  };
}

// Open-Meteo / PVGIS share the same azimuth convention:
// 0 = South, 90 = West, -90 = East
// Project compass: 0 = North, 90 = East, 180 = South, 270 = West
function toPvgisAspect(compassAzimuth?: number): number {
  return (compassAzimuth ?? 180) - 180;
}

class PvgisService {
  /**
   * Fetch annual PV production estimate from PVGIS PVcalc endpoint.
   *
   * @param peakpowerKw  Installed peak power in kW (panels × wattPeak / 1000)
   * @param systemLossPct  Total system loss percentage (e.g., 14 for 14%)
   * @returns Annual production data or null if the request fails
   */
  async fetchAnnualProduction(
    lat: number,
    lon: number,
    peakpowerKw: number,
    systemLossPct: number,
    tilt: number,
    azimuth?: number,
  ): Promise<PvgisAnnualResult> {
    const aspect = toPvgisAspect(azimuth);

    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      peakpower: peakpowerKw.toString(),
      loss: systemLossPct.toString(),
      angle: tilt.toString(),
      aspect: aspect.toString(),
      outputformat: 'json',
      pvtechchoice: 'crystSi',
    });

    const url = `${PVGIS_BASE}/PVcalc?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`PVGIS API returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as PvgisApiResponse;

    const fixed = data.outputs.totals.fixed;
    const monthly = data.outputs.monthly.fixed;

    return {
      yearlyKwh: fixed.E_y,
      yearlyKwhPerKwp: peakpowerKw > 0 ? fixed.E_y / peakpowerKw : 0,
      monthlyKwh: monthly.map((m) => m.E_m),
      systemLossPercent: fixed.l_total,
      yearlyPOAIrradiation: fixed['H(i)_y'],
    };
  }
}

export const pvgisService = new PvgisService();
