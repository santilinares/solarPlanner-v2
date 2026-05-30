import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@core/services';
import { RegisterRequest, getErrorMessage } from '@core/models';
import { strongPasswordValidator, PASSWORD_HINT } from '@core/validators/password.validator';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule,
  ],
  template: `
    <div class="register-page animate-fade-in-up">
      <p-card class="register-card">
        <ng-template pTemplate="header">
          <div class="card-header">
            <i class="pi pi-user-plus solar-icon"></i>
            <h2>Join Solar Planner</h2>
            <p class="subtitle">Start planning your sustainable energy future today</p>
          </div>
        </ng-template>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-field">
              <label for="firstName">First Name</label>
              <input
                pInputText
                id="firstName"
                type="text"
                formControlName="firstName"
                placeholder="John"
                class="w-full"
                [class.ng-invalid]="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched"
              />
            </div>

            <div class="form-field">
              <label for="lastName">Last Name</label>
              <input
                pInputText
                id="lastName"
                type="text"
                formControlName="lastName"
                placeholder="Doe"
                class="w-full"
                [class.ng-invalid]="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="email">Email Address</label>
            <input
              pInputText
              id="email"
              type="email"
              formControlName="email"
              placeholder="your@email.com"
              class="w-full"
              [class.ng-invalid]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
            />
            @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                <small class="error-text" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
                <i class="pi pi-exclamation-circle"></i> Valid email is required
              </small>
            }
          </div>

          <div class="form-field">
            <label for="password">Password</label>
            <p-password
              formControlName="password"
              [placeholder]="passwordHint"
              [toggleMask]="true"
              [feedback]="true"
              class="w-full"
              inputclass="w-full"
              [mediumRegex]="'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})'"
              [strongRegex]="'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{10,})'"
            ></p-password>
            @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                <small class="error-text" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
                <i class="pi pi-exclamation-circle"></i> {{ passwordHint }}
              </small>
            }
          </div>

          @if (errorMessage()) {
            <p-message 
                animate.enter="animate-shake"
                animate.leave="animate-fade-out"
              severity="error" 
              [textContent]="errorMessage()"
                class="w-full"
            ></p-message>
          }

          @if (successMessage()) {
            <p-message 
                animate.enter="animate-fade-in"
                animate.leave="animate-fade-out"
              severity="success" 
              [textContent]="successMessage()"
                class="w-full"
            ></p-message>
          }

          <div class="auth-btn-row">
            <p-button
              type="submit"
              label="Create Account"
              icon="pi pi-user-plus"
              [disabled]="loading() || registerForm.invalid"
              [loading]="loading()"
            ></p-button>

            <p-button
              type="button"
              label="Continue with Google"
              [disabled]="loading()"
              [loading]="googleLoading()"
              severity="secondary"
              (onClick)="signInWithGoogle()"
            >
              <ng-template pTemplate="icon">
                <img src="assets/google-icon.svg" alt="Google" class="google-icon" />
              </ng-template>
            </p-button>
          </div>

          <div class="form-links">
            <a routerLink="/login" class="link">
              <i class="pi pi-sign-in"></i> Already have an account? Sign in
            </a>
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    .register-page {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 70vh;
      padding: 2rem 1rem;

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .form-field {
        margin-bottom: 1.5rem;

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--p-text-color);
          font-size: 0.95rem;
        }

        .error-text {
          display: block;
          color: var(--p-red-500);
          font-size: 0.875rem;
          margin-top: 0.5rem;

          i {
            margin-right: 0.25rem;
          }
        }
      }

      .form-links {
        text-align: center;
        margin-top: 1.5rem;

        .link {
          color: var(--p-primary-500);
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s ease;

          i {
            margin-right: 0.25rem;
            font-size: 0.85rem;
          }

          &:hover {
            color: var(--p-primary-600);
            text-decoration: underline;
          }
        }
      }

      .auth-btn-row {
        display: flex;
        gap: 0.75rem;
        width: 100%;

        @media (max-width: 480px) {
          flex-direction: column;
        }
      }

      .google-icon {
        width: 1.1rem;
        height: 1.1rem;
        margin-right: 0.4rem;
      }
    }

    .register-card {
      width: 100%;
      max-width: 34.375rem;
      box-shadow: var(--shadow-xl);
    }

    .card-header {
      text-align: center;

      .solar-icon {
        font-size: 3rem;
        color: var(--p-primary-contrast-color);
        margin-bottom: 1rem;
        display: inline-block;
      }

      h2 {
        color: var(--p-primary-contrast-color);
        margin: 0 0 0.5rem;
        font-size: 2rem;
        font-weight: 700;
      }

      .subtitle {
        color: var(--p-primary-contrast-color);
        font-size: 0.95rem;
        margin: 0;
        font-weight: 500;
      }
    }

    :host ::ng-deep {
      .register-card .p-card-header {
        padding: 2.5rem 2rem 1rem;
        background: linear-gradient(135deg, var(--p-primary-400) 0%, var(--p-primary-500) 100%);
        color: var(--p-primary-contrast-color);
        border-top-left-radius: var(--p-card-border-radius);
        border-top-right-radius: var(--p-card-border-radius);
      }

      .register-card .p-card-body {
        padding: 2rem;
      }

      .register-page .p-inputtext,
      .register-page .p-password .p-password-input {
        transition: all 0.2s ease;

        &:focus {
          border-color: var(--p-primary-500);
          box-shadow: var(--focus-ring);
        }

        &.ng-invalid.ng-touched {
          border-color: var(--p-red-500);
        }
      }

      .register-page .p-password,
      .register-page .p-password .p-password-input {
        width: 100%;
      }

      .register-page .p-password .p-password-panel {
        border-radius: var(--border-radius);
      }

      .register-page .p-message {
        margin-bottom: 1.5rem;
      }

      .auth-btn-row > p-button {
        flex: 1 1 auto;
        min-width: 0;

        .p-button {
          width: 100%;
          white-space: nowrap;
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
  googleLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  readonly passwordHint = PASSWORD_HINT;
  private redirectTimeout?: ReturnType<typeof setTimeout>;

  registerForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, strongPasswordValidator()]],
  });

  signInWithGoogle(): void {
    type GoogleAccounts = {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          prompt: () => void;
        };
      };
    };
    const google = (window as unknown as { google?: GoogleAccounts }).google;
    if (!google) return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential: string }) => {
        this.googleLoading.set(false);
        this.loading.set(true);
        this.errorMessage.set('');
        this.authService.loginWithGoogle(response.credential).subscribe({
          next: () => {
            this.router.navigate(['/projects']).catch(() => {
              window.location.href = '/projects';
            });
          },
          error: (err: unknown) => {
            this.loading.set(false);
            this.errorMessage.set(getErrorMessage(err, 'Google sign-in failed. Please try again.'));
          },
          complete: () => {
            this.loading.set(false);
          },
        });
      },
    });

    this.googleLoading.set(true);
    google.accounts.id.prompt();
  }

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
              window.location.href = '/projects';
            });
          }, 1500);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(getErrorMessage(err, 'Registration failed. Please try again.'));
        },
      });
    }
  }

  ngOnDestroy(): void {
    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
    }
  }
}
