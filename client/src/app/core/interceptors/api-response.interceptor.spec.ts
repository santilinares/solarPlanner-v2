import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { apiResponseInterceptor } from './api-response.interceptor';

describe('apiResponseInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  it('unwraps the { success, data } envelope and returns only data', () => {
    let result: unknown;
    httpClient.get('/api/test').subscribe((r) => (result = r));

    httpMock
      .expectOne('/api/test')
      .flush({ success: true, data: { id: '1', name: 'Solar' }, message: 'ok' });

    expect(result).toEqual({ id: '1', name: 'Solar' });
  });

  it('passes through a response body that does not match the envelope shape', () => {
    let result: unknown;
    httpClient.get('/api/test').subscribe((r) => (result = r));

    httpMock.expectOne('/api/test').flush([1, 2, 3]);

    expect(result).toEqual([1, 2, 3]);
  });

  it('passes through a null response body unchanged', () => {
    let result: unknown = 'initial';
    httpClient.get('/api/test').subscribe((r) => (result = r));

    httpMock.expectOne('/api/test').flush(null);

    expect(result).toBeNull();
  });
});
