import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Panel, PanelCreateRequest, PanelUpdateRequest, PaginatedResponse } from '../models';

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
    return this.http.get<PaginatedResponse<Panel>>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() }
    });
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
   * Search panels by criteria
   */
  searchPanels(criteria: Partial<Panel>): Observable<Panel[]> {
    return this.http.post<Panel[]>(`${this.apiUrl}/search`, criteria);
  }
}
