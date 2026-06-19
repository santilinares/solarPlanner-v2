import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@core/services';
import { LanguageService } from '@core/services/language.service';
import { getErrorMessage } from '@core/models';
import { strongPasswordValidator, PASSWORD_HINT } from '@core/validators/password.validator';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, PasswordModule, CardModule, MessageModule],
  template: `
    <div class="reset-password-page animate-fade-in-up">
      <p-card class="reset-password-card">
        <ng-template pTemplate="header">
          <div class="card-header">
            <i class="pi pi-key solar-icon"></i>
            <h2>{{ i18n.t('auth.reset.title') }}</h2>
            <p class="subtitle">{{ i18n.t('auth.reset.subtitle') }}</p>
          </div>
        </ng-template>

        <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()">
          <div class="form-field">
            <label for="password">{{ i18n.t('profile.newPassword') }}</label>
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
            @if (resetPasswordForm.get('password')?.invalid && resetPasswordForm.get('password')?.touched) {
              <small class="error-text">
                <i class="pi pi-exclamation-circle"></i> {{ passwordHint }}
              </small>
            }
          </div>

          <div class="form-field">
            <label for="confirmPassword">{{ i18n.t('auth.reset.confirm') }}</label>
            <p-password
              formControlName="confirmPassword"
              [placeholder]="i18n.t('auth.reset.confirmPlaceholder')"
              [toggleMask]="true"
              [feedback]="false"
              class="w-full"
              inputclass="w-full"
            ></p-password>
            @if (resetPasswordForm.hasError('passwordMismatch') && resetPasswordForm.get('confirmPassword')?.touched) {
              <small class="error-text">
                <i class="pi pi-exclamation-circle"></i> {{ i18n.t('auth.reset.passwordsMismatch') }}
              </small>
            }
          </div>

          @if (errorMessage()) {
            <p-message severity="error" [textContent]="errorMessage()" class="w-full"></p-message>
          }

          @if (successMessage()) {
            <p-message severity="success" [textContent]="successMessage()" class="w-full"></p-message>
          }

          <p-button
            type="submit"
            [label]="i18n.t('auth.reset.submit')"
            icon="pi pi-check"
            [disabled]="loading() || resetPasswordForm.invalid"
            [loading]="loading()"
            class="w-full"
          ></p-button>

          <div class="form-links">
            <a routerLink="/login" class="link">
              <i class="pi pi-arrow-left"></i> {{ i18n.t('auth.backToSignIn') }}
            </a>
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    .reset-password-page {
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
        text-align: center;
        margin-top: 1.5rem;

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
    }

    .reset-password-card {
      width: 100%;
      max-width: 28rem;
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
      .reset-password-card .p-card-header {
        padding: 2.5rem 2rem 1rem;
        background: linear-gradient(135deg, var(--p-primary-400) 0%, var(--p-primary-500) 100%);
        color: var(--p-primary-contrast-color);
        border-top-left-radius: var(--p-card-border-radius);
        border-top-right-radius: var(--p-card-border-radius);
      }

      .reset-password-card .p-card-body {
        padding: 2rem;
      }

      .reset-password-page .p-password,
      .reset-password-page .p-password .p-password-input {
        width: 100%;
      }

      .reset-password-page .p-password .p-password-input {
        transition: all 0.2s ease;

        &:focus {
          border-color: var(--p-primary-500);
          box-shadow: var(--focus-ring);
        }

        &.ng-invalid.ng-touched {
          border-color: var(--p-red-500);
          animation: shake 0.5s ease-in-out;
        }
      }

      .reset-password-page .p-message {
        margin-bottom: 1.5rem;
      }
    }
  `]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly i18n = inject(LanguageService);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  readonly passwordHint = PASSWORD_HINT;
  private redirectTimeout?: ReturnType<typeof setTimeout>;

  token: string = '';

  resetPasswordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, strongPasswordValidator()]],
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

      this.authService.resetPassword(this.token, { password }).subscribe({
        next: () => {
          this.loading.set(false);
          this.successMessage.set(this.i18n.t('auth.reset.success'));
          this.redirectTimeout = setTimeout(() => {
            this.router.navigate(['/login']).catch(() => {
              window.location.href = '/login';
            });
          }, 2000);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const message: string = getErrorMessage(err, this.i18n.t('auth.reset.failed'));
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
