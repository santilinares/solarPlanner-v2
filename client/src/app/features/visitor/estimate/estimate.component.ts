import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DividerModule } from 'primeng/divider';

import { LocationMapComponent } from '@shared/components/location-map/location-map.component';
import { Coordinates } from '@core/models';
import { LanguageService } from '@core/services/language.service';
import { environment } from '@environments/environment';

interface EstimateResult {
  panelCount: number;
  areaSqm: number;
  estimatedKwp: number;
}

@Component({
  selector: 'app-estimate',
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DecimalPipe,
    RouterLink,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    DividerModule,
    LocationMapComponent,
  ],
})
export class EstimateComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly i18n = inject(LanguageService);

  // ── Location ─────────────────────────────────────
  addressQuery = signal('');
  isSearching = signal(false);
  isLocating = signal(false);
  searchError = signal<string | null>(null);
  mapCenter = signal<Coordinates | null>(null);
  addressResult = signal('');
  addressLat = signal(0);
  addressLng = signal(0);

  // ── Polygon ───────────────────────────────────────
  drawnPolygonPoints = signal<Coordinates[]>([]);
  hasDrawnArea = computed(() => this.drawnPolygonPoints().length >= 3);

  // ── Result ────────────────────────────────────────
  result = signal<EstimateResult | null>(null);
  isCalculating = signal(false);
  estimateError = signal<string | null>(null);

  // ── Map interactions ─────────────────────────────
  onPolygonChange(coords: Coordinates[]): void {
    this.drawnPolygonPoints.set(coords);
    this.result.set(null);
    this.estimateError.set(null);
  }

  onUserLocationFound(coords: Coordinates): void {
    this.applyLocation(coords.lat, coords.lng, this.i18n.t('estimate.currentLocation'));
    this.reverseGeocode(coords.lat, coords.lng);
  }

  // ── Address search ────────────────────────────────
  searchAddress(): void {
    const query = this.addressQuery().trim();
    if (!query) return;
    this.isSearching.set(true);
    this.searchError.set(null);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    this.http
      .get<Array<{ lat: string; lon: string; display_name?: string }>> (url)
      .subscribe({
        next: (results) => {
          this.isSearching.set(false);
          if (!results.length) {
            this.searchError.set(this.i18n.t('estimate.locationNotFound'));
            return;
          }
          const r = results[0];
          this.applyLocation(parseFloat(r.lat), parseFloat(r.lon), r.display_name ?? query);
        },
        error: () => {
          this.isSearching.set(false);
          this.searchError.set(this.i18n.t('estimate.searchFailed'));
        },
      });
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.searchError.set(this.i18n.t('estimate.geoUnsupported'));
      return;
    }
    this.isLocating.set(true);
    this.searchError.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating.set(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.applyLocation(lat, lng, this.i18n.t('estimate.currentLocation'));
        this.reverseGeocode(lat, lng);
      },
      () => {
        this.isLocating.set(false);
        this.searchError.set(this.i18n.t('estimate.geoDenied'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  private applyLocation(lat: number, lng: number, label: string): void {
    this.mapCenter.set({ lat, lng });
    this.addressLat.set(lat);
    this.addressLng.set(lng);
    this.addressResult.set(label);
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=json`;
    this.http
      .get<{ display_name?: string }>(url)
      .subscribe({
        next: (res) => this.addressResult.set(res.display_name ?? this.i18n.t('estimate.currentLocation')),
        error: () => {},
      });
  }

  // ── Estimate ──────────────────────────────────────
  onCalculate(): void {
    if (!this.hasDrawnArea() || this.isCalculating()) return;
    this.isCalculating.set(true);
    this.estimateError.set(null);

    const area = this.drawnPolygonPoints().map((c) => ({ lat: c.lat, lon: c.lng }));
    this.http
      .post<EstimateResult>(`${environment.apiUrl}/projects/estimate`, { area })
      .subscribe({
        next: (res) => {
          this.isCalculating.set(false);
          this.result.set(res);
        },
        error: () => {
          this.isCalculating.set(false);
          this.estimateError.set(this.i18n.t('estimate.calculateFailed'));
        },
      });
  }

  onGetStarted(): void {
    void this.router.navigate(['/registration']);
  }
}
