import { afterEach, describe, expect, it, vi } from 'vitest';
import { openMeteoService } from '../../services/openmeteo.service';

describe('openMeteoService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchDailySunlight', () => {
    it('requests daily sunlight data and converts durations from seconds to hours', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          timezone: 'Europe/Madrid',
          daily: {
            time: ['2026-06-14'],
            sunrise: ['2026-06-14T06:43'],
            sunset: ['2026-06-14T21:47'],
            daylight_duration: [54360],
            sunshine_duration: [45000],
          },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await openMeteoService.fetchDailySunlight(40.4168, -3.7038, 'Europe/Madrid');
      const url = new URL(fetchMock.mock.calls[0][0] as string);

      expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
      expect(url.searchParams.get('daily')).toBe('sunrise,sunset,daylight_duration,sunshine_duration');
      expect(url.searchParams.get('timezone')).toBe('Europe/Madrid');
      expect(url.searchParams.get('forecast_days')).toBe('1');
      expect(result).toEqual({
        date: '2026-06-14',
        timezone: 'Europe/Madrid',
        sunrise: '2026-06-14T06:43',
        sunset: '2026-06-14T21:47',
        daylightHours: 15.1,
        sunshineHours: 12.5,
      });
    });
  });
});
