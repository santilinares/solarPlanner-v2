import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { RegisterComponent } from './register.component';
import { AuthService } from '@core/services';
import { AuthResponse, UserRole } from '@core/models';
import { environment } from '@environments/environment';

type GoogleIdClient = {
  initialize: jest.Mock;
  prompt: jest.Mock;
};

function buildMockGoogle(idClient: GoogleIdClient) {
  return { accounts: { id: idClient } };
}

const STUB_RESPONSE: AuthResponse = {
  token: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
  },
};

describe('RegisterComponent – signInWithGoogle', () => {
  let component: RegisterComponent;
  let router: Router;
  let mockAuthService: Partial<AuthService>;
  let mockIdClient: GoogleIdClient;

  beforeEach(async () => {
    mockIdClient = { initialize: jest.fn(), prompt: jest.fn() };

    mockAuthService = {
      loginWithGoogle: jest.fn().mockReturnValue(of(STUB_RESPONSE)),
      isAuthenticated: signal(false),
      currentUser: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)['google'];
  });

  it('does nothing when window.google is not loaded', () => {
    delete (window as unknown as Record<string, unknown>)['google'];

    expect(() => component.signInWithGoogle()).not.toThrow();
    expect(component.googleLoading()).toBe(false);
    expect(mockAuthService.loginWithGoogle).not.toHaveBeenCalled();
  });

  it('calls initialize() with the correct client_id', () => {
    (window as unknown as Record<string, unknown>)['google'] = buildMockGoogle(mockIdClient);

    component.signInWithGoogle();

    expect(mockIdClient.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: environment.googleClientId }),
    );
  });

  it('calls initialize() before prompt()', () => {
    const order: string[] = [];
    mockIdClient.initialize.mockImplementation(() => order.push('initialize'));
    mockIdClient.prompt.mockImplementation(() => order.push('prompt'));

    (window as unknown as Record<string, unknown>)['google'] = buildMockGoogle(mockIdClient);
    component.signInWithGoogle();

    expect(order).toEqual(['initialize', 'prompt']);
  });

  it('sets googleLoading to true', () => {
    (window as unknown as Record<string, unknown>)['google'] = buildMockGoogle(mockIdClient);

    component.signInWithGoogle();

    expect(component.googleLoading()).toBe(true);
    expect(mockIdClient.prompt).toHaveBeenCalled();
  });

  describe('credential callback', () => {
    let capturedCallback: (r: { credential: string }) => void;

    beforeEach(() => {
      mockIdClient.initialize.mockImplementation((cfg: { callback: typeof capturedCallback }) => {
        capturedCallback = cfg.callback;
      });
      (window as unknown as Record<string, unknown>)['google'] = buildMockGoogle(mockIdClient);
      component.signInWithGoogle();
    });

    it('calls authService.loginWithGoogle with the credential', () => {
      capturedCallback({ credential: 'google-id-token' });

      expect(mockAuthService.loginWithGoogle).toHaveBeenCalledWith('google-id-token');
    });

    it('resets googleLoading and starts loading while request is in flight', () => {
      const pending$ = new Subject<AuthResponse>();
      (mockAuthService.loginWithGoogle as jest.Mock).mockReturnValue(pending$);

      capturedCallback({ credential: 'google-id-token' });

      expect(component.googleLoading()).toBe(false);
      expect(component.loading()).toBe(true);

      pending$.complete();
    });

    it('navigates to /projects on success', fakeAsync(() => {
      capturedCallback({ credential: 'google-id-token' });
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/projects']);
    }));

    it('sets errorMessage and clears loading on auth failure', fakeAsync(() => {
      (mockAuthService.loginWithGoogle as jest.Mock).mockReturnValue(
        throwError(() => ({ message: 'Email already registered' })),
      );

      capturedCallback({ credential: 'bad-token' });
      tick();

      expect(component.errorMessage()).toBeTruthy();
      expect(component.loading()).toBe(false);
    }));
  });
});
