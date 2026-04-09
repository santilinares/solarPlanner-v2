import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { Panel, PanelCreateRequest, PanelUpdateRequest } from '../models';

export interface PanelListResponse {
  panels: Panel[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class PanelService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/panels`;

  /**
   * Get all panels
   */
  getAllPanels(page = 1, limit = 20): Observable<PanelListResponse> {
    return this.http.get<PanelListResponse>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }

  /**
   * Get all panels available to user
   */
  getPanels(): Observable<Panel[]> {
    return this.http.get<{ panels: Panel[] }>(this.apiUrl).pipe(map((response) => response.panels));
  }

  /**
   * Get panel by ID
   */
  getPanelById(id: string): Observable<Panel> {
    return this.http.get<Panel>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create panel (admin only)
   */
  createPanel(data: PanelCreateRequest): Observable<Panel> {
    return this.http.post<Panel>(this.apiUrl, data);
  }

  /**
   * Update panel (admin only)
   * TODO: Server doesn't have update endpoint yet
   */
  updatePanel(id: string, data: PanelUpdateRequest): Observable<Panel> {
    return this.http.put<Panel>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete panel (admin only)
   */
  deletePanel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Search/filter panels via GET query params
   */
  searchPanels(filters: { search?: string; technology?: string } = {}): Observable<PanelListResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params['search'] = filters.search;
    if (filters.technology) params['technology'] = filters.technology;
    return this.http.get<PanelListResponse>(this.apiUrl, { params });
  }
}
