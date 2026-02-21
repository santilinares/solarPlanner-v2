import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@core/services';
import { LoginRequest, getErrorMessage } from '@core/models';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule
  ],
  template: `
    <div class="login-page animate-fade-in-up">
      <p-card class="login-card">
        <ng-template pTemplate="header">
          <div class="card-header">
            <i class="pi pi-sign-in solar-icon"></i>
            <h2>Welcome Back</h2>
            <p class="subtitle">Sign in to access your solar planning dashboard</p>
          </div>
        </ng-template>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-field">
            <label for="email">Email Address</label>
            <input
              pInputText
              id="email"
              type="email"
              formControlName="email"
              placeholder="your@email.com"
              class="w-full"
              [class.ng-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
            />
            @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <small class="error-text" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
                <i class="pi pi-exclamation-circle"></i> Valid email is required
              </small>
            }
          </div>

          <div class="form-field">
            <label for="password">Password</label>
            <p-password
              formControlName="password"
              placeholder="Enter your password"
              [toggleMask]="true"
              [feedback]="false"
              class="w-full"
              inputclass="w-full"
            ></p-password>
            @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <small class="error-text" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
                <i class="pi pi-exclamation-circle"></i> Password is required
              </small>
            }
          </div>

          @if (errorMessage()) {
            <p-message 
                animate.enter="animate-shake"
                animate.leave="animate-fade-out"
              severity="error" 
              [text]="errorMessage()"
                class="w-full"
            ></p-message>
          }

          <p-button 
            type="submit" 
            label="Sign In" 
            icon="pi pi-sign-in"
            [disabled]="loading() || loginForm.invalid"
            [loading]="loading()"
            class="w-full btn-primary"
          ></p-button>

          <div class="form-links">
            <a routerLink="/forgot_password" class="link">
              <i class="pi pi-question-circle"></i> Forgot password?
            </a>
            <a routerLink="/registration" class="link">
              <i class="pi pi-user-plus"></i> Create account
            </a>
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: [
    `
      .login-page {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 70vh;
        padding: 2rem 1rem;

        ::ng-deep {
          .login-card {
            width: 100%;
            max-width: 480px;
            box-shadow: var(--shadow-xl);

            .p-card-header {
              padding: 2.5rem 2rem 1rem;
              background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
              color: white;
            }

            .p-card-body {
              padding: 2rem;
            }

            .card-header {
              text-align: center;

              .solar-icon {
                font-size: 3rem;
                color: var(--yellow-500);
                margin-bottom: 1rem;
                display: block;
                animation: solarPulse 2s ease-in-out infinite;
              }

              h2 {
                color: white;
                margin: 0 0 0.5rem;
                font-size: 2rem;
                font-weight: 700;
              }

              .subtitle {
                color: rgba(255, 255, 255, 0.9);
                font-size: 0.95rem;
                margin: 0;
              }
            }
          }
        }

        .form-field {
          margin-bottom: 1.5rem;

          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: var(--text-color);
            font-size: 0.95rem;
          }

          .error-text {
            display: block;
            color: var(--red-500);
            font-size: 0.875rem;
            margin-top: 0.5rem;

            i {
              margin-right: 0.25rem;
            }
          }
        }

        ::ng-deep {
          .p-inputtext,
          .p-password input {
            width: 100%;
            padding: 0.875rem;
            font-size: 1rem;
            border: 2px solid var(--surface-border);
            border-radius: var(--border-radius);
            transition: all 0.2s ease;

            &:focus {
              border-color: var(--primary-500);
              box-shadow: var(--focus-ring);
            }

            &.ng-invalid.ng-touched {
              border-color: var(--red-500);
              animation: shake 0.5s ease-in-out;
            }
          }

          .p-password {
            width: 100%;

            .p-password-input {
              width: 100%;
            }
          }

          .p-message {
            margin-bottom: 1.5rem;
          }

          .btn-primary {
            background: var(--primary-500) !important;
            border-color: var(--primary-500) !important;
            padding: 0.875rem 1.5rem;
            font-size: 1.05rem;
            font-weight: 600;
            margin-top: 1rem;

            &:hover:not(:disabled) {
              background: var(--primary-600) !important;
              transform: translateY(-2px);
              box-shadow: var(--shadow-lg);
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
          margin-top: 1.5rem;
          flex-wrap: wrap;
          gap: 0.5rem;

          .link {
            color: var(--primary-500);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s ease;

            i {
              margin-right: 0.25rem;
              font-size: 0.85rem;
            }

            &:hover {
              color: var(--primary-600);
              text-decoration: underline;
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
