import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
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
  ProjectAnalytics,
  ElectricityPriceSuggestion,
} from '../models';

export interface ProjectFilters {
  owner?: string;
  search?: string;
  country?: string;
  projectType?: 'roof' | 'agrivoltaic';
  from?: string;
  to?: string;
}

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
  getMyProjects(page = 1, limit = 10, filters: ProjectFilters = {}): Observable<PaginatedResponse<Project>> {
    const params: Record<string, string> = { page: page.toString(), limit: limit.toString() };
    if (filters.search) params['search'] = filters.search;
    if (filters.country) params['country'] = filters.country;
    if (filters.projectType) params['projectType'] = filters.projectType;
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;
    return this.http.get<PaginatedResponse<Project>>(this.apiUrl, { params });
  }

  /**
   * Get project by ID
   */
  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update project configuration
   */
  updateProject(id: string, data: ProjectUpdateRequest): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete project
   */
  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Delete project as admin
   */
  deleteProjectAsAdmin(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/admin`);
  }

  /**
   * Get all projects (admin only)
   */
  getAllProjects(page = 1, limit = 10, filters: ProjectFilters = {}): Observable<PaginatedResponse<Project>> {
    const params: Record<string, string> = { page: page.toString(), limit: limit.toString() };
    if (filters.owner) params['owner'] = filters.owner;
    if (filters.search) params['search'] = filters.search;
    if (filters.country) params['country'] = filters.country;
    if (filters.projectType) params['projectType'] = filters.projectType;
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;
    return this.http.get<PaginatedResponse<Project>>(this.apiUrl, { params });
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
   * Get admin dashboard statistics (all users' projects)
   */
  getAdminDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/admin/dashboard`);
  }

  /**
   * Calculate optimal configuration from polygon
   */
  calculateOptimalConfig(data: OptimalConfigFromPolygonRequest): Observable<OptimalConfigResponse> {
    return this.http.post<OptimalConfigResponse>(`${this.apiUrl}/calculate`, data);
  }

  /**
   * Suggest a country-level electricity price from ENTSO-E.
   */
  getElectricityPriceSuggestion(countryCode: string): Observable<ElectricityPriceSuggestion> {
    return this.http
      .get<ElectricityPriceSuggestion>(`${this.apiUrl}/pricing/electricity`, {
        params: { countryCode },
      })
      .pipe(
        catchError(() =>
          of({
            price: null,
            currency: null,
            source: 'unavailable',
            countryCode,
          } satisfies ElectricityPriceSuggestion),
        ),
      );
  }

  /**
   * Get analytics metrics for a project (CF, PR, savings, 25-year projection)
   */
  getAnalytics(id: string): Observable<ProjectAnalytics> {
    return this.http.get<ProjectAnalytics>(`${this.apiUrl}/${id}/analytics`);
  }
}
