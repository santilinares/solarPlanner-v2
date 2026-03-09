import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { Panel, PanelCreateRequest } from '@core/models/panel.model';

@Component({
  selector: 'app-panel-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
  ],
  template: `
    <p-dialog
      [visible]="true"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: 'min(95vw, 48rem)' }"
      [contentStyle]="{ overflow: 'visible' }"
      [closable]="true"
      [header]="isEditMode() ? 'Edit Panel' : 'Add New Panel'"
      (onHide)="onCancel()"
    >
      <form [formGroup]="panelForm" (ngSubmit)="onSubmit()" class="panel-form">
        <div class="grid grid-2">
          <div class="field">
            <label for="brand">Brand</label>
            <input pInputText id="brand" type="text" formControlName="brand" placeholder="e.g. SunPower" />
            @if (hasError('brand', 'required')) {
              <small class="error">Brand is required</small>
            }
          </div>

          <div class="field">
            <label for="model">Model</label>
            <input pInputText id="model" type="text" formControlName="model" placeholder="e.g. Maxeon 6" />
            @if (hasError('model', 'required')) {
              <small class="error">Model is required</small>
            }
          </div>
        </div>

        <div class="grid grid-2">
          <div class="field">
            <label for="technology">Technology</label>
            <p-select
              inputId="technology"
              [options]="technologyOptions"
              optionLabel="label"
              optionValue="value"
              formControlName="technology"
              placeholder="Select technology"
              [showClear]="true"
              appendTo="body"
            />
          </div>

          <div class="field">
            <label for="wattPeak">Power (W)</label>
            <p-inputNumber inputId="wattPeak" formControlName="wattPeak" [min]="1" [useGrouping]="false" />
            @if (hasError('wattPeak', 'required')) {
              <small class="error">Power is required</small>
            }
          </div>
        </div>

        <div class="grid grid-3">
          <div class="field">
            <label for="efficiency">Efficiency (%)</label>
            <p-inputNumber inputId="efficiency" formControlName="efficiency" [min]="0" [max]="100" mode="decimal" [minFractionDigits]="1" [maxFractionDigits]="2" />
          </div>

          <div class="field">
            <label for="price">Price ($)</label>
            <p-inputNumber inputId="price" formControlName="price" mode="currency" currency="USD" locale="en-US" [min]="0" />
          </div>

          <div class="field">
            <label for="warranty">Warranty (Years)</label>
            <p-inputNumber inputId="warranty" formControlName="warranty" [min]="0" [useGrouping]="false" />
          </div>
        </div>

        <div class="field-group" formGroupName="dimensions">
          <h3>Dimensions (mm)</h3>
          <div class="grid grid-2">
            <div class="field">
              <label for="width">Width</label>
              <p-inputNumber inputId="width" formControlName="width" [min]="1" [useGrouping]="false" />
              @if (hasDimensionError('width', 'required')) {
                <small class="error">Width is required</small>
              }
            </div>

            <div class="field">
              <label for="height">Height</label>
              <p-inputNumber inputId="height" formControlName="height" [min]="1" [useGrouping]="false" />
              @if (hasDimensionError('height', 'required')) {
                <small class="error">Height is required</small>
              }
            </div>
          </div>
        </div>

        <div class="field">
          <label for="temperatureCoefficient">Temp. Coefficient (%/degC)</label>
          <p-inputNumber
            inputId="temperatureCoefficient"
            formControlName="temperatureCoefficient"
            mode="decimal"
            [minFractionDigits]="2"
            [maxFractionDigits]="2"
            [useGrouping]="false"
          />
        </div>

        <div class="actions">
          <button pButton type="button" label="Cancel" severity="secondary" [outlined]="true" (click)="onCancel()"></button>
          <button
            pButton
            type="submit"
            [label]="isSubmitting() ? 'Saving...' : (isEditMode() ? 'Update Panel' : 'Create Panel')"
            icon="pi pi-check"
            [disabled]="panelForm.invalid || isSubmitting()"
          ></button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: [
    `
      .panel-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .grid {
        display: grid;
        gap: 0.75rem;
      }

      .grid-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .grid-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--p-text-color);
        }
      }

      .field-group {
        border: 1px solid var(--p-content-border-color);
        border-radius: 0.75rem;
        padding: 0.85rem;

        h3 {
          margin: 0 0 0.6rem;
          font-size: 0.95rem;
        }
      }

      .error {
        color: var(--p-red-500);
        font-size: 0.75rem;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 0.5rem;
      }

      @media (max-width: 768px) {
        .grid-2,
        .grid-3 {
          grid-template-columns: 1fr;
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
  protected readonly technologyOptions: Array<{
    label: string;
    value: NonNullable<PanelCreateRequest['technology']>;
  }> = [
    { label: 'Monocrystalline', value: 'Monocrystalline' },
    { label: 'Polycrystalline', value: 'Polycrystalline' },
    { label: 'Thin film', value: 'Thin film' },
  ];

  protected panelForm = this.fb.group({
    brand: ['', [Validators.required]],
    model: ['', [Validators.required]],
    wattPeak: [null as number | null, [Validators.required, Validators.min(1)]],
    efficiency: [null as number | null, [Validators.min(0), Validators.max(100)]],
    price: [null as number | null, [Validators.min(0)]],
    warranty: [null as number | null, [Validators.min(0)]],
    dimensions: this.fb.group({
      width: [null as number | null, [Validators.required, Validators.min(1)]],
      height: [null as number | null, [Validators.required, Validators.min(1)]],
    }),
    temperatureCoefficient: [null as number | null],
    technology: [null as PanelCreateRequest['technology'] | null],
  });

  constructor() {
    effect(() => {
      const currentPanel = this.panel();

      this.panelForm.reset({
        brand: '',
        model: '',
        wattPeak: null,
        efficiency: null,
        price: null,
        warranty: null,
        dimensions: {
          width: null,
          height: null,
        },
        temperatureCoefficient: null,
        technology: null,
      });

      if (!currentPanel) {
        return;
      }

      this.panelForm.patchValue({
        brand: currentPanel.brand,
        model: currentPanel.model,
        wattPeak: currentPanel.wattPeak,
        efficiency: currentPanel.efficiency,
        price: currentPanel.price,
        warranty: currentPanel.warranty,
        dimensions: {
          width: currentPanel.dimensions?.width ?? null,
          height: currentPanel.dimensions?.height ?? null,
        },
        temperatureCoefficient: currentPanel.temperatureCoefficient,
        technology: currentPanel.technology ?? null,
      });
    });
  }

  hasError(field: string, code: string): boolean {
    const control = this.panelForm.get(field);
    return !!control && control.touched && control.hasError(code);
  }

  hasDimensionError(field: 'width' | 'height', code: string): boolean {
    const control = this.panelForm.get(['dimensions', field]);
    return !!control && control.touched && control.hasError(code);
  }

  onCancel() {
    this.cancel.emit();
  }

  onSubmit() {
    if (this.panelForm.invalid) {
      this.panelForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const raw = this.panelForm.getRawValue();
    const request: PanelCreateRequest = {
      brand: raw.brand ?? '',
      model: raw.model ?? '',
      wattPeak: raw.wattPeak ?? 0,
      efficiency: raw.efficiency ?? 0,
      price: raw.price ?? 0,
      warranty: raw.warranty ?? 0,
      dimensions: {
        width: raw.dimensions?.width ?? 0,
        height: raw.dimensions?.height ?? 0,
      },
      temperatureCoefficient: raw.temperatureCoefficient ?? 0,
      technology: raw.technology ?? undefined,
    };

    this.save.emit(request);
  }
}
