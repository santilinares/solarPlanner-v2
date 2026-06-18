import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '@environments/environment';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserResponse,
  UserRole,
} from '../models';
import { LanguageService } from './language.service';

/**
 * JWT Token Payload structure
 */
interface JwtPayload {
  _id: string;
  role: 'user' | 'admin';
  exp: number;
  iat?: number;
}

interface ApiAuthResponse {
  token: string;
  user: UserResponse | User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);
  private readonly authUrl = `${environment.apiUrl}/auth`;
  private readonly usersUrl = `${environment.apiUrl}/users`;

  // Signals for reactive state
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor() {
    this.checkAuthStatus();
  }

  /**
   * Register a new user
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    const payload = {
      fullName: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      password: data.password,
    };
    return this.http
      .post<ApiAuthResponse>(`${this.authUrl}/register`, payload, { withCredentials: true })
      .pipe(map((response) => this.normalizeAuthResponse(response)))
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<ApiAuthResponse>(`${this.authUrl}/login`, credentials, { withCredentials: true })
      .pipe(map((response) => this.normalizeAuthResponse(response)))
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Login or register via Google OAuth
   */
  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.http
      .post<ApiAuthResponse>(`${this.authUrl}/google`, { idToken }, { withCredentials: true })
      .pipe(map((response) => this.normalizeAuthResponse(response)))
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Logout user — clears the HttpOnly cookie on server, then local state
   */
  logout(): void {
    this.http
      .post(`${this.authUrl}/logout`, {}, { withCredentials: true })
      .subscribe({ complete: () => this.clearLocalSession(), error: () => this.clearLocalSession() });
  }

  private clearLocalSession(): void {
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']).catch(() => {
      window.location.href = '/login';
    });
  }

  /**
   * Request password reset
   */
  forgotPassword(data: ForgotPasswordRequest): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.authUrl}/password/reset-request`, {
      email: data.email,
    });
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, data: ResetPasswordRequest): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.authUrl}/password/reset`, {
      token,
      newPassword: data.password,
    });
  }

  /**
   * Get current user profile (requires JWT)
   */
  getMe(): Observable<User> {
    return this.http
      .get<UserResponse | User>(`${this.usersUrl}/me`)
      .pipe(map((user) => this.normalizeUser(user)));
  }

  /**
   * Refresh the access token — refresh token is sent automatically via HttpOnly cookie
   */
  refreshToken(): Observable<AuthResponse> {
    return this.http
      .post<ApiAuthResponse>(`${this.authUrl}/refresh`, {}, { withCredentials: true })
      .pipe(map((response) => this.normalizeAuthResponse(response)))
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get decoded user from token (basic JWT decode)
   */
  getDecodedToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload)) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if user has admin role
   */
  isAdmin(): boolean {
    const decoded = this.getDecodedToken();
    return decoded !== null && decoded.role === 'admin';
  }

  /**
   * Handle successful authentication — refresh token arrives as HttpOnly cookie (not in body)
   */
  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
    this.currentUser.set(response.user);
    this.languageService.setLanguage(response.user.language ?? 'en');
    this.isAuthenticated.set(true);
  }

  private normalizeAuthResponse(response: ApiAuthResponse): AuthResponse {
    return { ...response, user: this.normalizeUser(response.user) };
  }

  private normalizeUser(user: UserResponse | User): User {
    if ('id' in user) {
      return {
        ...user,
        language: user.language ?? 'en',
        createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
      };
    }

    return {
      id: user._id,
      email: user.email ?? '',
      fullName: user.fullName,
      role: user.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
      language: user.language ?? 'en',
      isActive: true,
      createdAt: new Date(user.createdAt),
    };
  }

  /**
   * Check authentication status on init
   */
  private checkAuthStatus(): void {
    const token = this.getToken();

    if (token) {
      const decoded = this.getDecodedToken();

      // Token exists and is not expired
      if (decoded !== null && decoded.exp * 1000 > Date.now()) {
        this.isAuthenticated.set(true);

        // Hydrate current user from server (non-blocking background refresh)
        this.getMe()
          .pipe(
            catchError(() => {
              // Server profile fetch failed, token might be revoked or just network error
              // We stay authenticated on client based on JWT validity for now
              // and let the interceptor handle 401s if the token is actually invalid
              return of(null);
            })
          )
          .subscribe((user) => {
            if (user) {
              this.currentUser.set(user);
              this.languageService.setLanguage(user.language ?? 'en');
            }
          });
      } else {
        // Access token expired, we'll let the interceptor or guard handle refresh
        // For now, clear state if expired so UX is clean
        this.isAuthenticated.set(false);
      }
    }
  }
}
