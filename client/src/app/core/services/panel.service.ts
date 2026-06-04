import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, Panel, PanelCreateRequest, PanelUpdateRequest, PaginatedResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class PanelService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/panels`;

  /**
   * Get all panels
   */
  getAllPanels(page = 1, limit = 20): Observable<PaginatedResponse<Panel>> {
    return this.http.get<ApiResponse<{ panels: Panel[]; total: number }>>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      map((response) => {
        const data = this.requireData(response);
        return {
          data: data.panels,
          total: data.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(data.total / limit))
        };
      })
    );
  }

  /**
   * Get panel by ID
   */
  getPanelById(id: string): Observable<Panel> {
    return this.http.get<ApiResponse<Panel>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => this.requireData(response))
    );
  }

  /**
   * Create panel (admin only)
   */
  createPanel(data: PanelCreateRequest): Observable<Panel> {
    return this.http.post<ApiResponse<Panel>>(this.apiUrl, data).pipe(
      map((response) => this.requireData(response))
    );
  }

  /**
   * Update panel (admin only)
   */
  updatePanel(id: string, data: PanelUpdateRequest): Observable<Panel> {
    return this.http.put<ApiResponse<Panel>>(`${this.apiUrl}/${id}`, data).pipe(
      map((response) => this.requireData(response))
    );
  }

  /**
   * Delete panel (admin only)
   */
  deletePanel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Search panels by criteria
   */
  searchPanels(criteria: Partial<Panel>): Observable<Panel[]> {
    return this.http.post<ApiResponse<{ panels: Panel[] }>>(`${this.apiUrl}/search`, criteria).pipe(
      map((response) => this.requireData(response).panels)
    );
  }

  private requireData<T>(response: ApiResponse<T>): T {
    if (response.data === undefined) {
      throw new Error(response.error?.message || 'API response did not include data');
    }

    return response.data;
  }
}
