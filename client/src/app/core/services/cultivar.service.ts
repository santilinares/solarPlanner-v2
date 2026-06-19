import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Cultivar, CultivarListResponse } from '../models/cultivar.model';

@Injectable({
  providedIn: 'root',
})
export class CultivarService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cultivars`;

  /**
   * Get all cultivars (paginated)
   */
  getAllCultivars(page = 1, limit = 100): Observable<CultivarListResponse> {
    return this.http.get<CultivarListResponse>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }

  /**
   * Get cultivar by ID
   */
  getCultivarById(id: string): Observable<Cultivar> {
    return this.http.get<Cultivar>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get cultivars filtered by category
   */
  getCultivarsByCategory(category: string): Observable<CultivarListResponse> {
    return this.http.get<CultivarListResponse>(this.apiUrl, {
      params: { category },
    });
  }
}
