import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';

import { Panel, OptimalConfigResponse } from '@core/models';
import { OrientationOption } from '../../configure-project.component';

@Component({
  selector: 'app-configure-panel-form-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    FloatLabelModule,
    InputNumberModule,
    SelectModule,
    ButtonModule,
    TagModule,
    DividerModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './configure-panel-form-step.component.html',
  styleUrls: ['./configure-panel-form-step.component.scss'],
})
export class ConfigurePanelFormStepComponent {
  readonly formGroup = input.required<FormGroup>();
  readonly panelsWithLabel = input.required<Array<Panel & { displayLabel: string }>>();
  readonly selectedPanelData = input<(Panel & { technology?: string; bifacial?: boolean }) | null>(null);
  readonly selectedPanelName = input<string>('Panel details');
  readonly selectedPanelTechDimensions = input<string>('N/A - N/A');
  readonly panelTagEntries = input<Array<{ label: string; value: string; icon: string; severity: 'success' | 'info' | 'warn' | 'secondary' }>>([]);
  readonly orientationOptions = input.required<OrientationOption[]>();
  readonly totalCapacityKw = input<number>(0);
  readonly projectTotalArea = input<number>(0);
  readonly optimalConfig = input<OptimalConfigResponse | null>(null);
  readonly isCalculating = input<boolean>(false);
  readonly isUsingOptimalConfig = input<boolean>(false);
  readonly panelNumber = input<number | null>(null);

  readonly applyOptimal = output<void>();
}
