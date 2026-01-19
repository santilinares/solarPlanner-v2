import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '@environments/environment';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ForgotPasswordRequest,
} from '../models';

/**
 * JWT Token Payload structure
 */
interface JwtPayload {
  _id: string;
  role: 'user' | 'admin';
  exp: number;
  iat?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
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
      .post<AuthResponse>(`${this.authUrl}/register`, payload)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authUrl}/login`, credentials)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']).catch(() => {
      // Fallback to hard navigation if Angular routing fails
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
  resetPassword(token: string, newPassword: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.authUrl}/password/reset`, {
      token,
      newPassword,
    });
  }

  /**
   * Get current user profile (requires JWT)
   */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/me`);
  }

  /**
   * Refresh the access token using the refresh token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<AuthResponse>(`${this.authUrl}/refresh`, { refreshToken })
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
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
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);
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
