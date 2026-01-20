import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelService } from '@core/services/panel.service';
import { Panel } from '@core/models/panel.model';

@Component({
  selector: 'app-panel-list',
  imports: [CommonModule],
  template: `
    <div class="panel-list">
      <h1>Solar Panels</h1>

      @if (isLoading()) {
        <div class="loading">Loading panels...</div>
      } @else if (panels().length === 0) {
        <div class="empty-state">
          <p>No panels found.</p>
        </div>
      } @else {
        <div class="grid-container">
          @for (panel of panels(); track panel.id || panel._id) {
            <div class="panel-card">
              <h3>{{ panel.brand }} {{ panel.model }}</h3>
              <div class="specs">
                <p><strong>Power:</strong> {{ panel.wattPeak }}W</p>
                <p><strong>Efficiency:</strong> {{ panel.efficiency }}%</p>
                <p><strong>Price:</strong> \${{ panel.price }}</p>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .panel-list {
        padding: 2rem;

        h1 {
          margin-bottom: 2rem;
        }

        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .panel-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }

          h3 {
            margin: 0 0 1rem 0;
            color: #2c3e50;
          }

          .specs {
            p {
              margin: 0.5rem 0;
              color: #666;

              strong {
                color: #333;
              }
            }
          }
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666;
          font-size: 1.2rem;
        }
      }
    `,
  ],
})
export class PanelListComponent implements OnInit {
  private readonly panelService = inject(PanelService);

  protected readonly panels = signal<Panel[]>([]);
  protected readonly isLoading = signal(true);

  ngOnInit() {
    this.panelService.getPanels().subscribe({
      next: (data) => {
        this.panels.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching panels:', error);
        this.isLoading.set(false);
      },
    });
  }
}
