import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProjectService } from '@core/services/project.service';
import { AuthService, UserService } from '@core/services';
import { LanguageService } from '@core/services/language.service';
import { UserRole, UserResponse } from '@core/models';
import { Project } from '@core/models';

interface ProjectCardView {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  panels: number;
  power: number;
  status: 'planning' | 'active' | 'completed';
  area: number;
  panelType: string;
  inclination: number;
  orientation: string;
  bifacial: boolean;
  estimatedOutput: number;
  efficiency: number;
  ownerEmail?: string;
}

@Component({
  selector: 'app-user-projects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    ChipModule,
    DatePickerModule,
    DatePipe,
    InputTextModule,
    PopoverModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TitleCasePipe,
    TooltipModule,
  ],
  template: `
    <section class="projects-page animate-fade-in-up">
      <header class="projects-header">
        <div>
          <h1>
            <i class="pi pi-bolt icon-lg icon-primary"></i>
            {{ isAdmin() ? (filterOwner() ? i18n.t('projects.userProjects') : i18n.t('projects.allProjects')) : i18n.t('projects.myProjects') }}
          </h1>
          <p>{{ isAdmin() ? (filterOwner() ? i18n.t('projects.showingSpecificUser') : i18n.t('projects.manageAll')) : i18n.t('projects.manageMine') }}</p>
        </div>
        @if (!isAdmin()) {
          <p-button [label]="i18n.t('dashboard.newProject')" icon="pi pi-plus" routerLink="/projects/add" />
        }
      </header>

      <!-- Filter row -->
      <div class="filter-row">
        @for (chip of activeChips(); track chip.key) {
          <p-chip
            [label]="chip.label"
            [removable]="true"
            (onRemove)="removeFilter(chip.key)"
            styleClass="filter-chip"
          />
        }
        @if (availableFilterTypes().length > 0) {
          <button class="add-filter-btn" (click)="openAddFilter($event)">
            <i class="pi pi-plus"></i> {{ i18n.t('common.addFilter') }}
          </button>
        }
        @if (activeChips().length > 0) {
          <button class="clear-all-btn" (click)="clearAll()">{{ i18n.t('common.clearAll') }}</button>
        }
      </div>

      <!-- Add filter popover -->
      <p-popover #addFilterPopover (onHide)="onPopoverHide()">
        <div class="filter-popover">
          @if (!selectedFilterType()) {
            <p class="popover-title">{{ i18n.t('common.filterBy') }}</p>
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
                <i class="pi pi-arrow-left"></i> {{ i18n.t('common.back') }}
              </button>
              <p class="popover-title">{{ currentFilterLabel() }}</p>

              @switch (selectedFilterType()) {
                @case ('search') {
                  <input
                    pInputText
                    [(ngModel)]="pendingSearch"
                    [placeholder]="i18n.t('projects.projectNamePlaceholder')"
                    class="popover-input"
                    (keyup.enter)="applyFilter()"
                    autofocus
                  />
                }
                @case ('country') {
                  <input
                    pInputText
                    [(ngModel)]="pendingCountry"
                    [placeholder]="i18n.t('projects.countryPlaceholder')"
                    class="popover-input"
                    (keyup.enter)="applyFilter()"
                    autofocus
                  />
                }
                @case ('projectType') {
                  <p-select
                    [(ngModel)]="pendingType"
                    [options]="projectTypeOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [placeholder]="i18n.t('projects.selectType')"
                    class="popover-input"
                  />
                }
                @case ('from') {
                  <p-datepicker
                    [(ngModel)]="pendingFrom"
                    [showIcon]="true"
                    [placeholder]="i18n.t('projects.startDate')"
                    class="popover-input"
                  />
                }
                @case ('to') {
                  <p-datepicker
                    [(ngModel)]="pendingTo"
                    [showIcon]="true"
                    [placeholder]="i18n.t('projects.endDate')"
                    class="popover-input"
                  />
                }
                @case ('owner') {
                  <p-select
                    [(ngModel)]="pendingOwner"
                    [options]="userOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [placeholder]="i18n.t('projects.selectUser')"
                    [filter]="true"
                    filterBy="label"
                    class="popover-input"
                  />
                }
              }

              <p-button [label]="i18n.t('common.apply')" icon="pi pi-check" size="small" (onClick)="applyFilter()" styleClass="apply-btn" />
            </div>
          }
        </div>
      </p-popover>

      @if (isLoading()) {
        <div class="projects-grid">
          @for (item of [1,2,3,4,5,6]; track item) {
            <p-card class="project-card">
              <p-skeleton height="15rem" class="mb-3" />
              <p-skeleton height="1rem" class="mb-2" />
              <p-skeleton height="1rem" class="mb-2" />
              <p-skeleton height="2rem" width="70%" />
            </p-card>
          }
        </div>
      } @else if (errorMessage()) {
        <p-card class="error-state">
          <div class="error-content">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ errorMessage() }}</span>
          </div>
        </p-card>
      } @else if (projects().length === 0) {
        <p-card class="empty-state">
          <div class="empty-content">
            <i class="pi pi-sun"></i>
            <h2>{{ isAdmin() ? i18n.t('projects.noProjectsFound') : i18n.t('projects.noProjectsYet') }}</h2>
            <p>{{ activeChips().length > 0 ? i18n.t('projects.noMatches') : (isAdmin() ? i18n.t('projects.noAdminProjects') : i18n.t('projects.createFirst')) }}</p>
            @if (!isAdmin()) {
              <p-button [label]="i18n.t('projects.createProject')" icon="pi pi-plus" routerLink="/projects/add" />
            }
          </div>
        </p-card>
      } @else {
        <div class="projects-grid">
          @for (project of projects(); track project.id) {
            <p-card class="project-card hover-lift" [routerLink]="['/projects', project.id]">
              <div class="card-header">
                <div class="project-icon">
                  <i class="pi pi-bolt thumb-icon"></i>
                </div>
                <div class="card-header-actions">
                  <p-tag
                    [value]="project.status | titlecase"
                    [severity]="getStatusSeverity(project.status)"
                  />
                  @if (isAdmin()) {
                    <p-button
                      icon="pi pi-trash"
                      severity="danger"
                      [text]="true"
                      [rounded]="true"
                      [loading]="deletingProjectId() === project.id"
                      [ariaLabel]="i18n.t('projects.deleteProject')"
                      [pTooltip]="i18n.t('projects.deleteProject')"
                      tooltipPosition="top"
                      (click)="deleteProject($event, project)"
                    />
                  }
                </div>
              </div>

              <h3>{{ project.name }}</h3>

              <div class="meta-item">
                <i class="pi pi-map-marker"></i>
                <span>{{ project.location }}</span>
              </div>

              <div class="meta-item">
                <i class="pi pi-calendar"></i>
                <span>{{ project.createdAt | date: 'MMM d, y' }}</span>
              </div>

              @if (isAdmin() && project.ownerEmail) {
                <div class="meta-item">
                  <i class="pi pi-envelope"></i>
                  <span>{{ project.ownerEmail }}</span>
                </div>
              }

              <div class="project-specs">
                <div class="spec-item">
                  <span class="spec-label">{{ i18n.t('projects.panels') }}</span>
                  <span class="spec-value">{{ project.panels }}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">{{ i18n.t('projects.power') }}</span>
                  <span class="spec-value">{{ project.power | number: '1.1-1' }}kW</span>
                </div>
              </div>
            </p-card>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .projects-page {
      padding: 1.25rem;
    }

    .projects-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;

      h1 {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--p-text-color);
        margin: 0 0 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      p {
        margin: 0.5rem 0 0;
        color: var(--p-text-muted-color);
        font-size: 1rem;
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

    /* Card grid */
    .projects-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(auto-fill, minmax(18.75rem, 1fr));
    }

    .error-state {
      .error-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--p-red-700, var(--p-red-500));

        i { color: var(--p-red-500); }
      }
    }

    .empty-state {
      .empty-content {
        min-height: 20rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem;

        i {
          font-size: 4rem;
          color: var(--p-text-muted-color);
          margin-bottom: 1rem;
        }

        h2 {
          margin: 0;
          color: var(--p-text-color);
          font-size: 1.4rem;
          font-weight: 700;
        }

        p {
          margin: 0.75rem 0 1.5rem;
          color: var(--p-text-muted-color);
        }
      }
    }

    .project-card {
      transition: all 0.3s ease;
      cursor: pointer;

      .card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 1rem;
      }

      .card-header-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .project-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        background: color-mix(in srgb, var(--p-yellow-500) 16%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      h3 {
        margin: 0 0 1rem;
        color: var(--p-text-color);
        font-size: 1.25rem;
        font-weight: 700;
        transition: color 0.3s ease;
      }

      &:hover {
        h3 { color: var(--p-primary-600); }
        .thumb-icon { transform: scale(1.1); }
      }
    }

    .thumb-icon {
      font-size: 1.35rem;
      color: var(--p-yellow-500);
      transition: transform 0.3s ease;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      margin-bottom: 0.625rem;

      i { color: var(--p-primary-500); }
    }

    .project-specs {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .spec-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--p-content-hover-background);
      border-radius: 0.5rem;
    }

    .spec-label {
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
      font-weight: 500;
    }

    .spec-value {
      font-size: 1rem;
      font-weight: 700;
      color: var(--p-primary-500);
    }

    :host ::ng-deep {
      .project-card .p-card-body { padding: 1.5rem; }
      .empty-state .p-card-body { padding: 0; }
      .error-state .p-card-body { padding: 1rem; }

      .filter-chip {
        font-size: 0.8rem;
        background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
        color: var(--p-primary-700, var(--p-primary-500));
        border: 1px solid color-mix(in srgb, var(--p-primary-500) 30%, transparent);
      }

      .apply-btn { width: 100%; justify-content: center; }
    }

    @media (max-width: 768px) {
      .projects-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class UserProjectsComponent implements OnInit {
  @ViewChild('addFilterPopover') private addFilterPopover!: Popover;

  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(LanguageService);

  // Core state
  readonly projects = signal<ProjectCardView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly deletingProjectId = signal<string | null>(null);
  readonly isAdmin = signal(false);

  // Filter signals
  readonly filterSearch = signal<string | null>(null);
  readonly filterCountry = signal<string | null>(null);
  readonly filterProjectType = signal<'roof' | 'agrivoltaic' | null>(null);
  readonly filterFrom = signal<Date | null>(null);
  readonly filterTo = signal<Date | null>(null);
  readonly filterOwner = signal<string | null>(null);

  // Users for owner dropdown (admin only)
  private readonly users = signal<UserResponse[]>([]);
  readonly userOptions = computed(() =>
    this.users().map((u) => ({ label: `${u.fullName} (${u.email ?? ''})`, value: u._id }))
  );

  // Popover state
  readonly selectedFilterType = signal<string | null>(null);
  pendingSearch = '';
  pendingCountry = '';
  pendingType: 'roof' | 'agrivoltaic' | null = null;
  pendingFrom: Date | null = null;
  pendingTo: Date | null = null;
  pendingOwner: string | null = null;

  protected readonly projectTypeOptions = computed(() => [
    { label: this.i18n.t('projects.roof'), value: 'roof' },
    { label: this.i18n.t('projects.agrivoltaic'), value: 'agrivoltaic' },
  ]);

  readonly activeChips = computed(() => {
    const chips: { key: string; label: string }[] = [];
    if (this.filterSearch())      chips.push({ key: 'search',      label: `${this.i18n.t('common.search')}: ${this.filterSearch()}` });
    if (this.filterCountry())     chips.push({ key: 'country',     label: `${this.i18n.t('common.country')}: ${this.filterCountry()}` });
    if (this.filterProjectType()) chips.push({ key: 'projectType', label: `${this.i18n.t('common.type')}: ${this.filterProjectType() === 'roof' ? this.i18n.t('projects.roof') : this.i18n.t('projects.agrivoltaic')}` });
    if (this.filterFrom())        chips.push({ key: 'from',        label: `${this.i18n.t('common.from')}: ${this.formatDate(this.filterFrom()!)}` });
    if (this.filterTo())          chips.push({ key: 'to',          label: `${this.i18n.t('common.to')}: ${this.formatDate(this.filterTo()!)}` });
    if (this.filterOwner())       chips.push({ key: 'owner',       label: `${this.i18n.t('common.owner')}: ${this.ownerName()}` });
    return chips;
  });

  readonly availableFilterTypes = computed(() => {
    const all = [
      { key: 'search',      label: this.i18n.t('projects.searchByName'),    icon: 'pi pi-search' },
      { key: 'country',     label: this.i18n.t('common.country'),            icon: 'pi pi-map-marker' },
      { key: 'projectType', label: this.i18n.t('projects.projectType'),       icon: 'pi pi-th-large' },
      { key: 'from',        label: this.i18n.t('projects.installDateFrom'),  icon: 'pi pi-calendar' },
      { key: 'to',          label: this.i18n.t('projects.installDateTo'),    icon: 'pi pi-calendar' },
      ...(this.isAdmin() ? [{ key: 'owner', label: this.i18n.t('common.owner'), icon: 'pi pi-user' }] : []),
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

  private readonly ownerName = computed(() => {
    const id = this.filterOwner();
    if (!id) return '';
    return this.userOptions().find((u) => u.value === id)?.label ?? id;
  });

  ngOnInit(): void {
    const role = this.authService.currentUser()?.role;
    this.isAdmin.set(role === UserRole.ADMIN || this.authService.isAdmin());

    // Pre-apply owner filter from URL param (e.g. navigating from Users list)
    const owner = this.route.snapshot.queryParamMap.get('owner');
    if (owner) {
      this.filterOwner.set(owner);
    }

    if (this.isAdmin()) {
      this.userService.getAllUsers().subscribe({
        next: (resp) => this.users.set(resp.users),
        error: () => {},
      });
    }

    this.loadProjects();
  }

  protected openAddFilter(event: Event): void {
    this.selectedFilterType.set(null);
    this.addFilterPopover.toggle(event);
  }

  protected onPopoverHide(): void {
    this.selectedFilterType.set(null);
    this.pendingSearch = '';
    this.pendingCountry = '';
    this.pendingType = null;
    this.pendingFrom = null;
    this.pendingTo = null;
    this.pendingOwner = null;
  }

  protected applyFilter(): void {
    const type = this.selectedFilterType();
    switch (type) {
      case 'search':      this.filterSearch.set(this.pendingSearch || null); break;
      case 'country':     this.filterCountry.set(this.pendingCountry || null); break;
      case 'projectType': this.filterProjectType.set(this.pendingType); break;
      case 'from':        this.filterFrom.set(this.pendingFrom); break;
      case 'to':          this.filterTo.set(this.pendingTo); break;
      case 'owner':       this.filterOwner.set(this.pendingOwner); break;
    }
    this.addFilterPopover.hide();
    this.loadProjects();
  }

  protected removeFilter(key: string): void {
    switch (key) {
      case 'search':      this.filterSearch.set(null); break;
      case 'country':     this.filterCountry.set(null); break;
      case 'projectType': this.filterProjectType.set(null); break;
      case 'from':        this.filterFrom.set(null); break;
      case 'to':          this.filterTo.set(null); break;
      case 'owner':       this.filterOwner.set(null); break;
    }
    this.loadProjects();
  }

  protected clearAll(): void {
    this.filterSearch.set(null);
    this.filterCountry.set(null);
    this.filterProjectType.set(null);
    this.filterFrom.set(null);
    this.filterTo.set(null);
    this.filterOwner.set(null);
    this.loadProjects();
  }

  protected getStatusSeverity(status: ProjectCardView['status']): 'success' | 'info' | 'contrast' {
    if (status === 'active') return 'success';
    if (status === 'completed') return 'contrast';
    return 'info';
  }

  private loadProjects(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filters = {
      search: this.filterSearch() ?? undefined,
      country: this.filterCountry() ?? undefined,
      projectType: this.filterProjectType() ?? undefined,
      from: this.filterFrom() ? this.filterFrom()!.toISOString() : undefined,
      to: this.filterTo() ? this.filterTo()!.toISOString() : undefined,
    };

    const request$ = this.isAdmin()
      ? this.projectService.getAllProjects(1, 100, { ...filters, owner: this.filterOwner() ?? undefined })
      : this.projectService.getMyProjects(1, 100, filters);

    request$.subscribe({
      next: (response) => {
        if (response && response.data) {
          this.projects.set(response.data.map((p) => this.mapProject(p)));
        } else {
          this.errorMessage.set(this.i18n.t('projects.invalidResponse'));
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.i18n.t('projects.loadFailed'));
        this.isLoading.set(false);
      },
    });
  }

  protected deleteProject(event: Event, project: ProjectCardView): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.isAdmin()) return;

    const confirmed = window.confirm(this.i18n.t('projects.deleteConfirm', { name: project.name }));
    if (!confirmed) return;

    this.deletingProjectId.set(project.id);
    this.projectService.deleteProjectAsAdmin(project.id).subscribe({
      next: () => {
        this.projects.update((list) => list.filter((item) => item.id !== project.id));
        this.deletingProjectId.set(null);
      },
      error: () => {
        this.errorMessage.set(this.i18n.t('projects.deleteFailed'));
        this.deletingProjectId.set(null);
      },
    });
  }

  private mapProject(project: Project): ProjectCardView {
    const source = project as Project & {
      _id?: string;
      country?: string;
      panelNumber?: number;
      installDate?: string;
      tilt?: number;
      direction?: string;
      surface?: number;
      efficiency?: number;
      estimatedOutput?: number;
      panelType?: string;
      panel?: unknown;
      owner?: string | { _id?: string; fullName?: string; email?: string };
      lat?: number;
      lon?: number;
      prodToday?: unknown[];
    };

    const panelData =
      typeof source.panel === 'object' && source.panel !== null
        ? (source.panel as { wattPeak?: number; technology?: string; efficiency?: number })
        : undefined;

    const id = source.id || source._id || '';
    const panels = source.panelNumber ?? 0;
    const panelPower = panelData?.wattPeak ?? 0;
    const power = panels > 0 && panelPower > 0 ? (panels * panelPower) / 1000 : 0;
    const hasProductionData = Array.isArray(source.prodToday) && source.prodToday.length > 0;

    let status: 'planning' | 'active' | 'completed' = 'planning';
    if (hasProductionData) {
      status = 'active';
    } else if (source.installDate && new Date(source.installDate).getTime() < Date.now()) {
      status = 'completed';
    }

    return {
      id,
      name: source.name,
      location: source.country || source.address || this.formatCoordinates(source.lat, source.lon),
      createdAt: String(source.createdAt || new Date().toISOString()),
      panels,
      power,
      status,
      area: source.surface ?? source.polygon?.area ?? 0,
      panelType: source.panelType || panelData?.technology || 'N/A',
      inclination: source.tilt ?? 0,
      orientation: source.direction || source.orientation || 'N/A',
      bifacial: false,
      estimatedOutput: source.estimatedOutput ?? 0,
      efficiency: source.efficiency ?? panelData?.efficiency ?? 0,
      ownerEmail:
        source.owner && typeof source.owner === 'object' && 'email' in source.owner
          ? String((source.owner as { email?: string }).email ?? '')
          : undefined,
    };
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatCoordinates(lat?: number, lon?: number): string {
    if (typeof lat !== 'number' || typeof lon !== 'number') return 'Unknown location';
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
}
