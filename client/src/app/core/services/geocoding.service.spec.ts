import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GeocodingService } from './geocoding.service';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GeocodingService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(GeocodingService);
  });

  afterEach(() => httpMock.verify());

  // ─── search() ───

  describe('search()', () => {
    it('calls Nominatim with the encoded query and required params', () => {
      service.search('Madrid, Spain').subscribe();
      const req = httpMock.expectOne((r) => r.url === NOMINATIM_URL);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe('Madrid, Spain');
      expect(req.request.params.get('format')).toBe('json');
      expect(req.request.params.get('limit')).toBe('1');
      expect(req.request.params.get('addressdetails')).toBe('1');
      req.flush([]);
    });

    it('maps lat/lon strings and address to GeocodingResult', () => {
      let result: ReturnType<typeof service.search> extends import('rxjs').Observable<infer T> ? T : never;
      service.search('Berlin').subscribe((r) => (result = r));

      const req = httpMock.expectOne((r) => r.url === NOMINATIM_URL);
      req.flush([
        {
          lat: '52.5200',
          lon: '13.4050',
          address: { country: 'Germany', country_code: 'de' },
        },
      ]);

      expect(result!.lat).toBeCloseTo(52.52);
      expect(result!.lng).toBeCloseTo(13.405);
      expect(result!.country).toBe('Germany');
      expect(result!.countryCode).toBe('de');
    });

    it('throws when the results array is empty', (done) => {
      service.search('xxxxxxxxxnoplace').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Location not found.');
          done();
        },
      });
      httpMock.expectOne((r) => r.url === NOMINATIM_URL).flush([]);
    });

    it('propagates HTTP errors', (done) => {
      service.search('anywhere').subscribe({
        error: (err) => {
          expect(err).toBeTruthy();
          done();
        },
      });
      httpMock
        .expectOne((r) => r.url === NOMINATIM_URL)
        .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // ─── getCurrencyForCountry() ───

  describe('getCurrencyForCountry()', () => {
    it('returns EUR for a eurozone country code', () => {
      expect(service.getCurrencyForCountry('de')).toBe('EUR');
      expect(service.getCurrencyForCountry('ES')).toBe('EUR'); // case-insensitive
    });

    it('returns the correct non-euro currency', () => {
      expect(service.getCurrencyForCountry('us')).toBe('USD');
      expect(service.getCurrencyForCountry('gb')).toBe('GBP');
      expect(service.getCurrencyForCountry('jp')).toBe('JPY');
    });

    it('falls back to EUR for unknown country codes', () => {
      expect(service.getCurrencyForCountry('xx')).toBe('EUR');
    });
  });

  // ─── getTimezoneForCountry() ───

  describe('getTimezoneForCountry()', () => {
    it('returns the timezone for a known country', () => {
      expect(service.getTimezoneForCountry('de')).toBe('Europe/Berlin');
      expect(service.getTimezoneForCountry('gb')).toBe('Europe/London');
    });

    it('returns an empty string for unknown country codes', () => {
      expect(service.getTimezoneForCountry('xx')).toBe('');
    });

    it('is case-insensitive', () => {
      expect(service.getTimezoneForCountry('JP')).toBe('Asia/Tokyo');
    });
  });
});
