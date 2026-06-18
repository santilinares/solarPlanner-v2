import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { Coordinates, OptimalConfigResponse } from '@core/models';
import { ConfigFormValue, ReviewChange } from '../../configure-project.component';
import { ProjectConfigPreview } from '@core/models';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-configure-review-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ButtonModule, TagModule, DividerModule, MessageModule, TooltipModule],
  templateUrl: './configure-review-step.component.html',
  styleUrls: ['./configure-review-step.component.scss'],
})
export class ConfigureReviewStepComponent {
  readonly i18n = inject(LanguageService);
  readonly formValue = input.required<ConfigFormValue>();
  readonly locationSummary = input.required<string>();
  readonly polygonCoords = input.required<Coordinates[]>();
  readonly optimalConfig = input<OptimalConfigResponse | null>(null);
  readonly configPreview = input<ProjectConfigPreview | null>(null);
  readonly reviewChanges = input<ReviewChange[]>([]);
  readonly annualProductionDelta = input<number | null>(null);
  readonly annualSavingsDelta = input<number | null>(null);
  readonly isUsingOptimalConfig = input<boolean>(false);
  readonly totalCapacityKw = input<number>(0);
  readonly selectedPanelLabel = input<string>('—');
  readonly selectedDirectionLabel = input<string>('—');
  readonly isSaving = input<boolean>(false);
  readonly canSave = input<boolean>(false);
  readonly saveError = input<string | null>(null);
  readonly saveSuccess = input<boolean>(false);

  readonly goToStep = output<number>();
  readonly save = output<void>();
}
