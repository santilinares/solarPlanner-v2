import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataViewModule } from 'primeng/dataview';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { PanelService } from '@core/services/panel.service';
import { Panel } from '@core/models/panel.model';

@Component({
  selector: 'app-panel-list',
  imports: [CommonModule, DataViewModule, CardModule, TagModule, SkeletonModule, ButtonModule],
  template: `
    <div class="panel-list animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1>
            <i class="pi pi-th-large icon-lg icon-primary"></i>
            Solar Panels
          </h1>
          <p class="subtitle">Browse our comprehensive database of solar panel specifications</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="panels-grid stagger-children" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          @for (item of [1,2,3,4,5,6]; track item) {
            <p-card class="panel-card">
              <p-skeleton height="2rem" class="mb-3"></p-skeleton>
              <p-skeleton height="1rem" class="mb-2"></p-skeleton>
              <p-skeleton height="1rem" class="mb-2"></p-skeleton>
              <p-skeleton height="1rem" width="70%"></p-skeleton>
            </p-card>
          }
        </div>
      } @else if (panels().length === 0) {
        <p-card class="empty-state" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          <div class="empty-content">
            <i class="pi pi-inbox empty-icon"></i>
            <h3>No Panels Available</h3>
            <p>No solar panels found in the database.</p>
          </div>
        </p-card>
      } @else {
        <div class="panels-grid stagger-children" animate.enter="animate-fade-in-up" animate.leave="animate-fade-out">
          @for (panel of panels(); track panel.id || panel._id) {
            <p-card class="panel-card hover-lift">
              <div class="panel-header">
                <div class="panel-icon">
                  <i class="pi pi-bolt panel-bolt-icon"></i>
                </div>
                <p-tag [value]="panel.efficiency + '%'" severity="success" class="efficiency-badge"></p-tag>
              </div>
              <h3 class="panel-name">{{ panel.brand }}</h3>
              <p class="panel-model">{{ panel.model }}</p>
              <div class="panel-specs">
                <div class="spec-item">
                  <span class="spec-label">Power Output</span>
                  <span class="spec-value solar-highlight">{{ panel.wattPeak }}W</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Efficiency</span>
                  <span class="spec-value">{{ panel.efficiency }}%</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Price</span>
                  <span class="spec-value">{{ panel.price }}</span>
                </div>
              </div>
            </p-card>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .panel-list {
        padding: 1rem;

        .page-header {
          margin-bottom: 2rem;

          h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--p-text-color);
            margin: 0 0 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .subtitle {
            color: var(--p-text-muted-color);
            margin: 0;
            font-size: 1.1rem;
          }
        }

        .panels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(18.75rem, 1fr));
          gap: 1.5rem;

          .panel-card {
            .panel-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 1rem;

              .panel-icon {
                width: 3.5rem;
                height: 3.5rem;
                border-radius: 2.5rem;
                background: color-mix(in srgb, var(--p-yellow-500) 16%, transparent);
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .panel-bolt-icon {
                color: var(--p-yellow-500);
                font-size: 1.5rem;
              }

              .efficiency-badge {
                font-weight: 700;
                font-size: 0.875rem;
              }
            }

            .panel-name {
              font-size: 1.4rem;
              font-weight: 700;
              color: var(--p-text-color);
              margin: 0 0 0.25rem;
            }

            .panel-model {
              font-size: 1rem;
              color: var(--p-text-muted-color);
              margin: 0 0 1.5rem;
            }

            .panel-specs {
              display: flex;
              flex-direction: column;
              gap: 0.875rem;

              .spec-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem;
                background: var(--p-content-hover-background);
                border-radius: 0.5rem;

                .spec-label {
                  font-size: 0.875rem;
                  color: var(--p-text-muted-color);
                  font-weight: 500;
                }

                .spec-value {
                  font-size: 1.125rem;
                  font-weight: 700;
                  color: var(--p-primary-500);
                }
              }
            }

          }
        }

        .empty-state {
          .empty-content {
            text-align: center;

            .empty-icon {
              display: block;
              margin-bottom: 1.5rem;
              font-size: 4rem;
              color: var(--p-text-muted-color);
            }

            h3 {
              font-size: 1.5rem;
              color: var(--p-text-color);
              margin-bottom: 0.5rem;
            }

            p {
              color: var(--p-text-muted-color);
              font-size: 1.1rem;
            }
          }
        }

        :host ::ng-deep {
          .panel-list .panel-card .p-card-body {
            padding: 1.5rem;
          }

          .panel-list .empty-state .p-card-body {
            padding: 4rem 2rem;
          }
        }

        @media (max-width: 768px) {
          padding: 0.5rem;

          .page-header h1 {
            font-size: 2rem;
          }

          .panels-grid {
            grid-template-columns: 1fr;
          }
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
