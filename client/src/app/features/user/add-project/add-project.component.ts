import { Component, computed, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-draw';
import { ProjectService } from '@core/services/project.service';
import { PanelService } from '@core/services/panel.service';
import {
  Panel,
  OptimalConfigResponse,
  OptimalConfigFromPolygonRequest,
  ProjectCreateRequest,
  Coordinates,
} from '@core/models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-add-project',
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    <section class="create-project-page animate-fade-in-up">
      <header class="page-header">
        <div>
          <h1>Create New Project</h1>
          <p>Define installation area and panel setup to estimate production.</p>
        </div>
      </header>

      <div class="content-layout">
        <section class="map-card">
          <h2>Installation Area</h2>
          <div id="map" class="map-container"></div>
          @if (!hasDrawnArea()) {
            <div class="map-instructions" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
              <i class="pi pi-info-circle"></i>
              <span>Use polygon draw tool to define your roof or field area.</span>
            </div>
          }
        </section>

        <aside class="sidebar">
          <form [formGroup]="projectForm" (ngSubmit)="onSubmit()" class="form-card">
            <h2>Project Configuration</h2>

            <div class="form-group">
              <label for="name">Project Name</label>
              <input id="name" type="text" formControlName="name" placeholder="My Home Solar" />
            </div>

            <div class="form-group">
              <label for="panel">Solar Panel</label>
              <select id="panel" formControlName="panelId">
                <option value="" disabled>Select a panel</option>
                @for (panel of panels(); track panel.id || panel._id) {
                  <option [value]="panel.id || panel._id">
                    {{ panel.brand }} {{ panel.model }} ({{ panel.wattPeak }}W)
                  </option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="tilt">Inclination</label>
              <input id="tilt" type="number" formControlName="tilt" min="0" max="90" />
            </div>

            <div class="form-group">
              <label for="orientation">Orientation</label>
              <select id="orientation" formControlName="orientation">
                <option value="south">South</option>
                <option value="southeast">South-East</option>
                <option value="southwest">South-West</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="north">North</option>
              </select>
            </div>

            <button
              type="button"
              class="btn-secondary"
              (click)="onCalculate()"
              [disabled]="!canCalculate()"
            >
              <i class="pi pi-bolt"></i>
              Estimate Production
            </button>

            @if (estimation(); as est) {
              <div class="results-card" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
                <h3>Estimation Results</h3>
                <div class="result-item">
                  <span>Recommended Panels</span>
                  <strong>{{ est.recommendedPanels }}</strong>
                </div>
                <div class="result-item">
                  <span>Total Capacity</span>
                  <strong>{{ est.estimatedCapacity | number: '1.1-2' }} kW</strong>
                </div>
                <div class="result-item highlight">
                  <span>Annual Production</span>
                  <strong>{{ est.estimatedProduction | number: '1.0-0' }} kWh</strong>
                </div>
                <div class="result-item">
                  <span>Roof Coverage</span>
                  <strong>{{ est.coverage | number: '1.0-1' }}%</strong>
                </div>
              </div>
            }

            <button
              type="submit"
              class="btn-primary"
              [disabled]="projectForm.invalid || !hasDrawnArea()"
            >
              <i class="pi pi-plus"></i>
              Create Project
            </button>
          </form>
        </aside>
      </div>
    </section>
  `,
  styles: [
    `
      .create-project-page {
        max-width: 1280px;
        margin: 0 auto;
        padding: 1.5rem;
      }

      .page-header {
        margin-bottom: 2rem;

        h1 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 2.5rem);
          color: #081c15;
          font-weight: 800;
        }

        p {
          color: #1b4332;
          margin-top: 0.5rem;
        }
      }

      .content-layout {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
        align-items: start;
      }

      .map-card,
      .form-card {
        background: #ffffff;
        border: 2px solid #b7e4c7;
        border-radius: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        padding: 1.5rem;
      }

      .map-card {
        position: relative;

        h2 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
          color: #081c15;
        }

        .map-container {
          height: 650px;
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          z-index: 1;
        }

        .map-instructions {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.9);
          padding: 0.75rem 1rem;
          border-radius: 50px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          font-weight: 500;
          color: #1b4332;
          display: inline-flex;
          gap: 0.5rem;
          align-items: center;
        }
      }

      .form-card {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        h2 {
          margin: 0 0 0.5rem;
          font-size: 1.25rem;
          color: #081c15;
        }
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        label {
          font-weight: 600;
          color: #1b4332;
          font-size: 0.9rem;
        }

        input,
        select {
          padding: 0.75rem;
          border: 1px solid #b7e4c7;
          border-radius: 12px;
          font-size: 1rem;
          color: #081c15;
          transition: border-color 0.2s, box-shadow 0.2s;

          &:focus {
            border-color: #2d6a4f;
            box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.15);
            outline: none;
          }
        }
      }

      .btn-secondary,
      .btn-primary {
        border: none;
        padding: 0.75rem;
        border-radius: 24px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.25rem;
        transition: all 0.25s ease;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
      }

      .btn-secondary {
        background-color: #ffd600;
        color: #000000;

        &:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(255, 214, 0, 0.35);
          transform: translateY(-2px);
        }
      }

      .btn-primary {
        background-color: #2d6a4f;
        color: #ffffff;

        &:hover:not(:disabled) {
          background-color: #1b4332;
          transform: translateY(-2px);
        }
      }

      .btn-secondary,
      .btn-primary {
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      }

      .results-card {
        background: #f0f7f4;
        border: 1px solid #b7e4c7;
        border-radius: 16px;
        padding: 1rem;

        h3 {
          margin: 0 0 0.75rem;
          font-size: 1.1rem;
          color: #081c15;
        }

        .result-item {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.6rem;
          font-size: 0.95rem;
          color: #1b4332;

          &.highlight {
            font-weight: 700;
            color: #2d6a4f;
            margin-top: 0.5rem;
            border-top: 1px dashed #b7e4c7;
            padding-top: 0.5rem;
          }

          strong {
            color: #081c15;
            text-align: right;
          }
        }
      }

      @media (max-width: 1024px) {
        .content-layout {
          grid-template-columns: 1fr;
        }

        .map-card .map-container {
          height: 460px;
        }
      }

      @media (max-width: 768px) {
        .create-project-page {
          padding: 1rem;
        }

        .map-card .map-container {
          height: 360px;
        }
      }
    `,
  ],
  // Important for Leaflet CSS to work if not global
  encapsulation: ViewEncapsulation.None,
})
export class AddProjectComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private panelService = inject(PanelService);

  // Signals
  panels = signal<Panel[]>([]);
  estimation = signal<OptimalConfigResponse | null>(null);

  // Map State
  map!: L.Map;
  drawnItems = new L.FeatureGroup();
  drawnPolygonPoints = signal<Coordinates[]>([]);
  hasDrawnArea = computed(() => this.drawnPolygonPoints().length >= 3);

  projectForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    panelId: ['', Validators.required],
    tilt: [30, [Validators.required, Validators.min(0), Validators.max(90)]],
    orientation: ['south', Validators.required],
  });

  canCalculate = computed(() => {
    return (
      this.hasDrawnArea() &&
      this.projectForm.get('panelId')?.valid &&
      this.projectForm.get('tilt')?.valid
    );
  });

  ngOnInit() {
    this.loadPanels();
    // Initialize map after view init (using setTimeout to ensure DOM is ready)
    setTimeout(() => this.initMap(), 0);
  }

  loadPanels() {
    this.panelService.getAllPanels(1, 100).subscribe({
      next: (res) => {
        if (res.data) {
          this.panels.set(res.data);
        }
      },
      error: (err) => console.error('Failed to load panels', err),
    });
  }

  initMap() {
    // Initialize map with default center (Madrid)
    this.map = L.map('map').setView([40.4168, -3.7038], 18);

    // Setup map layers and controls
    this.setupMapLayers();

    // Setup user geolocation
    this.setupUserLocation();

    this.map.addLayer(this.drawnItems);

    // Initialize Draw Control
    const drawControl = new L.Control.Draw({
      draw: {
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false,
        rectangle: false, // Force polygon for irregular roofs
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: "<strong>Oh snap!<strong> you can't draw that!",
          },
          shapeOptions: {
            color: '#f1c40f',
          },
        },
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
      },
    });

    this.map.addControl(drawControl);

    // Event handlers
    this.map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const drawEvent = e as L.DrawEvents.Created;
      const layer = drawEvent.layer;
      this.drawnItems.clearLayers(); // Only allow one polygon
      this.drawnItems.addLayer(layer);
      this.updatePolygonPoints(layer);
    });

    this.map.on(L.Draw.Event.EDITED, (e: L.LeafletEvent) => {
      const drawEvent = e as L.DrawEvents.Edited;
      const layers = drawEvent.layers;
      layers.eachLayer((layer: L.Layer) => {
        this.updatePolygonPoints(layer);
      });
    });

    this.map.on(L.Draw.Event.DELETED, () => {
      this.drawnPolygonPoints.set([]);
      this.estimation.set(null);
    });
  }

  updatePolygonPoints(layer: L.Layer): void {
    if (layer instanceof L.Polygon) {
      // transform LatLng objects to plain objects
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      const points = latLngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
      this.drawnPolygonPoints.set(points);
      // Reset estimation when area changes
      this.estimation.set(null);
    }
  }

  setupMapLayers() {
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    });

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: '© Esri, Maxar, Earthstar Geographics',
      }
    );

    const topoLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: '© Esri, HERE, Garmin, USGS, NGA',
      }
    );

    // Add default layer (street)
    satelliteLayer.addTo(this.map);

    // Create layer control
    const baseMaps = {
      Street: streetLayer,
      Satellite: satelliteLayer,
      Topographic: topoLayer,
    };

    L.control.layers(baseMaps).addTo(this.map);
  }

  setupUserLocation() {
    // Request user's location and center map on it
    this.map.locate({ setView: true, maxZoom: 18 });

    // Handle successful location
    this.map.on('locationfound', (locationEvent: L.LocationEvent) => {
      // Add a marker at user's location
      L.marker(locationEvent.latlng).addTo(this.map).bindPopup('You are here').openPopup();
    });

    // Handle location error (permission denied or unavailable)
    this.map.on('locationerror', (locationErrorEvent: L.ErrorEvent) => {
      console.warn('Location access denied or unavailable:', locationErrorEvent.message);
      // Map stays at default location (Madrid)
    });
  }

  onCalculate() {
    if (!this.canCalculate()) return;

    const request: OptimalConfigFromPolygonRequest = {
      coordinates: this.drawnPolygonPoints(),
      panelId: this.projectForm.get('panelId')?.value,
      tilt: this.projectForm.get('tilt')?.value,
    };

    this.projectService.calculateOptimalConfig(request).subscribe({
      next: (res) => this.estimation.set(res),
      error: (err) => {
        console.error('Estimation failed', err);
        alert('Could not calculate estimation. Please check your inputs.');
      },
    });
  }

  onSubmit() {
    if (this.projectForm.invalid || !this.hasDrawnArea()) return;

    const formValue = this.projectForm.value;
    const projectData: ProjectCreateRequest = {
      name: formValue.name,
      address: this.drawnPolygonPoints()[0],
      tilt: formValue.tilt,
      polygon: this.drawnPolygonPoints(),
      orientation: formValue.orientation,
      panelId: formValue.panelId,
    };

    // Note: createProject expects specific schema.
    // We are mapping form + map data to ProjectCreateRequest-like structure.
    // The service expects ProjectCreateRequest which roughly matches our data but check keys.
    // Server expects: name, area, tilt, direction, panelNumber, panelId.

    this.projectService.createProject(projectData).subscribe({
      next: () => {
        alert('Project created successfully!');
        // Navigate away or reset
      },
      error: (err) => {
        console.error('Creation failed', err);
        alert('Failed to create project.');
      },
    });
  }
}
