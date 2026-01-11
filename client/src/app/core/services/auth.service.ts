import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ForgotPasswordRequest
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/users`;

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
    return this.http.post<AuthResponse>(`${this.apiUrl}/registration`, data).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => this.handleAuthSuccess(response))
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  /**
   * Request password reset
   */
  forgotPassword(data: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot_password`, data);
  }

  /**
   * Reset password with token
   */
  resetPassword(id: string, token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/reset_password/${id}/${token}`,
      { password }
    );
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get decoded user from token (basic JWT decode)
   */
  getDecodedToken(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  /**
   * Check if user has admin role
   */
  isAdmin(): boolean {
    const decoded = this.getDecodedToken();
    return decoded?.role === 'admin';
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
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
      if (decoded && decoded.exp * 1000 > Date.now()) {
        this.isAuthenticated.set(true);
        // TODO: Fetch full user profile if needed
      } else {
        this.logout();
      }
    }
  }
}
