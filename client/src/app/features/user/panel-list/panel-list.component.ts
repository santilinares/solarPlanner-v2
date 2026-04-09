import { Component, ChangeDetectionStrategy, computed, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Popover, PopoverModule } from 'primeng/popover';
import { PanelService } from '@core/services/panel.service';
import { Panel, PanelCreateRequest, PanelUpdateRequest } from '@core/models/panel.model';
import { UserRole } from '@core/models';
import { AuthService } from '@core/services';
import { PanelFormComponent } from '@features/admin/panels/panel-form.component';

@Component({
  selector: 'app-panel-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CardModule, ChipModule, SkeletonModule, ButtonModule, TooltipModule, InputTextModule, SelectModule, PopoverModule, PanelFormComponent],
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
        @if (isAdmin()) {
          <p-button
            label="Add Panel"
            icon="pi pi-plus"
            (onClick)="openAddModal()"
          />
        }
      </div>

      <!-- Filter row -->
      <div class="filter-row">
        @for (chip of activeChips(); track chip.key) {
          <p-chip
            [label]="chip.label"
            [removable]="true"
            (onRemove)="removeFilter(chip.key)"
            class="filter-chip"
          />
        }
        @if (availableFilterTypes().length > 0) {
          <button class="add-filter-btn" (click)="openAddFilter($event)">
            <i class="pi pi-plus"></i> Add filter
          </button>
        }
        @if (activeChips().length > 0) {
          <button class="clear-all-btn" (click)="clearAll()">Clear all</button>
        }
      </div>

      <!-- Add filter popover -->
      <p-popover #addFilterPopover (onHide)="onPopoverHide()">
        <div class="filter-popover">
          @if (!selectedFilterType()) {
            <p class="popover-title">Filter by</p>
            <ul class="filter-type-list">
              @for (type of availableFilterTypes(); track type.key) {
                <li class="filter-type-item" (click)="selectedFilterType.set(type.key)">
                  <i [class]="type.icon"></i>
                  <span>{{ type.label }}</span>
                </li>
              }
            </ul>
          } @else {
            <div class="popover-input-step">
              <button class="back-btn" (click)="selectedFilterType.set(null)">
                <i class="pi pi-arrow-left"></i> Back
              </button>
              <p class="popover-title">{{ currentFilterLabel() }}</p>

              @switch (selectedFilterType()) {
                @case ('search') {
                  <input
                    pInputText
                    [(ngModel)]="pendingSearch"
                    placeholder="Brand or model..."
                    class="popover-input"
                    (keyup.enter)="applyFilter()"
                    autofocus
                  />
                }
                @case ('technology') {
                  <p-select
                    [(ngModel)]="pendingTechnology"
                    [options]="technologyOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select technology"
                    class="popover-input"
                  />
                }
              }

              <p-button label="Apply" icon="pi pi-check" size="small" (onClick)="applyFilter()" styleClass="apply-btn" />
            </div>
          }
        </div>
      </p-popover>

      @if (showModal() && isAdmin()) {
        <app-panel-form
          [panel]="selectedPanel()"
          (save)="onSavePanel($event)"
          (cancel)="closeModal()"
        />
      }

      @if (isLoading()) {
        <div class="panels-grid">
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
        <p-card class="empty-state">
          <div class="empty-content">
            <i class="pi pi-inbox empty-icon"></i>
            <h3>No Panels Available</h3>
            <p>No solar panels found in the database.</p>
            @if (isAdmin()) {
              <p-button label="Add First Panel" icon="pi pi-plus" (onClick)="openAddModal()" />
            }
          </div>
        </p-card>
      } @else {
        <div class="panels-grid">
          @for (panel of panels(); track panel.id || panel._id) {
            <p-card class="panel-card hover-lift">
              <div class="panel-header">
                <div class="panel-icon">
                  <i class="pi pi-bolt panel-bolt-icon"></i>
                </div>
                @if (isAdmin()) {
                  <div class="panel-actions">
                    <p-button
                      icon="pi pi-pencil"
                      severity="secondary"
                      [text]="true"
                      [rounded]="true"
                      class="action-btn"
                      pTooltip="Edit panel"
                      tooltipPosition="top"
                      (onClick)="openEditModal(panel)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      severity="danger"
                      [text]="true"
                      [rounded]="true"
                      class="action-btn"
                      pTooltip="Delete panel"
                      tooltipPosition="top"
                      (onClick)="deletePanel(panel)"
                    />
                  </div>
                }
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;

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

        .filter-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          min-height: 2.25rem;
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

            .panel-actions {
              display: flex;
              align-items: flex-start;
              gap: 0.25rem;
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

          .panel-list .panel-card .panel-actions .action-btn .p-button {
            width: 2.25rem;
            height: 2.25rem;
          }

          .panel-list .empty-state .p-card-body {
            padding: 4rem 2rem;
          }

          .filter-chip {
            font-size: 0.8rem;
            background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
            color: var(--p-primary-700, var(--p-primary-500));
            border: 1px solid color-mix(in srgb, var(--p-primary-500) 30%, transparent);
          }

          .apply-btn { width: 100%; justify-content: center; }
        }

        @media (max-width: 768px) {
          padding: 0.5rem;

          .page-header {
            flex-direction: column;
            align-items: flex-start;

            h1 {
              font-size: 2rem;
            }
          }

          .panels-grid {
            grid-template-columns: 1fr;
          }
        }
      }

      .add-filter-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 1rem;
        border: none;
        border-radius: 1rem;
        background: var(--p-primary-500);
        color: #fff;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s, transform 0.15s;

        &:hover {
          background: var(--p-primary-600);
          transform: translateY(-1px);
        }

        &:active { transform: translateY(0); }

        i { font-size: 0.7rem; }
      }

      .clear-all-btn {
        background: none;
        border: none;
        color: var(--p-text-muted-color);
        font-size: 0.8rem;
        cursor: pointer;
        padding: 0.25rem 0.375rem;
        border-radius: 0.25rem;
        transition: color 0.2s;
        margin-left: 0.25rem;

        &:hover { color: var(--p-red-500); }
      }

      /* Popover internals */
      .filter-popover {
        min-width: 14rem;
        padding: 0.25rem 0;
      }

      .popover-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--p-text-muted-color);
        margin: 0 0 0.5rem;
        padding: 0 0.25rem;
      }

      .filter-type-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .filter-type-item {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.6rem 0.75rem;
        border-radius: 0.4rem;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--p-text-color);
        transition: background 0.15s;

        i { color: var(--p-primary-500); font-size: 0.85rem; }

        &:hover { background: var(--p-content-hover-background); }
      }

      .popover-input-step {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
      }

      .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        background: none;
        border: none;
        color: var(--p-text-muted-color);
        font-size: 0.8rem;
        cursor: pointer;
        padding: 0;
        margin-bottom: 0.25rem;
        transition: color 0.15s;

        &:hover { color: var(--p-primary-500); }
      }

      .popover-input {
        width: 100%;
      }
    `,
  ],
})
export class PanelListComponent implements OnInit {
  @ViewChild('addFilterPopover') private addFilterPopover!: Popover;

  private readonly panelService = inject(PanelService);
  private readonly authService = inject(AuthService);

  protected readonly panels = signal<Panel[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly showModal = signal(false);
  protected readonly selectedPanel = signal<Panel | null>(null);
  protected readonly isAdmin = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === UserRole.ADMIN || this.authService.isAdmin();
  });

  // Filter signals
  readonly filterSearch = signal<string | null>(null);
  readonly filterTechnology = signal<string | null>(null);

  // Popover state
  readonly selectedFilterType = signal<string | null>(null);
  pendingSearch = '';
  pendingTechnology: string | null = null;

  readonly technologyOptions = [
    { label: 'Monocrystalline', value: 'Monocrystalline' },
    { label: 'Polycrystalline', value: 'Polycrystalline' },
    { label: 'Thin film', value: 'Thin film' },
  ];

  readonly activeChips = computed(() => {
    const chips: { key: string; label: string }[] = [];
    if (this.filterSearch())     chips.push({ key: 'search',     label: `Search: ${this.filterSearch()}` });
    if (this.filterTechnology()) chips.push({ key: 'technology', label: `Technology: ${this.filterTechnology()}` });
    return chips;
  });

  readonly availableFilterTypes = computed(() => {
    const all = [
      { key: 'search',     label: 'Search by brand or model', icon: 'pi pi-search' },
      { key: 'technology', label: 'Technology',               icon: 'pi pi-bolt' },
    ];
    const active = new Set(this.activeChips().map((c) => c.key));
    return all.filter((f) => !active.has(f.key));
  });

  readonly currentFilterLabel = computed(() => {
    const type = this.selectedFilterType();
    return this.availableFilterTypes().find((f) => f.key === type)?.label
      ?? this.activeChips().find((c) => c.key === type)?.label.split(':')[0]
      ?? '';
  });

  ngOnInit() {
    this.loadPanels();
  }

  protected openAddFilter(event: Event): void {
    this.selectedFilterType.set(null);
    this.addFilterPopover.toggle(event);
  }

  protected onPopoverHide(): void {
    this.selectedFilterType.set(null);
    this.pendingSearch = '';
    this.pendingTechnology = null;
  }

  protected applyFilter(): void {
    const type = this.selectedFilterType();
    switch (type) {
      case 'search':     this.filterSearch.set(this.pendingSearch || null); break;
      case 'technology': this.filterTechnology.set(this.pendingTechnology); break;
    }
    this.addFilterPopover.hide();
    this.loadPanels();
  }

  protected removeFilter(key: string): void {
    switch (key) {
      case 'search':     this.filterSearch.set(null); break;
      case 'technology': this.filterTechnology.set(null); break;
    }
    this.loadPanels();
  }

  protected clearAll(): void {
    this.filterSearch.set(null);
    this.filterTechnology.set(null);
    this.loadPanels();
  }

  loadPanels() {
    this.isLoading.set(true);
    const filters: { search?: string; technology?: string } = {};
    if (this.filterSearch()) filters['search'] = this.filterSearch()!;
    if (this.filterTechnology()) filters['technology'] = this.filterTechnology()!;

    this.panelService.searchPanels(filters).subscribe({
      next: (data) => {
        this.panels.set(data.panels);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching panels:', error);
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
      const id = currentPanel.id || currentPanel._id;
      if (!id) {
        return;
      }

      this.panelService.updatePanel(id, data as PanelUpdateRequest).subscribe({
        next: () => {
          this.loadPanels();
          this.closeModal();
        },
        error: (err) => console.error('Error updating panel', err),
      });
      return;
    }

    this.panelService.createPanel(data).subscribe({
      next: () => {
        this.loadPanels();
        this.closeModal();
      },
      error: (err) => console.error('Error creating panel', err),
    });
  }

  deletePanel(panel: Panel) {
    if (!confirm(`Are you sure you want to delete ${panel.brand} ${panel.model}?`)) {
      return;
    }

    const id = panel.id || panel._id;
    if (!id) {
      return;
    }

    this.panelService.deletePanel(id).subscribe({
      next: () => this.loadPanels(),
      error: (err) => console.error('Error deleting panel', err),
    });
  }
}
