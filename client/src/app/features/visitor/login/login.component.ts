import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@core/services';
import { LanguageService } from '@core/services/language.service';
import { LoginRequest, getErrorMessage } from '@core/models';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-login',
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
    <div class="login-page animate-fade-in-up">
      <p-card class="login-card">
        <ng-template pTemplate="header">
          <div class="card-header">
            <i class="pi pi-sign-in solar-icon"></i>
            <h2>{{ i18n.t('auth.login.title') }}</h2>
            <p class="subtitle">{{ i18n.t('auth.login.subtitle') }}</p>
          </div>
        </ng-template>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-field">
            <label for="email">{{ i18n.t('auth.email') }}</label>
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
                <i class="pi pi-exclamation-circle"></i> {{ i18n.t('auth.emailRequired') }}
              </small>
            }
          </div>

          <div class="form-field">
            <label for="password">{{ i18n.t('auth.password') }}</label>
            <p-password
              formControlName="password"
              [placeholder]="i18n.t('auth.passwordPlaceholder')"
              [toggleMask]="true"
              [feedback]="false"
              class="w-full"
              inputclass="w-full"
            ></p-password>
            @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
              <small class="error-text" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
                <i class="pi pi-exclamation-circle"></i> {{ i18n.t('auth.passwordRequired') }}
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

          <div class="auth-btn-row">
            <p-button
              type="submit"
              [label]="i18n.t('auth.signIn')"
              icon="pi pi-sign-in"
              [disabled]="loading() || loginForm.invalid"
              [loading]="loading()"
            ></p-button>

            <p-button
              type="button"
              [label]="i18n.t('auth.google')"
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
            <a routerLink="/forgot_password" class="link">
              <i class="pi pi-question-circle"></i> {{ i18n.t('auth.forgotPassword') }}
            </a>
            <a routerLink="/registration" class="link">
              <i class="pi pi-user-plus"></i> {{ i18n.t('auth.createAccountLink') }}
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
          display: flex;
          justify-content: space-between;
          margin-top: 1.5rem;
          flex-wrap: wrap;
          gap: 0.5rem;

          .link {
            color: var(--p-primary-500);
            text-decoration: none;
            font-size: 0.9rem;
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


      .login-card {
        width: 100%;
        max-width: 30rem;
        box-shadow: var(--shadow-xl);
      }

      .card-header {
        text-align: center;

        .solar-icon {
          font-size: 3rem;
          color: var(--p-primary-contrast-color);
          margin-bottom: 1rem;
          display: block;
        }

        h2 {
          color: var(--p-primary-contrast-color);
          margin: 0 0 0.5rem;
          font-size: 2rem;
          font-weight: 700;
        }

        .subtitle {
          color: color-mix(in srgb, var(--p-primary-contrast-color) 90%, transparent);
          font-size: 0.95rem;
          margin: 0;
        }
      }

      :host ::ng-deep {
        .login-card .p-card-header {
          padding: 2.5rem 2rem 1rem;
          background: linear-gradient(135deg, var(--p-primary-400) 0%, var(--p-primary-500) 100%);
          color: var(--p-primary-contrast-color);
          border-top-left-radius: var(--p-card-border-radius);
          border-top-right-radius: var(--p-card-border-radius);
        }

        .login-card .p-card-body {
          padding: 2rem;
        }

        .login-page .p-inputtext,
        .login-page .p-password .p-password-input {
          transition: all 0.2s ease;

          &:focus {
            border-color: var(--p-primary-500);
            box-shadow: var(--focus-ring);
          }

          &.ng-invalid.ng-touched {
            border-color: var(--p-red-500);
          }
        }

        .login-page .p-password,
        .login-page .p-password .p-password-input {
          width: 100%;
        }

        .login-page .p-message {
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
    `,
  ],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(LanguageService);

  loading = signal(false);
  googleLoading = signal(false);
  errorMessage = signal('');
  private returnUrl = '/projects';

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/projects';
  }

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
            this.router.navigate([this.returnUrl]).catch(() => {
              window.location.href = this.returnUrl;
            });
          },
          error: (err: unknown) => {
            this.loading.set(false);
            this.errorMessage.set(getErrorMessage(err, this.i18n.t('auth.googleFailed')));
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
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');

      const credentials = this.loginForm.value as LoginRequest;

      this.authService.login(credentials).subscribe({
        next: () => {
          this.router.navigate([this.returnUrl]).catch(() => {
            window.location.href = this.returnUrl;
          });
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(getErrorMessage(err, this.i18n.t('auth.loginFailed')));
        },
        complete: () => {
          this.loading.set(false);
        },
      });
    }
  }
}
