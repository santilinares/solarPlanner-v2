import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelService } from '@core/services/panel.service';
import { Panel, PanelCreateRequest } from '@core/models/panel.model';
import { PanelFormComponent } from './panel-form.component';

@Component({
  selector: 'app-panels',
  imports: [CommonModule, PanelFormComponent],
  template: `
    <div class="panels-admin">
      <div class="header">
        <h1>Manage Panels</h1>
        <button class="btn btn-primary" (click)="openAddModal()">+ Add Panel</button>
      </div>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <app-panel-form
          [panel]="selectedPanel()"
          (save)="onSavePanel($event)"
          (cancel)="closeModal()"
        />
      }

      @if (isLoading()) {
        <div class="loading">Loading panels...</div>
      } @else if (panels().length === 0) {
        <div class="empty-state">
          <p>No panels found. Add one to get started.</p>
        </div>
      } @else {
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Model</th>
                <th>Power</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (panel of panels(); track panel.id || panel._id) {
                <tr>
                  <td>{{ panel.brand }}</td>
                  <td>{{ panel.model }}</td>
                  <td>{{ panel.wattPeak }}W</td>
                  <td>\${{ panel.price }}</td>
                  <td class="actions">
                    <button class="btn-icon edit" (click)="openEditModal(panel)">Edit</button>
                    <button class="btn-icon delete" (click)="deletePanel(panel)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .panels-admin {
        padding: 2rem;

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;

          h1 {
            margin: 0;
          }

          .btn-primary {
            background-color: #2563eb;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            &:hover {
              background-color: #1d4ed8;
            }
          }
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;

          table {
            width: 100%;
            border-collapse: collapse;

            th,
            td {
              padding: 1rem;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }

            th {
              background: #f9fafb;
              font-weight: 600;
              color: #374151;
            }

            tr:last-child td {
              border-bottom: none;
            }

            .actions {
              display: flex;
              gap: 0.5rem;

              .btn-icon {
                padding: 0.25rem 0.5rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 0.9rem;

                &.edit {
                  color: #2563eb;
                  border-color: #2563eb;
                }
                &.delete {
                  color: #ef4444;
                  border-color: #ef4444;
                }

                &:hover {
                  background: #f3f4f6;
                }
              }
            }
          }
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666;
        }
      }
    `,
  ],
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
