/**
 * Open-Meteo API client
 * Fetches hourly GTI (Global Tilted Irradiance) and ambient temperature
 * for production calculations. No API key required.
 *
 * Docs: https://open-meteo.com/en/docs
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export interface OpenMeteoPoint {
  dateTime: Date;
  gti: number;       // W/m² — Global Tilted Irradiance on the panel plane
  temperature: number; // °C  — Ambient temperature at 2 m
  windSpeed: number;   // m/s — Wind speed at 10 m (for Fuentes thermal model)
}

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    global_tilted_irradiance: (number | null)[];
    temperature_2m: (number | null)[];
    wind_speed_10m: (number | null)[];
  };
}

// Open-Meteo azimuth convention: 0 = South, 90 = West, -90 = East
// Project azimuth convention:    0 = North, 90 = East, 180 = South, 270 = West
function toOpenMeteoAzimuth(compassAzimuth?: number): number {
  return (compassAzimuth ?? 180) - 180;
}

class OpenMeteoService {
  /**
   * Fetch hourly weather data for production calculation.
   *
   * Returns a flat time-ordered array covering:
   *   [now - historyDays]  →  [now + forecastDays]
   *
   * Past hours use ERA5 reanalysis; future hours use the NWP forecast.
   * The `global_tilted_irradiance` variable already accounts for panel
   * tilt and azimuth, so no further transposition is needed.
   */
  async fetchProductionWeather(
    lat: number,
    lon: number,
    tilt: number,
    azimuth: number | undefined,
    historyDays: number,
    forecastDays: number,
  ): Promise<OpenMeteoPoint[]> {
    const omAzimuth = toOpenMeteoAzimuth(azimuth);

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'global_tilted_irradiance,temperature_2m,wind_speed_10m',
      tilt: tilt.toString(),
      azimuth: omAzimuth.toString(),
      past_days: historyDays.toString(),
      forecast_days: forecastDays.toString(),
      timezone: 'UTC',
    });

    const url = `${FORECAST_URL}?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Open-Meteo API returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    return this.parseHourlyResponse(data);
  }

  private parseHourlyResponse(data: OpenMeteoResponse): OpenMeteoPoint[] {
    const { time, global_tilted_irradiance, temperature_2m, wind_speed_10m } = data.hourly;

    return time.map((t, i) => ({
      // Open-Meteo times: "YYYY-MM-DDTHH:MM" in UTC (timezone=UTC requested)
      dateTime: new Date(t + ':00Z'),
      gti: Math.max(0, global_tilted_irradiance[i] ?? 0),
      temperature: temperature_2m[i] ?? 20,
      // NOCT standard condition assumes 1 m/s; use that as fallback
      windSpeed: Math.max(0, wind_speed_10m[i] ?? 1),
    }));
  }
}

export const openMeteoService = new OpenMeteoService();
