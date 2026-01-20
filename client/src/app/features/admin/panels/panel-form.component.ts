import { Component, inject, signal, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PanelService } from '@core/services/panel.service';
import { Panel, PanelCreateRequest } from '@core/models/panel.model';

@Component({
  selector: 'app-panel-form',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ isEditMode() ? 'Edit Panel' : 'Add New Panel' }}</h2>
          <button class="close-btn" (click)="onCancel()">×</button>
        </div>

        <form [formGroup]="panelForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="brand">Brand</label>
            <input id="brand" type="text" formControlName="brand" placeholder="e.g. SunPower" />
            @if (panelForm.get('brand')?.touched && panelForm.get('brand')?.errors?.['required']) {
              <small class="error">Brand is required</small>
            }
          </div>

          <div class="form-group">
            <label for="model">Model</label>
            <input id="model" type="text" formControlName="model" placeholder="e.g. Maxeon 6" />
            @if (panelForm.get('model')?.touched && panelForm.get('model')?.errors?.['required']) {
              <small class="error">Model is required</small>
            }
          </div>

          <div class="row">
            <div class="form-group">
              <label for="wattPeak">Power (W)</label>
              <input id="wattPeak" type="number" formControlName="wattPeak" placeholder="400" />
              @if (
                panelForm.get('wattPeak')?.touched && panelForm.get('wattPeak')?.errors?.['min']
              ) {
                <small class="error">Must be positive</small>
              }
            </div>

            <div class="form-group">
              <label for="efficiency">Efficiency (%)</label>
              <input
                id="efficiency"
                type="number"
                formControlName="efficiency"
                placeholder="22.5"
              />
            </div>
          </div>

          <div class="row">
            <div class="form-group">
              <label for="price">Price ($)</label>
              <input id="price" type="number" formControlName="price" placeholder="300" />
            </div>

            <div class="form-group">
              <label for="warranty">Warranty (Years)</label>
              <input id="warranty" type="number" formControlName="warranty" placeholder="25" />
            </div>
          </div>

          <div class="form-group" formGroupName="dimensions">
            <label>Dimensions (mm)</label>
            <div class="row">
              <input type="number" formControlName="width" placeholder="Width" />
              <input type="number" formControlName="height" placeholder="Height" />
            </div>
          </div>

          <div class="form-group">
            <label for="temperatureCoefficient">Temp. Coefficient (%/°C)</label>
            <input
              id="temperatureCoefficient"
              type="number"
              formControlName="temperatureCoefficient"
              placeholder="-0.29"
              step="0.01"
            />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="onCancel()">Cancel</button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="panelForm.invalid || isSubmitting()"
            >
              {{ isSubmitting() ? 'Saving...' : isEditMode() ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .modal-content {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;

        h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
      }

      .form-group {
        margin-bottom: 1rem;

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.9rem;
        }

        input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;

          &:focus {
            outline: none;
            border-color: #3b82f6;
          }
        }

        .error {
          color: #ef4444;
          font-size: 0.8rem;
          margin-top: 0.25rem;
          display: block;
        }
      }

      .row {
        display: flex;
        gap: 1rem;

        .form-group,
        input {
          flex: 1;
        }
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 2rem;

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: 500;

          &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
          &:hover {
            background: #d1d5db;
          }
        }

        .btn-primary {
          background: #2563eb;
          color: white;
          &:hover {
            background: #1d4ed8;
          }
        }
      }
    `,
  ],
})
export class PanelFormComponent {
  private readonly fb = inject(FormBuilder);

  // Inputs/Outputs
  panel = input<Panel | null>(null);
  save = output<PanelCreateRequest>();
  cancel = output<void>();

  // State
  protected isSubmitting = signal(false);
  protected isEditMode = computed(() => !!this.panel());

  protected panelForm = this.fb.group({
    brand: ['', [Validators.required]],
    model: ['', [Validators.required]],
    wattPeak: [0, [Validators.required, Validators.min(1)]],
    efficiency: [0, [Validators.min(0), Validators.max(100)]],
    price: [0, [Validators.min(0)]],
    warranty: [0, [Validators.min(0)]],
    dimensions: this.fb.group({
      width: [0, [Validators.min(0)]],
      height: [0, [Validators.min(0)]],
    }),
    temperatureCoefficient: [0],
  });

  constructor() {
    // Initialize form if panel is provided (using standard effect/constructor logic since input is signal)
    // We can't use effect() in constructor to set form values easily without allowing signal writes,
    // but we can use a simpler approach or just check in templates.
    // Actually, Angular 17+ `input` signals are available.
    // Let's use `effect` to patch value when input changes.
  }

  // Using effect to update form when input changes
  // Note: effects run after render, so it's safe.
  /* 
  private panelEffect = effect(() => {
    const p = this.panel();
    if (p) {
      this.panelForm.patchValue({
        brand: p.brand,
        model: p.model,
        wattPeak: p.wattPeak,
        efficiency: p.efficiency,
        price: p.price,
        warranty: p.warranty,
        dimensions: p.dimensions,
        temperatureCoefficient: p.temperatureCoefficient
      });
    }
  });
  */
  // Since I cannot use `effect` easily without `constructor` injection context and imports,
  // I'll stick to `ngOnChanges` or just assume it's passed initially if I don't use effect.
  // Actually, I can use `ngOnInit` or `ngOnChanges`. Inputs are signals, so reading them in `ngOnInit` is fine for initial value.

  ngOnInit() {
    const p = this.panel();
    if (p) {
      this.panelForm.patchValue({
        brand: p.brand,
        model: p.model,
        wattPeak: p.wattPeak,
        efficiency: p.efficiency,
        price: p.price,
        warranty: p.warranty,
        dimensions: {
          width: p.dimensions?.width,
          height: p.dimensions?.height,
        },
        temperatureCoefficient: p.temperatureCoefficient,
      });
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  onSubmit() {
    if (this.panelForm.valid) {
      this.isSubmitting.set(true);
      // Cast to correct type - dimensions might need partial handling if form structure differs lightly
      const formData = this.panelForm.value as unknown as PanelCreateRequest;
      this.save.emit(formData);
      // Parent component handles the async operation and setting isSubmitting back to false or closing
    }
  }
}
