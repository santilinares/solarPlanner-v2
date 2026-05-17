import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PanelService } from './panel.service';
import { environment } from '@environments/environment';

const BASE = `${environment.apiUrl}/panels`;

describe('PanelService', () => {
  let service: PanelService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PanelService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PanelService);
  });

  afterEach(() => httpMock.verify());

  describe('getAllPanels()', () => {
    it('sends page and limit as query params', () => {
      service.getAllPanels(2, 15).subscribe();
      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('15');
      req.flush({ panels: [], total: 0 });
    });
  });

  describe('getPanels()', () => {
    it('returns the panels array extracted from the response', () => {
      const stub = [{ id: '1', brand: 'SunPower' }];
      let result: unknown;
      service.getPanels().subscribe((r) => (result = r));
      httpMock.expectOne((r) => r.url === BASE).flush({ panels: stub });
      expect(result).toEqual(stub);
    });
  });

  describe('createPanel()', () => {
    it('POSTs panel data to /panels', () => {
      const payload = { brand: 'SunPower', model: 'X22', wattPeak: 400 } as Parameters<typeof service.createPanel>[0];
      service.createPanel(payload).subscribe();
      const req = httpMock.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({});
    });
  });

  describe('deletePanel()', () => {
    it('sends DELETE to /panels/:id', () => {
      service.deletePanel('p-1').subscribe();
      const req = httpMock.expectOne(`${BASE}/p-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('searchPanels()', () => {
    it('omits query params when no filters are passed', () => {
      service.searchPanels().subscribe();
      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.has('search')).toBe(false);
      expect(req.request.params.has('technology')).toBe(false);
      req.flush({ panels: [], total: 0 });
    });

    it('includes search and technology params when provided', () => {
      service.searchPanels({ search: 'mono', technology: 'Monocrystalline' }).subscribe();
      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('search')).toBe('mono');
      expect(req.request.params.get('technology')).toBe('Monocrystalline');
      req.flush({ panels: [], total: 0 });
    });
  });
});
