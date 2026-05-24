import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { Coordinates } from '@core/models';
import { LocationMapComponent } from '@shared/components/location-map/location-map.component';

@Component({
  selector: 'app-configure-location-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputTextModule, ButtonModule, DividerModule, LocationMapComponent],
  templateUrl: './configure-location-step.component.html',
  styleUrls: ['./configure-location-step.component.scss'],
})
export class ConfigureLocationStepComponent {
  readonly polygonCoords = input.required<Coordinates[]>();
  readonly mapLat = input<number | null>(null);
  readonly mapLng = input<number | null>(null);
  readonly mapCenter = input<Coordinates | null>(null);
  readonly isSearching = input<boolean>(false);
  readonly searchError = input<string | null>(null);

  readonly polygonChange = output<Coordinates[]>();
  readonly addressSearch = output<string>();

  readonly addressQuery = signal('');

  triggerSearch(): void {
    const query = this.addressQuery().trim();
    if (query) {
      this.addressSearch.emit(query);
    }
  }
}
