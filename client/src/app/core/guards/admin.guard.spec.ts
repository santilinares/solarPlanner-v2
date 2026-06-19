jest.mock('@environments/environment', () => ({
  environment: {
    production: false,
    devBypassAuth: false,
    apiUrl: 'http://127.0.0.1:1235/api',
    googleClientId: 'test-client-id',
    markerIcon: '',
  },
}));

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

const dummyRoute = {} as ActivatedRouteSnapshot;
const dummyState = {} as RouterStateSnapshot;

describe('adminGuard', () => {
  let router: Router;
  let mockAuthService: { isAuthenticated: jest.Mock; isAdmin: jest.Mock };

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('returns false and navigates to /login when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('returns true when authenticated and isAdmin', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.isAdmin.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
    expect(result).toBe(true);
  });

  it('returns false and navigates to /projects when authenticated but not admin', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.isAdmin.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/projects']);
  });
});
