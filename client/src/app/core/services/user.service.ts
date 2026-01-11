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
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`);
  }

  /**
   * Update current user profile
   */
  updateProfile(data: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, data);
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
   * Update user (admin only)
   */
  updateUser(id: string, data: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Toggle user active status (admin only)
   */
  toggleUserStatus(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}
