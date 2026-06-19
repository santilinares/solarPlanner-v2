import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { strongPasswordValidator, PASSWORD_HINT } from '@core/validators/password.validator';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { LanguageService } from '@core/services/language.service';

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
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <section class="profile-page animate-fade-in-up" [attr.aria-label]="i18n.t('profile.aria')">
      <header class="profile-header">
        <div class="avatar" aria-hidden="true">
          <span>{{ avatarInitial() }}</span>
        </div>
        <div>
          <p class="eyebrow">{{ i18n.t('profile.account') }}</p>
          <h1>{{ displayName() }}</h1>
          <p class="email-text">{{ authService.currentUser()?.email || '' }}</p>
        </div>
      </header>

      <div class="forms-grid stagger-children">

        <!-- Profile form -->
        <p-card styleClass="profile-card">
          <ng-template pTemplate="title">{{ i18n.t('profile.accountInfo') }}</ng-template>
          <ng-template pTemplate="content">
            <p class="card-description">{{ i18n.t('profile.accountDescription') }}</p>
            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="form-body">
              <div class="field">
                <label for="fullName">{{ i18n.t('profile.fullName') }}</label>
                <input
                  pInputText
                  id="fullName"
                  formControlName="fullName"
                  [placeholder]="i18n.t('profile.fullNamePlaceholder')"
                  class="w-full"
                />
                @if (profileForm.get('fullName')?.invalid && profileForm.get('fullName')?.touched) {
                  <small class="field-error">{{ i18n.t('profile.fullNameRequired') }}</small>
                }
              </div>
              <div class="field">
                <label for="language">{{ i18n.t('common.language') }}</label>
                <p-select
                  inputId="language"
                  formControlName="language"
                  [options]="languageOptions()"
                  optionLabel="label"
                  optionValue="value"
                  styleClass="w-full"
                />
                <small class="field-help">{{ i18n.t('profile.languageDescription') }}</small>
              </div>
              <p-button
                type="submit"
                [label]="i18n.t('common.saveChanges')"
                icon="pi pi-check"
                [loading]="savingProfile()"
                [disabled]="profileForm.invalid || profileForm.pristine"
              />
            </form>
          </ng-template>
        </p-card>

        <!-- Password form -->
        <p-card styleClass="profile-card">
          <ng-template pTemplate="title">{{ i18n.t('profile.changePassword') }}</ng-template>
          <ng-template pTemplate="content">
            <p class="card-description">{{ i18n.t('profile.passwordDescription') }}</p>
            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="form-body">
              <div class="field">
                <label for="currentPassword">{{ i18n.t('profile.currentPassword') }}</label>
                <p-password
                  inputId="currentPassword"
                  formControlName="currentPassword"
                  [placeholder]="i18n.t('profile.currentPasswordPlaceholder')"
                  [feedback]="false"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                />
                @if (passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched) {
                  <small class="field-error">{{ i18n.t('profile.currentPasswordRequired') }}</small>
                }
              </div>
              <div class="field">
                <label for="newPassword">{{ i18n.t('profile.newPassword') }}</label>
                <p-password
                  inputId="newPassword"
                  formControlName="newPassword"
                  [placeholder]="passwordHint"
                  [toggleMask]="true"
                  [feedback]="true"
                  [mediumRegex]="'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})'"
                  [strongRegex]="'^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{10,})'"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                />
                @if (passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched) {
                  <small class="field-error">{{ passwordHint }}</small>
                }
              </div>
              <div class="field">
                <label for="confirmPassword">{{ i18n.t('profile.confirmPassword') }}</label>
                <p-password
                  inputId="confirmPassword"
                  formControlName="confirmPassword"
                  [placeholder]="i18n.t('profile.confirmPasswordPlaceholder')"
                  [feedback]="false"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                />
                @if (passwordForm.hasError('passwordsMismatch') && passwordForm.get('confirmPassword')?.touched) {
                  <small class="field-error">{{ i18n.t('profile.passwordsMismatch') }}</small>
                }
              </div>
              <p-button
                type="submit"
                [label]="i18n.t('profile.updatePassword')"
                icon="pi pi-shield"
                severity="secondary"
                [loading]="savingPassword()"
                [disabled]="passwordForm.invalid"
              />
            </form>
          </ng-template>
        </p-card>

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

    .field-help {
      color: var(--p-text-muted-color);
      font-size: 0.8rem;
    }

    @media (max-width: 640px) {
      .profile-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  readonly i18n = inject(LanguageService);
  private readonly fb = inject(FormBuilder);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly displayName = signal('');
  readonly avatarInitial = signal('?');
  readonly passwordHint = PASSWORD_HINT;
  readonly languageOptions = computed(() => [
    { label: this.i18n.t('common.english'), value: 'en' },
    { label: this.i18n.t('common.spanish'), value: 'es' },
  ]);

  readonly profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(1)]],
    language: [this.i18n.currentLanguage(), Validators.required],
  });

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, strongPasswordValidator()]],
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
        this.profileForm.patchValue({ fullName: name, language: user.language ?? 'en' });
        this.i18n.setLanguage(user.language ?? 'en');
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const userId = this.authService.currentUser()?.id ?? this.authService.getDecodedToken()?._id;
    if (!userId) return;

    this.savingProfile.set(true);
    const { fullName, language } = this.profileForm.getRawValue();
    this.i18n.setLanguage(language!);
    this.userService.updateProfile(userId, { fullName: fullName!, language: language! }).subscribe({
      next: (updated) => {
        const name = (updated as unknown as { fullName?: string }).fullName ?? fullName!;
        const savedLanguage = updated.language ?? language!;
        this.displayName.set(name);
        this.avatarInitial.set(name.charAt(0).toUpperCase() || '?');
        this.i18n.setLanguage(savedLanguage);
        this.authService.currentUser.update((current) =>
          current ? { ...current, fullName: name, language: savedLanguage } : current
        );
        this.profileForm.markAsPristine();
        this.savingProfile.set(false);
        this.messageService.add({
          severity: 'success',
          summary: this.i18n.t('profile.updatedSummary'),
          detail: this.i18n.t('profile.updatedDetail'),
        });
      },
      error: () => {
        this.savingProfile.set(false);
        this.i18n.setLanguage(this.authService.currentUser()?.language ?? 'en');
        this.messageService.add({
          severity: 'error',
          summary: this.i18n.t('profile.updateFailedSummary'),
          detail: this.i18n.t('profile.updateFailedDetail'),
        });
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const userId = this.authService.currentUser()?.id ?? this.authService.getDecodedToken()?._id;
    if (!userId) return;

    this.savingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.userService.changePassword(userId, currentPassword!, newPassword!).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.savingPassword.set(false);
        this.messageService.add({
          severity: 'success',
          summary: this.i18n.t('profile.passwordChangedSummary'),
          detail: this.i18n.t('profile.passwordChangedDetail'),
        });
      },
      error: (err: { error?: { message?: string } }) => {
        this.savingPassword.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.i18n.t('profile.passwordFailedSummary'),
          detail: err?.error?.message ?? this.i18n.t('profile.passwordFailedDetail'),
        });
      },
    });
  }
}
