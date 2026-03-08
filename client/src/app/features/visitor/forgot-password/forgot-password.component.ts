import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services';
import { ForgotPasswordRequest, getErrorMessage } from '@core/models';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="forgot-password-page">
      <div class="forgot-password-card">
        <h2>Reset Password</h2>
        <p class="subtitle">Enter your email and we'll send you a reset link.</p>
        
        <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="your@email.com"
              [class.error]="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched"
            />
          </div>

          @if (errorMessage()) {
            <div class="alert alert-error">{{ errorMessage() }}</div>
          }

          @if (successMessage()) {
            <div class="alert alert-success">{{ successMessage() }}</div>
          }

          <button type="submit" [disabled]="loading() || forgotPasswordForm.invalid" class="btn btn-primary">
            {{ loading() ? 'Sending...' : 'Send Reset Link' }}
          </button>

          <div class="form-links">
            <a routerLink="/login">Back to sign in</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .forgot-password-page {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;

      .forgot-password-card {
        background: var(--p-surface-0);
        padding: 2rem;
        border-radius: 0.5rem;
        box-shadow: var(--p-shadow-md);
        width: 100%;
        max-width: 25rem;

        h2 {
          text-align: center;
          margin-bottom: 0.5rem;
          color: var(--p-text-color);
        }

        .subtitle {
          text-align: center;
          color: var(--p-text-muted-color);
          margin-bottom: 2rem;
          font-size: 0.9rem;
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
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const data = this.forgotPasswordForm.value as ForgotPasswordRequest;

      this.authService.forgotPassword(data).subscribe({
        next: (response) => {
          this.loading.set(false);
          this.successMessage.set(response.message ?? 'Password reset link sent to your email!');
          this.forgotPasswordForm.reset();
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const message: string = getErrorMessage(err, 'Failed to send reset link. Please try again.');
          this.errorMessage.set(message);
        }
      });
    }
  }
}
