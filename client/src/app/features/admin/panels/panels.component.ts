import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { PanelService } from '@core/services/panel.service';
import { Panel, PanelCreateRequest } from '@core/models/panel.model';
import { PanelFormComponent } from './panel-form.component';

@Component({
  selector: 'app-panels',
  imports: [CardModule, TagModule, SkeletonModule, ButtonModule, PanelFormComponent],
  templateUrl: './panels.component.html',
  styleUrl: './panels.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelsComponent implements OnInit {
  private readonly panelService = inject(PanelService);

  protected readonly panels = signal<Panel[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly showModal = signal(false);
  protected readonly selectedPanel = signal<Panel | null>(null);

  ngOnInit() {
    this.loadPanels();
  }

  loadPanels() {
    this.isLoading.set(true);
    this.panelService.getPanels().subscribe({
      next: (data) => {
        this.panels.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading panels', err);
        this.isLoading.set(false);
      },
    });
  }

  openAddModal() {
    this.selectedPanel.set(null);
    this.showModal.set(true);
  }

  openEditModal(panel: Panel) {
    this.selectedPanel.set(panel);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedPanel.set(null);
  }

  onSavePanel(data: PanelCreateRequest) {
    const currentPanel = this.selectedPanel();

    if (currentPanel) {
      // Update
      const id = currentPanel.id || currentPanel._id;
      if (!id) return;

      this.panelService.updatePanel(id, data).subscribe({
        next: () => {
          this.loadPanels(); // Reload list
          this.closeModal();
        },
        error: (err) => console.error('Error updating panel', err),
      });
    } else {
      // Create
      this.panelService.createPanel(data).subscribe({
        next: () => {
          this.loadPanels();
          this.closeModal();
        },
        error: (err) => console.error('Error creating panel', err),
      });
    }
  }

  deletePanel(panel: Panel) {
    if (confirm(`Are you sure you want to delete ${panel.brand} ${panel.model}?`)) {
      const id = panel.id || panel._id;
      if (!id) return;

      this.panelService.deletePanel(id).subscribe({
        next: () => this.loadPanels(),
        error: (err) => console.error('Error deleting panel', err),
      });
    }
  }
}
