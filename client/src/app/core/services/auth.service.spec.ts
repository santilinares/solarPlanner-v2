import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse, UserRole } from '../models';
import { environment } from '@environments/environment';

const STUB_RESPONSE: AuthResponse = {
  token: 'access-token',
  user: {
    id: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
  },
};

function makeJwt(payload: object): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.sig`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('login()', () => {
    it('POSTs credentials to /auth/login', () => {
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'a@b.com', password: 'pass' });
      req.flush(STUB_RESPONSE);
    });

    it('stores access token in localStorage on success', () => {
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(STUB_RESPONSE);

      expect(localStorage.getItem('token')).toBe('access-token');
    });

    it('sets isAuthenticated and currentUser signals on success', () => {
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(STUB_RESPONSE);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.email).toBe('test@example.com');
    });
  });

  describe('register()', () => {
    it('POSTs fullName (firstName + lastName) to /auth/register', () => {
      service
        .register({ firstName: 'John', lastName: 'Doe', email: 'j@d.com', password: 'pass' })
        .subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.fullName).toBe('John Doe');
      expect(req.request.body.email).toBe('j@d.com');
      req.flush(STUB_RESPONSE);
    });
  });

  describe('logout()', () => {
    it('POSTs to /auth/logout, clears localStorage, resets signals, and navigates to /login', () => {
      const router = TestBed.inject(Router);
      jest.spyOn(router, 'navigate').mockResolvedValue(true);

      localStorage.setItem('token', 'tok');
      service.currentUser.set(STUB_RESPONSE.user);
      service.isAuthenticated.set(true);

      service.logout();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush({});

      expect(localStorage.getItem('token')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('getDecodedToken()', () => {
    it('returns null when no token is stored', () => {
      expect(service.getDecodedToken()).toBeNull();
    });

    it('decodes a valid JWT payload', () => {
      const payload = { _id: '42', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 };
      localStorage.setItem('token', makeJwt(payload));

      const decoded = service.getDecodedToken();
      expect(decoded?._id).toBe('42');
      expect(decoded?.role).toBe('user');
    });
  });

  describe('isAdmin()', () => {
    it('returns false when no token is stored', () => {
      expect(service.isAdmin()).toBe(false);
    });

    it('returns false when token role is "user"', () => {
      localStorage.setItem(
        'token',
        makeJwt({ _id: '1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }),
      );
      expect(service.isAdmin()).toBe(false);
    });

    it('returns true when token role is "admin"', () => {
      localStorage.setItem(
        'token',
        makeJwt({ _id: '1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }),
      );
      expect(service.isAdmin()).toBe(true);
    });
  });

  describe('refreshToken()', () => {
    it('POSTs to /auth/refresh with credentials (cookie sent automatically)', () => {
      service.refreshToken().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(STUB_RESPONSE);
    });
  });
});
