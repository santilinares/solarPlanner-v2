import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { User, PaginatedResponse } from '../models';

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
  updateProfile(userId: string, data: { fullName: string }): Observable<User> {
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
  getAllUsers(page = 1, limit = 10): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
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
