import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  PaginatedResponse,
  SunPathData,
  PlanData,
  DashboardStats,
  OptimalConfigResponse,
  OptimalConfigFromPolygonRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/projects`;

  /**
   * Create new project
   */
  createProject(data: ProjectCreateRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, data);
  }

  /**
   * Get all projects for current user
   */
  getMyProjects(page = 1, limit = 10): Observable<PaginatedResponse<Project>> {
    return this.http.get<PaginatedResponse<Project>>(`${this.apiUrl}/my`, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }

  /**
   * Get project by ID
   */
  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update project
   * TODO: Server doesn't have update endpoint yet
   */
  updateProject(id: string, data: ProjectUpdateRequest): Observable<Project> {
    console.warn('Project update not implemented on server');
    return this.http.put<Project>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete project
   */
  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get all projects (admin only)
   */
  getAllProjects(page = 1, limit = 10): Observable<PaginatedResponse<Project>> {
    return this.http.get<PaginatedResponse<Project>>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }

  /**
   * Get project plan data
   */
  getPlanData(id: string): Observable<PlanData> {
    return this.http.get<PlanData>(`${this.apiUrl}/${id}/plan`);
  }

  /**
   * Get sun path data for project
   */
  getSunPath(id: string): Observable<SunPathData> {
    return this.http.get<SunPathData>(`${this.apiUrl}/${id}/sun-path`);
  }

  /**
   * Get dashboard statistics for current user
   */
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Calculate optimal configuration from polygon
   */
  calculateOptimalConfig(data: OptimalConfigFromPolygonRequest): Observable<OptimalConfigResponse> {
    return this.http.post<OptimalConfigResponse>(`${this.apiUrl}/calculate`, data);
  }
}
