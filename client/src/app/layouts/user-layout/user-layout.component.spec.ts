import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { UserLayoutComponent } from './user-layout.component';
import { AuthService } from '@core/services';
import { User, UserRole } from '@core/models';

@Component({ selector: 'app-dummy', template: '' })
class DummyComponent {}

const USER_STUB: User = {
  id: '1',
  email: 'user@test.com',
  fullName: 'Regular User',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date(),
};

const ADMIN_STUB: User = { ...USER_STUB, role: UserRole.ADMIN };

describe('UserLayoutComponent', () => {
  let component: UserLayoutComponent;
  let router: Router;
  let mockAuthService: {
    currentUser: ReturnType<typeof signal<User | null>>;
    isAdmin: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthService = {
      currentUser: signal<User | null>(USER_STUB),
      isAdmin: jest.fn().mockReturnValue(false),
      logout: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UserLayoutComponent],
      providers: [
        provideRouter([{ path: '**', component: DummyComponent }]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(UserLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('isAdmin computed signal', () => {
    it('returns false for a regular user', () => {
      expect(component.isAdmin()).toBe(false);
    });

    it('returns true when currentUser has the ADMIN role', () => {
      mockAuthService.currentUser.set(ADMIN_STUB);
      expect(component.isAdmin()).toBe(true);
    });

    it('returns true when authService.isAdmin() returns true (no role on currentUser)', () => {
      mockAuthService.isAdmin.mockReturnValue(true);
      // Changing the signal forces the computed to re-read authService.isAdmin()
      mockAuthService.currentUser.set(null);
      expect(component.isAdmin()).toBe(true);
    });
  });

  describe('visiblePrimaryNavItems computed signal', () => {
    it('does not include admin nav items for a regular user', () => {
      const paths = component.visiblePrimaryNavItems().map((i) => i.path);
      expect(paths).not.toContain('/projects/management');
    });

    it('includes admin nav items when the user is an admin', () => {
      mockAuthService.currentUser.set(ADMIN_STUB);
      const paths = component.visiblePrimaryNavItems().map((i) => i.path);
      expect(paths).toContain('/projects/management');
    });
  });

  describe('isRouteActive()', () => {
    it('returns true for an exact-match item when the URL matches exactly', fakeAsync(() => {
      router.navigateByUrl('/projects');
      tick();
      expect(component.isRouteActive({ label: 'Dashboard', icon: '', path: '/projects', exact: true })).toBe(true);
    }));

    it('returns false for an exact-match item when the URL is a child route', fakeAsync(() => {
      router.navigateByUrl('/projects/add');
      tick();
      expect(component.isRouteActive({ label: 'Dashboard', icon: '', path: '/projects', exact: true })).toBe(false);
    }));

    it('returns true for a prefix-match item when the URL starts with that prefix', fakeAsync(() => {
      router.navigateByUrl('/projects/all');
      tick();
      expect(
        component.isRouteActive({ label: 'List', icon: '', path: '/projects/all', matchPrefixes: ['/projects/all'] }),
      ).toBe(true);
    }));
  });

  describe('logout()', () => {
    it('calls authService.logout and navigates to /login', () => {
      component.logout();
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
