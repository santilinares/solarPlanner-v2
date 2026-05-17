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
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

const dummyRoute = {} as ActivatedRouteSnapshot;
const makeState = (url: string) => ({ url } as RouterStateSnapshot);

describe('authGuard', () => {
  let router: Router;
  let mockAuthService: { isAuthenticated: jest.Mock };

  beforeEach(() => {
    mockAuthService = { isAuthenticated: jest.fn().mockReturnValue(false) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('returns true when the user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, makeState('/dashboard')));
    expect(result).toBe(true);
  });

  it('returns false and navigates to /login with returnUrl when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, makeState('/dashboard')));
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });
});
