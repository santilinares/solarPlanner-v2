import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '@core/services';

function makeRoute(queryToken: string | null, paramToken: string | null) {
  return {
    snapshot: {
      queryParamMap: { get: (k: string) => (k === 'token' ? queryToken : null) },
      paramMap: { get: (k: string) => (k === 'token' ? paramToken : null) },
    },
  };
}

const VALID_FORM = { password: 'Password123*', confirmPassword: 'Password123*' };

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let router: Router;
  let mockAuthService: { resetPassword: jest.Mock; isAuthenticated: ReturnType<typeof signal<boolean>>; currentUser: ReturnType<typeof signal<null>> };

  async function setup(queryToken: string | null, paramToken: string | null) {
    mockAuthService = {
      resetPassword: jest.fn().mockReturnValue(of({})),
      isAuthenticated: signal(false),
      currentUser: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: makeRoute(queryToken, paramToken) },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('token extraction', () => {
    it('reads the token from the query parameter', async () => {
      await setup('query-token', null);
      expect(component.token).toBe('query-token');
    });

    it('falls back to the route parameter when query param is absent', async () => {
      await setup(null, 'route-token');
      expect(component.token).toBe('route-token');
    });

    it('sets token to empty string when neither param is present', async () => {
      await setup(null, null);
      expect(component.token).toBe('');
    });
  });

  describe('form validation', () => {
    beforeEach(async () => setup('test-token', null));

    it('is invalid when passwords do not match', () => {
      component.resetPasswordForm.setValue({ password: 'Password1', confirmPassword: 'Different1' });
      expect(component.resetPasswordForm.hasError('passwordMismatch')).toBe(true);
    });

    it('is valid when passwords match and meet length requirement', () => {
      component.resetPasswordForm.setValue(VALID_FORM);
      expect(component.resetPasswordForm.valid).toBe(true);
    });
  });

  describe('onSubmit()', () => {
    beforeEach(async () => setup('test-token', null));

    it('calls authService.resetPassword with the token and new password', () => {
      component.resetPasswordForm.setValue(VALID_FORM);
      component.onSubmit();
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test-token', {
        password: VALID_FORM.password,
      });
    });

    it('sets successMessage and navigates to /login after 2000ms', fakeAsync(() => {
      component.resetPasswordForm.setValue(VALID_FORM);
      component.onSubmit();

      expect(component.successMessage()).toBeTruthy();
      tick(2000);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('sets errorMessage and clears loading on API error', fakeAsync(() => {
      mockAuthService.resetPassword.mockReturnValue(
        throwError(() => ({ error: { message: 'Link expired' } })),
      );
      component.resetPasswordForm.setValue(VALID_FORM);
      component.onSubmit();
      tick();

      expect(component.errorMessage()).toBe('Link expired');
      expect(component.loading()).toBe(false);
    }));

    it('ngOnDestroy cancels the redirect timeout', fakeAsync(() => {
      component.resetPasswordForm.setValue(VALID_FORM);
      component.onSubmit();
      component.ngOnDestroy();
      tick(2000);

      expect(router.navigate).not.toHaveBeenCalled();
    }));
  });
});
