import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@core/services';
import { LanguageService } from '@core/services/language.service';
import { ForgotPasswordRequest, getErrorMessage } from '@core/models';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, CardModule, MessageModule],
  template: `
    <div class="forgot-password-page animate-fade-in-up">
      <p-card class="forgot-password-card">
        <ng-template pTemplate="header">
          <div class="card-header">
            <i class="pi pi-lock solar-icon"></i>
            <h2>{{ i18n.t('auth.forgot.title') }}</h2>
            <p class="subtitle">{{ i18n.t('auth.forgot.subtitle') }}</p>
          </div>
        </ng-template>

        <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
          <div class="form-field">
            <label for="email">{{ i18n.t('auth.email') }}</label>
            <input
              pInputText
              id="email"
              type="email"
              formControlName="email"
              placeholder="your@email.com"
              class="w-full"
              [class.ng-invalid]="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched"
            />
            @if (forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched) {
              <small class="error-text">
                <i class="pi pi-exclamation-circle"></i> {{ i18n.t('auth.emailRequired') }}
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
            [label]="i18n.t('auth.forgot.send')"
            icon="pi pi-send"
            [disabled]="loading() || forgotPasswordForm.invalid"
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
    .forgot-password-page {
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

    .forgot-password-card {
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
      .forgot-password-card .p-card-header {
        padding: 2.5rem 2rem 1rem;
        background: linear-gradient(135deg, var(--p-primary-400) 0%, var(--p-primary-500) 100%);
        color: var(--p-primary-contrast-color);
        border-top-left-radius: var(--p-card-border-radius);
        border-top-right-radius: var(--p-card-border-radius);
      }

      .forgot-password-card .p-card-body {
        padding: 2rem;
      }

      .forgot-password-page .p-inputtext {
        transition: all 0.2s ease;

        &:focus {
          border-color: var(--p-primary-500);
          box-shadow: var(--focus-ring);
        }

        &.ng-invalid.ng-touched {
          border-color: var(--p-red-500);
        }
      }

      .forgot-password-page .p-message {
        margin-bottom: 1.5rem;
      }
    }
  `]
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  readonly i18n = inject(LanguageService);

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
          this.successMessage.set(response.message ?? this.i18n.t('auth.forgot.success'));
          this.forgotPasswordForm.reset();
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const message: string = getErrorMessage(err, this.i18n.t('auth.forgot.failed'));
          this.errorMessage.set(message);
        }
      });
    }
  }
}
