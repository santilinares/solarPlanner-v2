import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '@core/services';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let mockAuthService: { forgotPassword: jest.Mock; isAuthenticated: ReturnType<typeof signal<boolean>>; currentUser: ReturnType<typeof signal<null>> };

  beforeEach(async () => {
    mockAuthService = {
      forgotPassword: jest.fn().mockReturnValue(of({ message: 'Check your inbox!' })),
      isAuthenticated: signal(false),
      currentUser: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('form validation', () => {
    it('is invalid with an empty email field', () => {
      expect(component.forgotPasswordForm.valid).toBe(false);
    });

    it('is invalid with a malformed email', () => {
      component.forgotPasswordForm.setValue({ email: 'not-an-email' });
      expect(component.forgotPasswordForm.valid).toBe(false);
    });

    it('is valid with a correct email', () => {
      component.forgotPasswordForm.setValue({ email: 'user@example.com' });
      expect(component.forgotPasswordForm.valid).toBe(true);
    });
  });

  describe('onSubmit()', () => {
    it('does nothing when form is invalid', () => {
      component.onSubmit();
      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
    });

    it('calls authService.forgotPassword with the email', () => {
      component.forgotPasswordForm.setValue({ email: 'user@example.com' });
      component.onSubmit();
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
    });

    it('sets successMessage from the server response and resets the form', fakeAsync(() => {
      component.forgotPasswordForm.setValue({ email: 'user@example.com' });
      component.onSubmit();
      tick();

      expect(component.successMessage()).toBe('Check your inbox!');
      expect(component.forgotPasswordForm.get('email')?.value).toBeFalsy();
    }));

    it('uses the default success message when server returns no message', fakeAsync(() => {
      mockAuthService.forgotPassword.mockReturnValue(of({}));
      component.forgotPasswordForm.setValue({ email: 'user@example.com' });
      component.onSubmit();
      tick();

      expect(component.successMessage()).toBe('Password reset link sent to your email!');
    }));

    it('sets errorMessage and clears loading on error', fakeAsync(() => {
      mockAuthService.forgotPassword.mockReturnValue(
        throwError(() => ({ error: { message: 'Email not found' } })),
      );
      component.forgotPasswordForm.setValue({ email: 'unknown@example.com' });
      component.onSubmit();
      tick();

      expect(component.errorMessage()).toBe('Email not found');
      expect(component.loading()).toBe(false);
    }));
  });
});
