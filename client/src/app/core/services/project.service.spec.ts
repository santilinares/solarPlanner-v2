import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProjectService } from './project.service';
import { environment } from '@environments/environment';

const BASE = `${environment.apiUrl}/projects`;

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProjectService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ProjectService);
  });

  afterEach(() => httpMock.verify());

  describe('createProject()', () => {
    it('POSTs to /projects', () => {
      const payload = { name: 'My Farm' } as Parameters<typeof service.createProject>[0];
      service.createProject(payload).subscribe();
      const req = httpMock.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({});
    });
  });

  describe('getElectricityPriceSuggestion()', () => {
    it('calls the non-conflicting pricing endpoint', () => {
      service.getElectricityPriceSuggestion('ES').subscribe();

      const req = httpMock.expectOne((request) =>
        request.url.endsWith('/projects/pricing/electricity') &&
        request.params.get('countryCode') === 'ES'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ price: 0.18, currency: 'EUR', source: 'entsoe', countryCode: 'ES' });
    });

    it('returns unavailable suggestion when backend route is missing or rejects', () => {
      let result: unknown;
      service.getElectricityPriceSuggestion('ES').subscribe((value) => {
        result = value;
      });

      const req = httpMock.expectOne((request) => request.url.endsWith('/projects/pricing/electricity'));
      req.flush({ message: 'Invalid ID format' }, { status: 400, statusText: 'Bad Request' });

      expect(result).toEqual({
        price: null,
        currency: null,
        source: 'unavailable',
        countryCode: 'ES',
      });
    });
  });

  describe('getMyProjects()', () => {
    it('sends page and limit as query params', () => {
      service.getMyProjects(2, 5).subscribe();
      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('5');
      req.flush({ data: [], total: 0 });
    });

    it('includes optional filter params when provided', () => {
      service.getMyProjects(1, 10, { search: 'solar', country: 'ES', projectType: 'roof' }).subscribe();
      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('search')).toBe('solar');
      expect(req.request.params.get('country')).toBe('ES');
      expect(req.request.params.get('projectType')).toBe('roof');
      req.flush({ data: [], total: 0 });
    });

    it('omits optional filter params when not provided', () => {
      service.getMyProjects(1, 10, {}).subscribe();
      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.has('search')).toBe(false);
      expect(req.request.params.has('country')).toBe(false);
      req.flush({ data: [], total: 0 });
    });
  });

  describe('getAllProjects()', () => {
    it('includes owner filter when provided', () => {
      service.getAllProjects(1, 10, { owner: 'user-123' }).subscribe();
      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('owner')).toBe('user-123');
      req.flush({ data: [], total: 0 });
    });
  });

  describe('deleteProject()', () => {
    it('sends DELETE to /projects/:id', () => {
      service.deleteProject('abc').subscribe();
      const req = httpMock.expectOne(`${BASE}/abc`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getAnalytics()', () => {
    it('GETs /projects/:id/analytics', () => {
      service.getAnalytics('xyz').subscribe();
      const req = httpMock.expectOne(`${BASE}/xyz/analytics`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });
});
