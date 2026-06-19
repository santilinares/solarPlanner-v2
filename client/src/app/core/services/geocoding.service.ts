import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

export interface GeocodingResult {
  lat: number;
  lng: number;
  country: string;
  countryCode: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  address?: { country?: string; country_code?: string };
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);

  private readonly COUNTRY_CURRENCY: Record<string, string> = {
    us: 'USD', gb: 'GBP', jp: 'JPY', cn: 'CNY', in: 'INR',
    au: 'AUD', ca: 'CAD', ch: 'CHF', ar: 'ARS', br: 'BRL',
    cl: 'CLP', mx: 'MXN', co: 'COP', nz: 'AUD',
    // Eurozone
    de: 'EUR', fr: 'EUR', es: 'EUR', it: 'EUR', pt: 'EUR',
    nl: 'EUR', be: 'EUR', at: 'EUR', ie: 'EUR', fi: 'EUR',
    gr: 'EUR', ee: 'EUR', lt: 'EUR', lv: 'EUR', sk: 'EUR',
    si: 'EUR', cy: 'EUR', mt: 'EUR', lu: 'EUR', hr: 'EUR',
  };

  private readonly COUNTRY_TIMEZONE: Record<string, string> = {
    us: 'America/New_York', gb: 'Europe/London', jp: 'Asia/Tokyo',
    cn: 'Asia/Singapore', in: 'Asia/Kolkata', au: 'Australia/Sydney',
    ca: 'America/New_York', ch: 'Europe/Berlin', nz: 'Pacific/Auckland',
    ar: 'America/Argentina/Buenos_Aires', br: 'America/Argentina/Buenos_Aires',
    cl: 'America/Halifax', mx: 'America/Chicago', co: 'America/New_York',
    ru: 'Europe/Moscow', ae: 'Asia/Dubai', pk: 'Asia/Karachi',
    bd: 'Asia/Dhaka', th: 'Asia/Bangkok', sg: 'Asia/Singapore',
    // Europe
    de: 'Europe/Berlin', fr: 'Europe/Berlin', es: 'Europe/Berlin',
    it: 'Europe/Berlin', pt: 'Europe/London', nl: 'Europe/Berlin',
    be: 'Europe/Berlin', at: 'Europe/Berlin', ie: 'Europe/London',
    fi: 'Europe/Athens', gr: 'Europe/Athens', ee: 'Europe/Athens',
    lt: 'Europe/Athens', lv: 'Europe/Athens', sk: 'Europe/Berlin',
    si: 'Europe/Berlin', cy: 'Europe/Athens', mt: 'Europe/Berlin',
    lu: 'Europe/Berlin', hr: 'Europe/Berlin',
  };

  search(query: string): Observable<GeocodingResult> {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&accept-language=en`;
    return this.http.get<NominatimResult[]>(url).pipe(
      map((results) => {
        if (results.length === 0) {
          throw new Error('Location not found.');
        }
        const r = results[0];
        return {
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          country: r.address?.country ?? '',
          countryCode: r.address?.country_code ?? '',
        };
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  getCurrencyForCountry(countryCode: string): string {
    return this.COUNTRY_CURRENCY[countryCode.toLowerCase()] ?? 'EUR';
  }

  getTimezoneForCountry(countryCode: string): string {
    return this.COUNTRY_TIMEZONE[countryCode.toLowerCase()] ?? '';
  }
}
