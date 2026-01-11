import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Project, ProjectCreateRequest, ProjectUpdateRequest, PaginatedResponse } from '../models';

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
    return this.http.post<Project>(this.apiUrl, data);
  }

  /**
   * Get all projects for current user
   */
  getMyProjects(page = 1, limit = 10): Observable<PaginatedResponse<Project>> {
    return this.http.get<PaginatedResponse<Project>>(`${this.apiUrl}/my`, {
      params: { page: page.toString(), limit: limit.toString() }
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
   * Get all projects (admin only)
   */
  getAllProjects(page = 1, limit = 10): Observable<PaginatedResponse<Project>> {
    return this.http.get<PaginatedResponse<Project>>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  /**
   * Get production data for project
   */
  getProductionData(id: string): Observable<any> {
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
}
