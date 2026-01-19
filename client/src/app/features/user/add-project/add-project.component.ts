import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-draw';
import { ProjectService } from '@core/services/project.service';
import { PanelService } from '@core/services/panel.service';
import { Panel, OptimalConfigResponse, OptimalConfigFromPolygonRequest } from '@core/models';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-add-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="add-project-container">
      <header class="page-header">
        <h1>Create New Solar Project</h1>
        <p>Define the area and panel configuration to estimate production.</p>
      </header>

      <div class="main-content">
        <!-- MAP SECTION -->
        <section class="map-section">
          <div id="map" class="map-container"></div>
          <div class="map-instructions" *ngIf="!hasDrawnArea()">
            <p>ℹ️ Use the polygon tool on the left of the map to draw the roof area.</p>
          </div>
        </section>

        <!-- CONFIGURATION & RESULTS SECTION -->
        <aside class="sidebar">
          <form [formGroup]="projectForm" (ngSubmit)="onSubmit()" class="project-form">
            <!-- Project Details -->
            <div class="form-group">
              <label for="name">Project Name</label>
              <input id="name" type="text" formControlName="name" placeholder="My Home Solar" />
            </div>

            <div class="form-group">
              <label for="panel">Solar Panel</label>
              <select id="panel" formControlName="panelId">
                <option value="" disabled>Select a panel</option>
                @for (panel of panels(); track panel.id) {
                  <option [value]="panel.id">
                    {{ panel.brand }} {{ panel.model }} ({{ panel.wattPeak }}W)
                  </option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="tilt">Tilt Angle (degrees)</label>
              <input id="tilt" type="number" formControlName="tilt" min="0" max="90" />
            </div>

            <div class="form-group">
              <label for="direction">Direction</label>
              <select id="direction" formControlName="direction">
                <option value="south">South</option>
                <option value="southeast">South-East</option>
                <option value="southwest">South-West</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="north">North (Not Recommended)</option>
              </select>
            </div>

            <button
              type="button"
              class="btn-calculate"
              (click)="onCalculate()"
              [disabled]="!canCalculate()"
            >
              Estimate Production
            </button>

            <!-- ESTIMATION RESULTS -->
            @if (estimation(); as est) {
              <div class="results-card">
                <h3>Estimation Results</h3>
                <div class="result-item">
                  <span class="label">Recommended Panels:</span>
                  <span class="value">{{ est.recommendedPanels }}</span>
                </div>
                <div class="result-item">
                  <span class="label">Total Capacity:</span>
                  <span class="value">{{ est.estimatedCapacity | number: '1.1-2' }} kW</span>
                </div>
                <div class="result-item highlight">
                  <span class="label">Annual Production:</span>
                  <span class="value">{{ est.estimatedProduction | number: '1.0-0' }} kWh</span>
                </div>
                <div class="result-item">
                  <span class="label">Roof Coverage:</span>
                  <span class="value">{{ est.coverage | number: '1.0-1' }}%</span>
                </div>
              </div>
            }

            <div class="form-actions">
              <button
                type="submit"
                class="btn-primary"
                [disabled]="projectForm.invalid || !hasDrawnArea()"
              >
                Create Project
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      .add-project-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
      }

      .page-header {
        margin-bottom: 2rem;
        h1 {
          margin: 0;
          font-size: 2rem;
          color: #2c3e50;
        }
        p {
          color: #7f8c8d;
          margin-top: 0.5rem;
        }
      }

      .main-content {
        display: grid;
        grid-template-columns: 1fr 350px;
        gap: 2rem;
        height: 700px;
      }

      .map-section {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

        .map-container {
          height: 100%;
          width: 100%;
          z-index: 1;
        }

        .map-instructions {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.9);
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          font-weight: 500;
        }
      }

      .sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .project-form {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        label {
          font-weight: 600;
          color: #34495e;
          font-size: 0.9rem;
        }

        input,
        select {
          padding: 0.75rem;
          border: 1px solid #dfe6e9;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;

          &:focus {
            border-color: #3498db;
            outline: none;
          }
        }
      }

      .btn-calculate {
        background-color: #f1c40f;
        color: #2c3e50;
        border: none;
        padding: 0.75rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.5rem;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background-color: #f39c12;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .results-card {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 0.5rem;

        h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          color: #2c3e50;
          border-bottom: 2px solid #f1c40f;
          padding-bottom: 0.5rem;
          display: inline-block;
        }

        .result-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;

          &.highlight {
            font-weight: 700;
            color: #27ae60;
            font-size: 1.1rem;
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
            border-top: 1px dashed #ced4da;
            padding-top: 0.5rem;
          }

          .label {
            color: #636e72;
          }
          .value {
            color: #2d3436;
            font-weight: 500;
          }
        }
      }

      .btn-primary {
        background-color: #2ecc71;
        color: white;
        border: none;
        padding: 1rem;
        border-radius: 8px;
        font-weight: 700;
        font-size: 1.1rem;
        cursor: pointer;
        width: 100%;
        margin-top: 1rem;
        transition: background 0.2s;

        &:hover:not(:disabled) {
          background-color: #27ae60;
        }

        &:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
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
  drawnPolygonPoints = signal<{ lat: number; lon: number }[]>([]);
  hasDrawnArea = computed(() => this.drawnPolygonPoints().length >= 3);

  projectForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    panelId: ['', Validators.required],
    tilt: [30, [Validators.required, Validators.min(0), Validators.max(90)]],
    direction: ['south', Validators.required],
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
    // Default center (e.g., London or User's location if available)
    // Here defaulting to a neutral location
    this.map = L.map('map').setView([51.505, -0.09], 18);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

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
    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      this.drawnItems.clearLayers(); // Only allow one polygon
      this.drawnItems.addLayer(layer);
      this.updatePolygonPoints(layer);
    });

    this.map.on(L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        this.updatePolygonPoints(layer);
      });
    });

    this.map.on(L.Draw.Event.DELETED, () => {
      this.drawnPolygonPoints.set([]);
      this.estimation.set(null);
    });
  }

  updatePolygonPoints(layer: any) {
    if (layer instanceof L.Polygon) {
      // transform LatLng objects to plain objects
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      const points = latLngs.map((ll) => ({ lat: ll.lat, lon: ll.lng }));
      this.drawnPolygonPoints.set(points);
      // Reset estimation when area changes
      this.estimation.set(null);
    }
  }

  onCalculate() {
    if (!this.canCalculate()) return;

    const request: OptimalConfigFromPolygonRequest = {
      area: this.drawnPolygonPoints(),
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
    const projectData = {
      name: formValue.name,
      area: this.drawnPolygonPoints(),
      tilt: formValue.tilt,
      direction: formValue.direction,
      panelId: formValue.panelId,
      panelNumber: this.estimation()?.recommendedPanels || 0,
      // Default others
      coordinates: this.drawnPolygonPoints()[0], // Using first point as anchor
    };

    // Note: createProject expects specific schema.
    // We are mapping form + map data to ProjectCreateRequest-like structure.
    // The service expects ProjectCreateRequest which roughly matches our data but check keys.
    // Server expects: name, area, tilt, direction, panelNumber, panelId.

    this.projectService.createProject(projectData as any).subscribe({
      next: (res) => {
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
