import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  input,
  output,
  effect,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw';
import { Coordinates } from '@core/models';

// Fix Leaflet's broken default icon paths when bundled with esbuild/webpack
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

/**
 * Shared Leaflet map component.
 *
 * - Read-only mode (default): displays a marker and optional polygon.
 * - Editable mode ([editable]="true"): adds Leaflet Draw controls and emits
 *   (polygonChange) whenever the user creates, edits, or deletes a polygon.
 *
 * Used by both ViewProjectComponent (read-only) and AddProjectComponent (editable).
 */
@Component({
  selector: 'app-location-map',
  template: `<div #mapContainer class="location-map-container"></div>`,
  styles: [
    `
      app-location-map {
        display: block;
        height: 100%;
      }
      .location-map-container {
        height: 100%;
        width: 100%;
        border-radius: 12px;
        overflow: hidden;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LocationMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // --- Read-only inputs ---
  /** Center latitude. Required in read-only mode; ignored in editable+centerOnUser mode. */
  lat = input<number>(0);
  /** Center longitude. Required in read-only mode; ignored in editable+centerOnUser mode. */
  lng = input<number>(0);
  /** Polygon to render on the map (read-only display or pre-populated editable area). */
  polygon = input<Coordinates[]>([]);
  /** Initial zoom level. */
  zoom = input<number>(16);

  // --- Editable mode inputs ---
  /** Enable Leaflet Draw controls so the user can draw a polygon. */
  editable = input<boolean>(false);
  /** When true, the map will try to geolocate the user and centre on their position. */
  centerOnUser = input<boolean>(false);
  /** Set this to fly the map to a new location programmatically (e.g. after an address search). */
  center = input<Coordinates | null>(null);

  // --- Outputs ---
  /** Emits the drawn polygon coordinates whenever they change (create / edit / delete). */
  polygonChange = output<Coordinates[]>();
  /** Emits the user's current coordinates when geolocation succeeds. */
  userLocationFound = output<Coordinates>();

  private map?: L.Map;
  private drawnItems = new L.FeatureGroup();
  private searchMarker?: L.Marker;
  private resizeObserver?: ResizeObserver;
  private invalidateTimers: number[] = [];

  constructor() {
    // React to external center changes (e.g. address search) after the map is ready
    effect(() => {
      const c = this.center();
      if (c && this.map) {
        this.invalidateMapSize();
        this.map.flyTo([c.lat, c.lng], this.zoom());
        // Replace previous search marker
        this.searchMarker?.remove();
        this.searchMarker = L.marker([c.lat, c.lng])
          .addTo(this.map)
          .bindPopup('Selected location')
          .openPopup();
      }
    });
  }

  ngAfterViewInit(): void {
    // setTimeout ensures the host element is fully rendered before Leaflet measures it
    setTimeout(() => this.initMap(), 0);
  }

  private initMap(): void {
    const lat = this.lat();
    const lng = this.lng();

    this.map = L.map(this.mapContainer.nativeElement).setView([lat, lng], this.zoom());

    this.setupTileLayers();
    this.map.addLayer(this.drawnItems);

    if (this.editable()) {
      this.setupDrawControls();
    }

    if (this.centerOnUser()) {
      this.setupUserLocation();
    }

    // Render read-only elements only in non-editable mode
    if (!this.editable()) {
      L.marker([lat, lng]).addTo(this.map).bindPopup('Project location').openPopup();
    }

    // Pre-populate polygon (works in both modes)
    const coords = this.polygon();
    if (coords.length >= 3) {
      const latLngs = coords.map((c) => [c.lat, c.lng] as L.LatLngTuple);
      const poly = L.polygon(latLngs, { color: '#f1c40f', weight: 2, fillOpacity: 0.15 });
      this.drawnItems.addLayer(poly);
      this.map.fitBounds(poly.getBounds(), { padding: [40, 40] });
    }

    this.setupResizeObserver();
    this.scheduleInitialInvalidate();
  }

  private setupResizeObserver(): void {
    const host = this.mapContainer.nativeElement;
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.invalidateMapSize();
    });

    this.resizeObserver.observe(host);
    if (host.parentElement) {
      this.resizeObserver.observe(host.parentElement);
    }
  }

  private scheduleInitialInvalidate(): void {
    this.invalidateMapSize();

    const shortTimer = window.setTimeout(() => this.invalidateMapSize(), 120);
    const longTimer = window.setTimeout(() => this.invalidateMapSize(), 350);
    this.invalidateTimers.push(shortTimer, longTimer);
  }

  private invalidateMapSize(): void {
    if (!this.map) return;

    requestAnimationFrame(() => {
      this.map?.invalidateSize({ pan: false, debounceMoveend: true });
    });
  }

  private setupTileLayers(): void {
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    });
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: '© Esri, Maxar, Earthstar Geographics' },
    );
    const topo = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: '© Esri, HERE, Garmin, USGS, NGA' },
    );

    satellite.addTo(this.map!);
    L.control.layers({ Street: street, Satellite: satellite, Topographic: topo }).addTo(this.map!);
  }

  private setupDrawControls(): void {
    const drawControl = new L.Control.Draw({
      draw: {
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false,
        rectangle: false,
        polygon: {
          allowIntersection: false,
          drawError: { color: '#e1e100', message: "<strong>Oh snap!</strong> you can't draw that!" },
          shapeOptions: { color: '#f1c40f' },
        },
      },
      edit: { featureGroup: this.drawnItems, remove: true },
    });
    this.map!.addControl(drawControl);

    this.map!.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const layer = (e as L.DrawEvents.Created).layer;
      this.drawnItems.clearLayers(); // One polygon at a time
      this.drawnItems.addLayer(layer);
      this.emitPolygon(layer);
    });

    this.map!.on(L.Draw.Event.EDITED, (e: L.LeafletEvent) => {
      (e as L.DrawEvents.Edited).layers.eachLayer((layer: L.Layer) => this.emitPolygon(layer));
    });

    this.map!.on(L.Draw.Event.DELETED, () => this.polygonChange.emit([]));
  }

  private setupUserLocation(): void {
    this.map!.locate({ setView: true, maxZoom: 18 });
    this.map!.on('locationfound', (e: L.LocationEvent) => {
      L.marker(e.latlng).addTo(this.map!).bindPopup('You are here').openPopup();
      this.userLocationFound.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    this.map!.on('locationerror', (e: L.ErrorEvent) => {
      console.warn('Location unavailable:', e.message);
    });
  }

  private emitPolygon(layer: L.Layer): void {
    if (layer instanceof L.Polygon) {
      const points = (layer.getLatLngs()[0] as L.LatLng[]).map((ll) => ({
        lat: ll.lat,
        lng: ll.lng,
      }));
      this.polygonChange.emit(points);
    }
  }

  ngOnDestroy(): void {
    for (const timer of this.invalidateTimers) {
      window.clearTimeout(timer);
    }
    this.resizeObserver?.disconnect();
    this.searchMarker?.remove();
    this.map?.remove();
  }
}
