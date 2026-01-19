import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services';
import { LoginRequest, getErrorMessage } from '@core/models';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-card">
        <h2>Sign In</h2>
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="your@email.com"
              [class.error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
            />
            @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
              <span class="error-message">Valid email is required</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              [class.error]="
                loginForm.get('password')?.invalid && loginForm.get('password')?.touched
              "
            />
            @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
              <span class="error-message">Password is required</span>
            }
          </div>

          @if (errorMessage()) {
            <div class="alert alert-error">{{ errorMessage() }}</div>
          }

          <button type="submit" [disabled]="loading() || loginForm.invalid" class="btn btn-primary">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>

          <div class="form-links">
            <a routerLink="/forgot_password">Forgot password?</a>
            <a routerLink="/registration">Create account</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .login-page {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 60vh;

        .login-card {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;

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
            display: flex;
            justify-content: space-between;
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
    `,
  ],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = signal(false);
  errorMessage = signal('');
  private returnUrl = '/projects'; // Default return URL

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    // Get return URL from query params or default to /projects
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/projects';
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');

      const credentials = this.loginForm.value as LoginRequest;

      this.authService.login(credentials).subscribe({
        next: () => {
          this.router.navigate([this.returnUrl]).catch(() => {
            // Fallback to hard navigation if Angular routing fails
            window.location.href = this.returnUrl;
          });
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const message: string = getErrorMessage(err, 'Login failed. Please try again.');
          this.errorMessage.set(message);
        },
        complete: () => {
          this.loading.set(false);
        },
      });
    }
  }
}
