import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services';
import { getErrorMessage } from '@core/models';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="reset-password-page">
      <div class="reset-password-card">
        <h2>Set New Password</h2>
        
        <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="password">New Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              [class.error]="resetPasswordForm.get('password')?.invalid && resetPasswordForm.get('password')?.touched"
            />
            @if (resetPasswordForm.get('password')?.invalid && resetPasswordForm.get('password')?.touched) {
              <span class="error-message">Password must be at least 8 characters</span>
            }
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              formControlName="confirmPassword"
              placeholder="••••••••"
              [class.error]="resetPasswordForm.get('confirmPassword')?.invalid && resetPasswordForm.get('confirmPassword')?.touched"
            />
            @if (resetPasswordForm.hasError('passwordMismatch') && resetPasswordForm.get('confirmPassword')?.touched) {
              <span class="error-message">Passwords do not match</span>
            }
          </div>

          @if (errorMessage()) {
            <div class="alert alert-error">{{ errorMessage() }}</div>
          }

          @if (successMessage()) {
            <div class="alert alert-success">{{ successMessage() }}</div>
          }

          <button type="submit" [disabled]="loading() || resetPasswordForm.invalid" class="btn btn-primary">
            {{ loading() ? 'Resetting...' : 'Reset Password' }}
          </button>

          <div class="form-links">
            <a routerLink="/login">Back to sign in</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .reset-password-page {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;

      .reset-password-card {
        background: var(--p-surface-0);
        padding: 2rem;
        border-radius: 0.5rem;
        box-shadow: var(--p-shadow-md);
        width: 100%;
        max-width: 25rem;

        h2 {
          text-align: center;
          margin-bottom: 2rem;
          color: var(--p-text-color);
        }

        .form-group {
          margin-bottom: 1.5rem;

          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--p-text-color);
          }

          input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--p-content-border-color);
            border-radius: 0.25rem;
            font-size: 1rem;
            color: var(--p-text-color);
            background: var(--p-surface-0);

            &.error {
              border-color: var(--p-red-500);
            }

            &:focus {
              outline: none;
              border-color: var(--p-primary-500);
            }
          }

          .error-message {
            display: block;
            color: var(--p-red-500);
            font-size: 0.875rem;
            margin-top: 0.25rem;
          }
        }

        .alert {
          padding: 0.75rem;
          border-radius: 0.25rem;
          margin-bottom: 1rem;

          &.alert-error {
            background-color: color-mix(in srgb, var(--p-red-500) 12%, transparent);
            color: var(--p-red-700, var(--p-red-500));
          }

          &.alert-success {
            background-color: color-mix(in srgb, var(--p-green-500) 12%, transparent);
            color: var(--p-green-700, var(--p-green-500));
          }
        }

        .btn {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 0.25rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;

          &.btn-primary {
            background-color: var(--p-primary-500);
            color: var(--p-primary-contrast-color);

            &:hover:not(:disabled) {
              background-color: var(--p-primary-600);
            }

            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
          }
        }

        .form-links {
          text-align: center;
          margin-top: 1rem;

          a {
            color: var(--p-primary-500);
            text-decoration: none;
            font-size: 0.875rem;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
  `]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  private redirectTimeout?: ReturnType<typeof setTimeout>;

  token: string = '';

  resetPasswordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    // Support both new (?token=...) and old (/reset-password/:id/:token) formats
    this.token =
      this.route.snapshot.queryParamMap.get('token') ||
      this.route.snapshot.paramMap.get('token') ||
      '';
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const password = this.resetPasswordForm.get('password')?.value as string;

      this.authService.resetPassword(this.token, password).subscribe({
        next: () => {
          this.loading.set(false);
          this.successMessage.set('Password reset successful! Redirecting to login...');
          this.redirectTimeout = setTimeout(() => {
            this.router.navigate(['/login']).catch(() => {
              // Fallback to hard navigation if Angular routing fails
              window.location.href = '/login';
            });
          }, 2000);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const message: string = getErrorMessage(err, 'Failed to reset password. Link may be expired.');
          this.errorMessage.set(message);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
    }
  }
}
