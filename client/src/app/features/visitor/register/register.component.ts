import { Component, inject, signal, OnDestroy } from '@angular/core';
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

@Component({
  selector: 'app-register',
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
              placeholder="Minimum 8 characters"
              [toggleMask]="true"
              [feedback]="true"
              class="w-full"
              inputclass="w-full"
              [mediumRegex]="'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})'"
              [strongRegex]="'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{10,})'"
            ></p-password>
            @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                <small class="error-text" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
                <i class="pi pi-exclamation-circle"></i> Password must be at least 8 characters
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

          @if (successMessage()) {
            <p-message 
                animate.enter="animate-fade-in"
                animate.leave="animate-fade-out"
              severity="success" 
              [text]="successMessage()"
                class="w-full"
            ></p-message>
          }

          <p-button 
            type="submit" 
            label="Create Account" 
            icon="pi pi-user-plus"
            [disabled]="loading() || registerForm.invalid"
            [loading]="loading()"
            class="w-full btn-solar"
          ></p-button>

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

      ::ng-deep {
        .register-card {
          width: 100%;
          max-width: 550px;
          box-shadow: var(--shadow-xl);

          .p-card-header {
            padding: 2.5rem 2rem 1rem;
            background: linear-gradient(135deg, var(--p-yellow-500) 0%, var(--p-yellow-600) 100%);
            color: #000;
          }

          .p-card-body {
            padding: 2rem;
          }

          .card-header {
            text-align: center;

            .solar-icon {
              font-size: 3rem;
              color: #000;
              margin-bottom: 1rem;
              display: block;
              animation: solarPulse 2s ease-in-out infinite;
            }

            h2 {
              color: #000;
              margin: 0 0 0.5rem;
              font-size: 2rem;
              font-weight: 700;
            }

            .subtitle {
              color: rgba(0, 0, 0, 0.8);
              font-size: 0.95rem;
              margin: 0;
              font-weight: 500;
            }
          }
        }
      }

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
            border-color: var(--p-primary-500);
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

          .p-password-panel {
            border-radius: var(--border-radius);
          }
        }

        .p-message {
          margin-bottom: 1.5rem;
        }

        .btn-solar {
          background: var(--p-yellow-500) !important;
          border-color: var(--p-yellow-500) !important;
          color: #000 !important;
          padding: 0.875rem 1.5rem;
          font-size: 1.05rem;
          font-weight: 700;
          margin-top: 1rem;

          &:hover:not(:disabled) {
            background: var(--p-yellow-600) !important;
            transform: translateY(-2px);
            box-shadow: 0 0 25px rgba(255, 214, 0, 0.6) !important;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
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
