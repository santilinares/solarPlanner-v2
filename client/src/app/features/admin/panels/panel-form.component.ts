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
import { LanguageService } from '@core/services/language.service';

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
      [contentStyle]="{ 'max-height': '80vh', 'overflow-y': 'auto', 'overflow-x': 'hidden' }"
      [closable]="false"
      (onHide)="onCancel()"
    >
      <ng-template pTemplate="header">
        <div class="dialog-header-content">
          <h3 class="dialog-title">{{ isEditMode() ? i18n.t('panelForm.editTitle') : i18n.t('panelForm.addTitle') }}</h3>
          <div class="dialog-header-actions">
            <button pButton type="button" [label]="i18n.t('panelForm.cancel')" severity="secondary" [outlined]="true" (click)="onCancel()"></button>
            <button
              pButton
              type="button"
              [label]="isSubmitting() ? i18n.t('panelForm.saving') : (isEditMode() ? i18n.t('panelForm.update') : i18n.t('panelForm.create'))"
              icon="pi pi-check"
              [disabled]="panelForm.invalid || isSubmitting()"
              (click)="onSubmit()"
            ></button>
          </div>
        </div>
      </ng-template>

      <form [formGroup]="panelForm" (ngSubmit)="onSubmit()" class="panel-form">
        <section class="step-card">
          <header class="step-card-header">
            <div class="step-card-icon panel-icon">
              <i class="pi pi-bolt"></i>
            </div>
            <div>
              <h2>{{ isEditMode() ? i18n.t('panelForm.updateSpecs') : i18n.t('panelForm.createSpecs') }}</h2>
              <p>{{ i18n.t('panelForm.description') }}</p>
            </div>
          </header>

          <div class="form-grid">
            <div class="form-field">
            <label for="brand">{{ i18n.t('panelForm.brand') }}</label>
            <input pInputText id="brand" type="text" formControlName="brand" [placeholder]="i18n.t('panelForm.brandPlaceholder')" />
            @if (hasError('brand', 'required')) {
              <small class="field-error">{{ i18n.t('panelForm.brandRequired') }}</small>
            }
          </div>

            <div class="form-field">
            <label for="model">{{ i18n.t('panelForm.model') }}</label>
            <input pInputText id="model" type="text" formControlName="model" [placeholder]="i18n.t('panelForm.modelPlaceholder')" />
            @if (hasError('model', 'required')) {
              <small class="field-error">{{ i18n.t('panelForm.modelRequired') }}</small>
            }
          </div>

            <div class="form-field">
            <label for="technology">{{ i18n.t('common.technology') }}</label>
            <p-select
              inputId="technology"
              [options]="technologyOptions()"
              optionLabel="label"
              optionValue="value"
              formControlName="technology"
              [placeholder]="i18n.t('panels.selectTechnology')"
              [showClear]="true"
              appendTo="body"
            />
            <small class="field-hint">{{ i18n.t('panelForm.chooseTechnology') }}</small>
          </div>

            <div class="form-field">
            <label for="wattPeak">{{ i18n.t('panelForm.powerW') }}</label>
            <p-inputNumber inputId="wattPeak" formControlName="wattPeak" [min]="1" [useGrouping]="false" />
            @if (hasError('wattPeak', 'required')) {
              <small class="field-error">{{ i18n.t('panelForm.powerRequired') }}</small>
            }
          </div>

            <div class="form-field">
            <label for="efficiency">{{ i18n.t('panelForm.efficiencyPercent') }}</label>
            <p-inputNumber inputId="efficiency" formControlName="efficiency" [min]="0" [max]="100" mode="decimal" [minFractionDigits]="1" [maxFractionDigits]="2" />
          </div>

            <div class="form-field">
            <label for="price">{{ i18n.t('panelForm.priceUsd') }}</label>
            <p-inputNumber inputId="price" formControlName="price" mode="currency" currency="USD" locale="en-US" [min]="0" />
          </div>

            <div class="form-field">
            <label for="warranty">{{ i18n.t('panelForm.warrantyYears') }}</label>
            <p-inputNumber inputId="warranty" formControlName="warranty" [min]="0" [useGrouping]="false" />
          </div>

            <div class="form-field">
             <label for="gammaPmp">{{ i18n.t('panelForm.tempCoefficient') }}</label>
              <p-inputNumber
                inputId="gammaPmp"
                formControlName="gammaPmp"
                mode="decimal"
                [minFractionDigits]="2"
                [maxFractionDigits]="2"
                [useGrouping]="false"
              />
              <small class="field-hint">{{ i18n.t('panelForm.tempCoefficientHint') }}</small>
          </div>

            <div class="form-field full-width field-group" formGroupName="dimensions">
              <h3>{{ i18n.t('panelForm.dimensions') }}</h3>
              <div class="form-grid nested-grid">
                <div class="form-field">
              <label for="width">{{ i18n.t('panelForm.width') }}</label>
              <p-inputNumber inputId="width" formControlName="width" [min]="1" [useGrouping]="false" />
              @if (hasDimensionError('width', 'required')) {
                <small class="field-error">{{ i18n.t('panelForm.widthRequired') }}</small>
              }
            </div>

                <div class="form-field">
              <label for="height">{{ i18n.t('panelForm.height') }}</label>
              <p-inputNumber inputId="height" formControlName="height" [min]="1" [useGrouping]="false" />
              @if (hasDimensionError('height', 'required')) {
                <small class="field-error">{{ i18n.t('panelForm.heightRequired') }}</small>
              }
            </div>
              </div>
          </div>
          </div>
        </section>
      </form>
    </p-dialog>
  `,
  styles: [
    `
      .dialog-header-content {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .dialog-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
      }

      .dialog-header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .panel-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        min-width: 0;
        width: 100%;
      }

      .step-card {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        border-radius: 1.5rem;
        padding: 1.25rem;
        box-shadow: 0 0.0625rem 0.1875rem color-mix(in srgb, var(--p-text-color) 10%, transparent);
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        box-sizing: border-box;
      }

      .step-card-header {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        min-width: 0;
      }

      .step-card-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--p-text-color);
      }

      .step-card-header p {
        margin: 0.25rem 0 0;
        color: var(--p-text-muted-color);
        font-size: 0.85rem;
      }

      .step-card-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 0.875rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }

      .panel-icon {
        background: linear-gradient(135deg, var(--p-amber-100), var(--p-yellow-400));
        color: var(--p-amber-900);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        min-width: 0;
        width: 100%;
      }

      .nested-grid {
        margin-top: 0.75rem;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        min-width: 0;
      }

      .form-field label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--p-text-color);
      }

      .form-field.full-width {
        grid-column: 1 / -1;
      }

      .field-group {
        border: 1px solid var(--p-content-border-color);
        border-radius: 1rem;
        padding: 1rem;
        background: color-mix(in srgb, var(--p-surface-0) 92%, var(--p-primary-50));
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
      }

      .field-group h3 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
      }

      .field-error {
        color: var(--p-red-500);
        font-size: 0.8rem;
      }

      .field-hint {
        color: var(--p-text-muted-color);
        font-size: 0.8rem;
      }

      :host ::ng-deep .p-dialog .p-dialog-content {
        overflow-x: hidden;
      }

      :host ::ng-deep .panel-form .p-inputtext,
      :host ::ng-deep .panel-form .p-inputnumber,
      :host ::ng-deep .panel-form .p-select {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      :host ::ng-deep .panel-form .p-inputnumber-input,
      :host ::ng-deep .panel-form .p-select-label {
        width: 100%;
        min-width: 0;
      }

      @media (max-width: 768px) {
        .dialog-header-content {
          flex-direction: column;
          align-items: flex-start;
        }

        .dialog-header-actions {
          width: 100%;
        }

        .form-grid,
        .step-card-header {
          grid-template-columns: 1fr;
        }

        .step-card {
          border-radius: 1rem;
          padding: 1rem;
        }
      }
    `,
  ],
})
export class PanelFormComponent {
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(LanguageService);

  // Inputs/Outputs
  panel = input<Panel | null>(null);
  save = output<PanelCreateRequest>();
  cancel = output<void>();

  // State
  protected isSubmitting = signal(false);
  protected isEditMode = computed(() => !!this.panel());
  protected readonly technologyOptions = computed<Array<{
    label: string;
    value: NonNullable<PanelCreateRequest['technology']>;
  }>>(() => [
    { label: this.i18n.t('panels.monocrystalline'), value: 'Monocrystalline' },
    { label: this.i18n.t('panels.polycrystalline'), value: 'Polycrystalline' },
    { label: this.i18n.t('panels.thinFilm'), value: 'Thin film' },
  ]);

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
    gammaPmp: [null as number | null],
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
        gammaPmp: null,
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
        gammaPmp: currentPanel.gammaPmp,
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
      gammaPmp: raw.gammaPmp ?? undefined,
      technology: raw.technology ?? undefined,
    };

    this.save.emit(request);
  }
}
