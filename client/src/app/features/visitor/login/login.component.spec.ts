import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { LoginComponent } from './login.component';
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

describe('LoginComponent – signInWithGoogle', () => {
  let component: LoginComponent;
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
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginComponent);
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

    it('navigates to returnUrl on success', fakeAsync(() => {
      capturedCallback({ credential: 'google-id-token' });
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/projects']);
    }));

    it('sets errorMessage and clears loading on auth failure', fakeAsync(() => {
      (mockAuthService.loginWithGoogle as jest.Mock).mockReturnValue(
        throwError(() => ({ message: 'Invalid token' })),
      );

      capturedCallback({ credential: 'bad-token' });
      tick();

      expect(component.errorMessage()).toBeTruthy();
      expect(component.loading()).toBe(false);
    }));
  });
});

describe('LoginComponent – onSubmit', () => {
  let component: LoginComponent;
  let router: Router;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn().mockReturnValue(of(STUB_RESPONSE)),
      isAuthenticated: signal(false),
      currentUser: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does nothing when form is invalid', () => {
    component.onSubmit();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('sets loading to true and clears errorMessage while request is in flight', () => {
    component.errorMessage.set('previous error');
    component.loginForm.setValue({ email: 'user@test.com', password: 'pass' });

    const pending$ = new Subject<AuthResponse>();
    (mockAuthService.login as jest.Mock).mockReturnValue(pending$);

    component.onSubmit();

    expect(component.loading()).toBe(true);
    expect(component.errorMessage()).toBe('');
    pending$.complete();
  });

  it('calls authService.login with form values', () => {
    component.loginForm.setValue({ email: 'user@test.com', password: 'secret' });
    component.onSubmit();
    expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'user@test.com', password: 'secret' });
  });

  it('navigates to /projects on success', fakeAsync(() => {
    component.loginForm.setValue({ email: 'user@test.com', password: 'secret' });
    component.onSubmit();
    tick();
    expect(router.navigate).toHaveBeenCalledWith(['/projects']);
  }));

  it('sets errorMessage and clears loading on error', fakeAsync(() => {
    (mockAuthService.login as jest.Mock).mockReturnValue(
      throwError(() => ({ message: 'Invalid credentials' })),
    );
    component.loginForm.setValue({ email: 'user@test.com', password: 'wrong' });
    component.onSubmit();
    tick();
    expect(component.errorMessage()).toBeTruthy();
    expect(component.loading()).toBe(false);
  }));
});

describe('LoginComponent – form validation', () => {
  let component: LoginComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: signal(false), currentUser: signal(null) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('is invalid with empty fields', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('marks email invalid when malformed', () => {
    component.loginForm.setValue({ email: 'not-an-email', password: 'pass' });
    expect(component.loginForm.get('email')?.valid).toBe(false);
  });

  it('is valid with a correct email and non-empty password', () => {
    component.loginForm.setValue({ email: 'user@test.com', password: 'pass' });
    expect(component.loginForm.valid).toBe(true);
  });
});
