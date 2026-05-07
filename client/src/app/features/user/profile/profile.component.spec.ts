import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ProfileComponent } from './profile.component';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { User, UserRole } from '@core/models';

const STUB_USER: User = {
  id: 'u-1',
  email: 'test@example.com',
  fullName: 'Test User',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date(),
};

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let mockUserService: { getMe: jest.Mock; updateProfile: jest.Mock; changePassword: jest.Mock };
  let mockAuthService: { currentUser: ReturnType<typeof signal<User | null>>; isAdmin: jest.Mock };
  let msgService: MessageService;

  beforeEach(async () => {
    mockUserService = {
      getMe: jest.fn().mockReturnValue(of(STUB_USER)),
      updateProfile: jest.fn().mockReturnValue(of(STUB_USER)),
      changePassword: jest.fn().mockReturnValue(of(undefined)),
    };
    mockAuthService = {
      currentUser: signal<User | null>(STUB_USER),
      isAdmin: jest.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    msgService = fixture.debugElement.injector.get(MessageService);
    jest.spyOn(msgService, 'add');
    fixture.detectChanges();
  });

  describe('ngOnInit()', () => {
    it('populates the profile form with the current user fullName', () => {
      expect(component.profileForm.get('fullName')?.value).toBe('Test User');
    });

    it('sets displayName and avatarInitial signals from the fetched user', () => {
      expect(component.displayName()).toBe('Test User');
      expect(component.avatarInitial()).toBe('T');
    });
  });

  describe('passwordsMatchValidator', () => {
    it('returns passwordsMismatch error when passwords differ', () => {
      component.passwordForm.setValue({
        currentPassword: 'old',
        newPassword: 'NewPass1!',
        confirmPassword: 'Different1!',
      });
      expect(component.passwordForm.hasError('passwordsMismatch')).toBe(true);
    });

    it('passes validation when passwords match', () => {
      component.passwordForm.setValue({
        currentPassword: 'old',
        newPassword: 'NewPass1!',
        confirmPassword: 'NewPass1!',
      });
      expect(component.passwordForm.hasError('passwordsMismatch')).toBe(false);
    });
  });

  describe('saveProfile()', () => {
    it('calls userService.updateProfile with userId and new fullName', () => {
      component.profileForm.setValue({ fullName: 'Jane Doe' });
      component.profileForm.markAsDirty();
      component.saveProfile();

      expect(mockUserService.updateProfile).toHaveBeenCalledWith('u-1', { fullName: 'Jane Doe' });
    });

    it('shows a success toast on successful update', () => {
      component.profileForm.setValue({ fullName: 'Jane Doe' });
      component.profileForm.markAsDirty();
      component.saveProfile();

      expect(msgService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('shows an error toast when the update fails', () => {
      mockUserService.updateProfile.mockReturnValue(throwError(() => new Error('Server error')));
      component.profileForm.setValue({ fullName: 'Jane Doe' });
      component.profileForm.markAsDirty();
      component.saveProfile();

      expect(msgService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });
  });

  describe('changePassword()', () => {
    const VALID_PASSWORDS = {
      currentPassword: 'CurrentPass1',
      newPassword: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    };

    it('calls userService.changePassword with userId, current and new passwords', () => {
      component.passwordForm.setValue(VALID_PASSWORDS);
      component.changePassword();

      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        'u-1',
        'CurrentPass1',
        'NewPassword1!',
      );
    });

    it('shows a success toast on successful password change', () => {
      component.passwordForm.setValue(VALID_PASSWORDS);
      component.changePassword();

      expect(msgService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });
  });
});
