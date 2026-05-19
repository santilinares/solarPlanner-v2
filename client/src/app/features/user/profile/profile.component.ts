import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { ThemeService } from '@core/services/theme.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword
    ? { passwordsMismatch: true }
    : null;
}

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    DividerModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
    ToggleSwitchModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <section class="profile-page animate-fade-in-up" aria-label="User profile">
      <header class="profile-header">
        <div class="avatar" aria-hidden="true">
          <span>{{ avatarInitial() }}</span>
        </div>
        <div>
          <p class="eyebrow">Account</p>
          <h1>{{ displayName() }}</h1>
          <p class="email-text">{{ authService.currentUser()?.email || '' }}</p>
        </div>
      </header>

      <div class="forms-grid stagger-children">

        <!-- Profile form -->
        <p-card styleClass="profile-card">
          <ng-template pTemplate="title">Account Information</ng-template>
          <ng-template pTemplate="content">
            <p class="card-description">Update your display name across all your projects.</p>
            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="form-body">
              <div class="field">
                <label for="fullName">Full name</label>
                <input
                  pInputText
                  id="fullName"
                  formControlName="fullName"
                  placeholder="Your full name"
                  class="w-full"
                />
                @if (profileForm.get('fullName')?.invalid && profileForm.get('fullName')?.touched) {
                  <small class="field-error">Full name is required.</small>
                }
              </div>
              <p-button
                type="submit"
                label="Save changes"
                icon="pi pi-check"
                [loading]="savingProfile()"
                [disabled]="profileForm.invalid || profileForm.pristine"
              />
            </form>
          </ng-template>
        </p-card>

        <!-- Password form -->
        <p-card styleClass="profile-card">
          <ng-template pTemplate="title">Change Password</ng-template>
          <ng-template pTemplate="content">
            <p class="card-description">Choose a strong password to keep your account secure.</p>
            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="form-body">
              <div class="field">
                <label for="currentPassword">Current password</label>
                <p-password
                  inputId="currentPassword"
                  formControlName="currentPassword"
                  placeholder="Enter current password"
                  [feedback]="false"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                />
                @if (passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched) {
                  <small class="field-error">Current password is required.</small>
                }
              </div>
              <div class="field">
                <label for="newPassword">New password</label>
                <p-password
                  inputId="newPassword"
                  formControlName="newPassword"
                  placeholder="At least 8 characters"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                />
                @if (passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched) {
                  <small class="field-error">Password must be at least 8 characters.</small>
                }
              </div>
              <div class="field">
                <label for="confirmPassword">Confirm new password</label>
                <p-password
                  inputId="confirmPassword"
                  formControlName="confirmPassword"
                  placeholder="Repeat new password"
                  [feedback]="false"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                />
                @if (passwordForm.hasError('passwordsMismatch') && passwordForm.get('confirmPassword')?.touched) {
                  <small class="field-error">Passwords do not match.</small>
                }
              </div>
              <p-button
                type="submit"
                label="Update password"
                icon="pi pi-shield"
                severity="secondary"
                [loading]="savingPassword()"
                [disabled]="passwordForm.invalid"
              />
            </form>
          </ng-template>
        </p-card>

      </div>

      <p-divider />

      <!-- Preferences section -->
      <div class="preferences-section">
        <h2 class="section-title">Preferences</h2>
        <p class="section-description">Customize your Solar Planner experience.</p>

        <div class="pref-row">
          <div class="pref-info">
            <span class="material-icons pref-icon">dark_mode</span>
            <div>
              <p class="pref-label">Dark mode</p>
              <p class="pref-hint">Switch between light and dark theme</p>
            </div>
          </div>
          <p-toggleswitch
            [ngModel]="themeService.isDarkMode()"
            (onChange)="themeService.toggle()"
          />
        </div>
      </div>
    </section>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1rem;
      color: var(--p-text-color);
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      margin-bottom: 0.5rem;

      .avatar {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--p-primary-700);
        color: var(--p-primary-contrast-color);
        font-size: 1.5rem;
        font-weight: 700;
        flex-shrink: 0;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--p-primary-700);
        font-weight: 700;
      }

      h1 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--p-text-color);
        margin: 0.1rem 0 0.25rem;
      }

      .email-text {
        margin: 0;
        color: var(--p-text-muted-color);
        font-size: 0.95rem;
      }
    }

    .forms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
      gap: 1.25rem;
      align-items: start;
    }

    .card-description {
      color: var(--p-text-muted-color);
      margin: 0 0 1.25rem;
      font-size: 0.9rem;
    }

    .form-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--p-text-color);
      }
    }

    .field-error {
      color: var(--p-red-500);
      font-size: 0.8rem;
    }

    .preferences-section {
      .section-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--p-text-color);
        margin: 0 0 0.25rem;
      }

      .section-description {
        color: var(--p-text-muted-color);
        font-size: 0.9rem;
        margin: 0 0 1.5rem;
      }
    }

    .pref-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-radius: 0.75rem;
      background: var(--p-surface-100);
      border: 1px solid var(--p-surface-200);
      max-width: 32rem;
    }

    .pref-info {
      display: flex;
      align-items: center;
      gap: 0.875rem;

      .pref-icon {
        font-size: 1.4rem;
        color: var(--p-primary-600);
      }

      .pref-label {
        margin: 0;
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--p-text-color);
      }

      .pref-hint {
        margin: 0.1rem 0 0;
        font-size: 0.8rem;
        color: var(--p-text-muted-color);
      }
    }

    @media (max-width: 640px) {
      .profile-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .pref-row {
        max-width: 100%;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly displayName = signal('');
  readonly avatarInitial = signal('?');

  readonly profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator }
  );

  ngOnInit(): void {
    this.userService.getMe().subscribe({
      next: (user) => {
        const name = (user as unknown as { fullName?: string }).fullName ?? '';
        this.displayName.set(name);
        this.avatarInitial.set(name.charAt(0).toUpperCase() || '?');
        this.profileForm.patchValue({ fullName: name });
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.savingProfile.set(true);
    const { fullName } = this.profileForm.getRawValue();
    this.userService.updateProfile(userId, { fullName: fullName! }).subscribe({
      next: (updated) => {
        const name = (updated as unknown as { fullName?: string }).fullName ?? fullName!;
        this.displayName.set(name);
        this.avatarInitial.set(name.charAt(0).toUpperCase() || '?');
        this.profileForm.markAsPristine();
        this.savingProfile.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Profile updated',
          detail: 'Your name has been saved successfully.',
        });
      },
      error: () => {
        this.savingProfile.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Update failed',
          detail: 'Could not update your profile. Please try again.',
        });
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.savingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.userService.changePassword(userId, currentPassword!, newPassword!).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.savingPassword.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Password changed',
          detail: 'Your password has been updated successfully.',
        });
      },
      error: (err: { error?: { message?: string } }) => {
        this.savingPassword.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Password change failed',
          detail: err?.error?.message ?? 'Please check your current password and try again.',
        });
      },
    });
  }
}
