import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ApiResponse,
  EnergyPriceSuggestion,
  OptimalConfig,
  OptimalConfigRequest,
  PaginatedResponse,
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/projects`;

  /**
   * Create new project
   */
  createProject(data: ProjectCreateRequest): Observable<Project> {
    return this.http.post<ApiResponse<Project>>(this.apiUrl, data).pipe(
      map((response) => this.requireData(response))
    );
  }

  /**
   * Get all projects for current user
   */
  getMyProjects(page = 1, limit = 10): Observable<PaginatedResponse<Project>> {
    return this.http.get<ApiResponse<{ projects: Project[]; total: number }>>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      map((response) => {
        const data = this.requireData(response);
        return {
          data: data.projects,
          total: data.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(data.total / limit))
        };
      })
    );
  }

  /**
   * Calculate optimal installation configuration
   */
  calculateOptimalConfig(data: OptimalConfigRequest): Observable<OptimalConfig> {
    return this.http.post<ApiResponse<OptimalConfig>>(`${this.apiUrl}/new/config/optimal`, data).pipe(
      map((response) => this.requireData(response))
    );
  }

  /**
   * Suggest an editable energy price from ENTSO-E when configured
   */
  getEnergyPriceSuggestion(country = 'ES'): Observable<EnergyPriceSuggestion> {
    return this.http.get<ApiResponse<EnergyPriceSuggestion>>(`${this.apiUrl}/energy-price/entsoe`, {
      params: { country }
    }).pipe(
      map((response) => this.requireData(response))
    );
  }

  /**
   * Get all projects (admin only)
   */
  getAllProjects(page = 1, limit = 10): Observable<PaginatedResponse<Project>> {
    return this.http.get<ApiResponse<{ projects: Project[]; total: number }>>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      map((response) => {
        const data = this.requireData(response);
        return {
          data: data.projects,
          total: data.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(data.total / limit))
        };
      })
    );
  }

  /**
   * Get project by ID
   */
  getProjectById(id: string): Observable<Project> {
    return this.http.get<ApiResponse<Project>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => this.requireData(response))
    );
  }

  /**
   * Update project
   */
  updateProject(id: string, data: ProjectUpdateRequest): Observable<Project> {
    return this.http.put<ApiResponse<Project>>(`${this.apiUrl}/${id}`, data).pipe(
      map((response) => this.requireData(response))
    );
  }

  /**
   * Delete project
   */
  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get production data for project
   */
  getProductionData(id: string): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/${id}/production`);
  }

  /**
   * Generate PDF plan for project
   * TODO: Implement jsPDF generation logic
   */
  generatePDF(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  private requireData<T>(response: ApiResponse<T>): T {
    if (response.data === undefined) {
      throw new Error(response.error?.message || 'API response did not include data');
    }

    return response.data;
  }
}
