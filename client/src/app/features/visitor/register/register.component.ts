import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services';
import { RegisterRequest, getErrorMessage } from '@core/models';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="register-page">
      <div class="register-card">
        <h2>Create Account</h2>
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              formControlName="firstName"
              placeholder="John"
              [class.error]="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched"
            />
          </div>

          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              formControlName="lastName"
              placeholder="Doe"
              [class.error]="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched"
            />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="your@email.com"
              [class.error]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              [class.error]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
            />
            @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
              <span class="error-message">Password must be at least 8 characters</span>
            }
          </div>

          @if (errorMessage()) {
            <div class="alert alert-error">{{ errorMessage() }}</div>
          }

          @if (successMessage()) {
            <div class="alert alert-success">{{ successMessage() }}</div>
          }

          <button type="submit" [disabled]="loading() || registerForm.invalid" class="btn btn-primary">
            {{ loading() ? 'Creating account...' : 'Create Account' }}
          </button>

          <div class="form-links">
            <a routerLink="/login">Already have an account? Sign in</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .register-page {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;

      .register-card {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        width: 100%;
        max-width: 450px;

        h2 {
          text-align: center;
          margin-bottom: 2rem;
          color: #333;
        }

        .form-group {
          margin-bottom: 1.5rem;

          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #333;
          }

          input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;

            &.error {
              border-color: #f44336;
            }

            &:focus {
              outline: none;
              border-color: #1976d2;
            }
          }

          .error-message {
            display: block;
            color: #f44336;
            font-size: 0.875rem;
            margin-top: 0.25rem;
          }
        }

        .alert {
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;

          &.alert-error {
            background-color: #ffebee;
            color: #c62828;
          }

          &.alert-success {
            background-color: #e8f5e9;
            color: #2e7d32;
          }
        }

        .btn {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;

          &.btn-primary {
            background-color: #1976d2;
            color: white;

            &:hover:not(:disabled) {
              background-color: #1565c0;
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
            color: #1976d2;
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
export class RegisterComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  private redirectTimeout?: ReturnType<typeof setTimeout>;

  registerForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const registerData = this.registerForm.value as RegisterRequest;

      this.authService.register(registerData).subscribe({
        next: () => {
          this.successMessage.set('Account created successfully! Redirecting...');
          this.redirectTimeout = setTimeout(() => {
            this.router.navigate(['/projects']).catch(() => {
              // Fallback to hard navigation if Angular routing fails
              window.location.href = '/projects';
            });
          }, 1500);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const message: string = getErrorMessage(err, 'Registration failed. Please try again.');
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
