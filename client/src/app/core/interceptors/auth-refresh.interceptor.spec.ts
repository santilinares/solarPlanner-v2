import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { authRefreshInterceptor } from './auth-refresh.interceptor';
import { AuthService } from '../services/auth.service';
import { AuthResponse, UserRole } from '../models';

const STUB_RESPONSE: AuthResponse = {
  token: 'new-access-token',
  refreshToken: 'new-refresh-token',
  user: {
    id: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
  },
};

describe('authRefreshInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let mockAuthService: {
    refreshToken: jest.Mock;
    logout: jest.Mock;
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<null>>;
  };

  beforeEach(() => {
    mockAuthService = {
      refreshToken: jest.fn().mockReturnValue(of(STUB_RESPONSE)),
      logout: jest.fn(),
      isAuthenticated: signal(false),
      currentUser: signal(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authRefreshInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  it('passes non-401 errors through without attempting a token refresh', () => {
    let error: unknown;
    httpClient.get('/api/data').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne('/api/data')
      .flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

    expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    expect(error).toBeTruthy();
  });

  it('does not retry when a 401 occurs on the login endpoint', () => {
    let error: unknown;
    httpClient.post('/api/auth/login', {}).subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    expect(error).toBeTruthy();
  });

  it('calls refreshToken and retries the request with the new token on 401', () => {
    let result: unknown;
    httpClient.get('/api/protected').subscribe((r) => (result = r));

    httpMock
      .expectOne('/api/protected')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const retryReq = httpMock.expectOne('/api/protected');
    expect(retryReq.request.headers.get('Authorization')).toBe(`Bearer ${STUB_RESPONSE.token}`);
    retryReq.flush({ success: true });

    expect(mockAuthService.refreshToken).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('calls authService.logout when the token refresh fails', () => {
    mockAuthService.refreshToken.mockReturnValue(throwError(() => new Error('Refresh failed')));

    let errorCaught = false;
    httpClient.get('/api/protected').subscribe({ error: () => (errorCaught = true) });

    httpMock
      .expectOne('/api/protected')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(errorCaught).toBe(true);
  });
});
