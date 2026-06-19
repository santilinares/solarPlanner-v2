import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { SupportedLanguage, User, UserResponse, UserListResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  /**
   * Get current user profile
   */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  /**
   * Update current user profile
   */
  updateProfile(userId: string, data: { fullName: string; language?: SupportedLanguage }): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/profile`, data);
  }

  /**
   * Change password
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${userId}/password`, {
      currentPassword,
      newPassword
    });
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers(): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(`${this.apiUrl}`);
  }

  /**
   * Update user role (admin only)
   */
  updateUserRole(id: string, role: 'user' | 'admin'): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.apiUrl}/${id}/role`, { role });
  }

  /**
   * Get user by ID (admin only)
   */
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
