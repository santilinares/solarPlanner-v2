import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/services/auth.service';
import { UserResponse } from '@core/models';

@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="users-list animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1>
            <i class="pi pi-users icon-danger"></i>
            User Management
          </h1>
          <p class="subtitle">
            {{ loading() ? 'Loading...' : allUsers().length + ' users registered' }}
          </p>
        </div>
        <div class="header-actions">
          <p-button
            label="Export CSV"
            icon="pi pi-download"
            severity="secondary"
            [outlined]="true"
            [disabled]="loading() || filteredUsers().length === 0"
            (onClick)="exportCsv()"
          />
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="filters">
          <p-iconfield>
            <p-inputicon styleClass="pi pi-search" />
            <input
              pInputText
              type="text"
              placeholder="Search by name or email…"
              [value]="searchTerm()"
              (input)="searchTerm.set($any($event.target).value)"
              class="search-input"
            />
          </p-iconfield>

          <p-select
            [options]="roleOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All roles"
            [showClear]="true"
            [ngModel]="roleFilter()"
            (ngModelChange)="roleFilter.set($event)"
            appendTo="body"
            class="role-filter"
          />
        </div>

        @if (selectedUsers().length > 0) {
          <p-button
            [label]="'Delete ' + selectedUsers().length + ' selected'"
            icon="pi pi-trash"
            severity="danger"
            [outlined]="true"
            (onClick)="confirmBulkDelete()"
          />
        }
      </div>

      <!-- Table -->
      <p-card class="table-card">
        @if (loading()) {
          <div class="skeleton-rows">
            @for (i of skeletonRows; track i) {
              <div class="skeleton-row">
                <p-skeleton shape="circle" size="2.5rem" />
                <div class="skeleton-text">
                  <p-skeleton height="0.9rem" width="8rem" />
                  <p-skeleton height="0.75rem" width="12rem" styleClass="mt-1" />
                </div>
                <p-skeleton height="1.5rem" width="5rem" borderRadius="1rem" />
                <p-skeleton height="1.5rem" width="4rem" borderRadius="1rem" />
                <p-skeleton height="0.9rem" width="6rem" />
                <p-skeleton height="2rem" width="7rem" borderRadius="0.5rem" />
              </div>
            }
          </div>
        } @else {
          <p-table
            [value]="filteredUsers()"
            [(selection)]="selectedUsersModel"
            (selectionChange)="selectedUsers.set($event)"
            dataKey="_id"
            [paginator]="true"
            [rows]="10"
            [rowsPerPageOptions]="[10, 25, 50]"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="{first}–{last} of {totalRecords} users"
            [sortField]="'fullName'"
            [sortOrder]="1"
            styleClass="p-datatable-sm"
          >
            <ng-template #header>
              <tr>
                <th style="width: 3rem">
                  <p-tableHeaderCheckbox />
                </th>
                <th pSortableColumn="fullName">
                  Name <p-sortIcon field="fullName" />
                </th>
                <th>Email</th>
                <th>Method</th>
                <th pSortableColumn="role">
                  Role <p-sortIcon field="role" />
                </th>
                <th pSortableColumn="projectCount">
                  Projects <p-sortIcon field="projectCount" />
                </th>
                <th pSortableColumn="createdAt">
                  Joined <p-sortIcon field="createdAt" />
                </th>
                <th style="width: 10rem">Actions</th>
              </tr>
            </ng-template>

            <ng-template #body let-user>
              <tr>
                <!-- Checkbox -->
                <td>
                  <p-tableCheckbox [value]="user" [disabled]="isSelf(user)" />
                </td>

                <!-- Name + avatar -->
                <td>
                  <div class="user-cell">
                    <div class="avatar" [class]="'avatar-' + user.role">
                      {{ user.fullName.charAt(0).toUpperCase() }}
                    </div>
                    <span class="user-name">{{ user.fullName }}</span>
                  </div>
                </td>

                <!-- Email -->
                <td>
                  <span class="email-text">{{ user.email ?? '—' }}</span>
                </td>

                <!-- Auth method -->
                <td>
                  @if (user.method === 'google') {
                    <p-tag value="Google" severity="info" icon="pi pi-google" />
                  } @else {
                    <p-tag value="Local" severity="secondary" icon="pi pi-key" />
                  }
                </td>

                <!-- Role -->
                <td>
                  @if (user.role === 'admin') {
                    <p-tag value="Admin" severity="danger" icon="pi pi-shield" />
                  } @else {
                    <p-tag value="User" severity="info" icon="pi pi-user" />
                  }
                </td>

                <!-- Projects -->
                <td>
                  <span class="project-count">{{ user.projectCount ?? 0 }}</span>
                </td>

                <!-- Joined -->
                <td>
                  <span class="date-text">{{ user.createdAt | date: 'mediumDate' }}</span>
                </td>

                <!-- Actions -->
                <td>
                  <div class="action-buttons">
                    <p-button
                      [icon]="user.role === 'admin' ? 'pi pi-user-minus' : 'pi pi-user-plus'"
                      [severity]="user.role === 'admin' ? 'warn' : 'success'"
                      [pTooltip]="user.role === 'admin' ? 'Revoke admin' : 'Promote to admin'"
                      tooltipPosition="top"
                      [rounded]="true"
                      [text]="true"
                      [disabled]="isSelf(user)"
                      (onClick)="toggleRole(user)"
                    />
                    <p-button
                      icon="pi pi-folder-open"
                      severity="secondary"
                      pTooltip="View projects"
                      tooltipPosition="top"
                      [rounded]="true"
                      [text]="true"
                      (onClick)="viewProjects(user)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      severity="danger"
                      pTooltip="Delete user"
                      tooltipPosition="top"
                      [rounded]="true"
                      [text]="true"
                      [disabled]="isSelf(user)"
                      (onClick)="confirmDelete(user)"
                    />
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template #empty>
              <tr>
                <td colspan="8" class="empty-state">
                  <i class="pi pi-search empty-icon"></i>
                  <p>No users match your search.</p>
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </p-card>
    </div>

    <p-confirmDialog />
  `,
  styles: [`
    .users-list {
      padding: 1rem;

      .icon-danger { color: var(--p-red-500); }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;

        h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--p-text-color);
          margin: 0 0 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .subtitle {
          color: var(--p-text-muted-color);
          margin: 0;
          font-size: 1rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }
      }

      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;

        .filters {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          flex: 1;

          .search-input { min-width: 16rem; }
          .role-filter { min-width: 10rem; }
        }
      }

      .table-card {
        .skeleton-rows {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.5rem 0;
        }

        .skeleton-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 0;

          .skeleton-text {
            flex: 1;
          }
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .avatar {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .avatar-admin {
          background: color-mix(in srgb, var(--p-red-500) 15%, transparent);
          color: var(--p-red-600);
        }

        .avatar-user {
          background: color-mix(in srgb, var(--p-primary-500) 15%, transparent);
          color: var(--p-primary-600);
        }

        .user-name {
          font-weight: 600;
          color: var(--p-text-color);
        }

        .email-text {
          color: var(--p-text-muted-color);
          font-size: 0.9rem;
        }

        .project-count {
          font-weight: 600;
          color: var(--p-text-color);
        }

        .date-text {
          color: var(--p-text-muted-color);
          font-size: 0.875rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        .empty-state {
          text-align: center;
          padding: 3rem !important;
          color: var(--p-text-muted-color);

          .empty-icon {
            font-size: 2.5rem;
            display: block;
            margin-bottom: 0.75rem;
            opacity: 0.4;
          }

          p { margin: 0; font-size: 1rem; }
        }
      }

      @media (max-width: 768px) {
        padding: 0.5rem;

        .page-header h1 { font-size: 2rem; }

        .toolbar {
          flex-direction: column;
          align-items: stretch;

          .filters { flex-direction: column; }
          .search-input, .role-filter { min-width: unset; width: 100%; }
        }
      }
    }
  `]
})
export class UsersListComponent {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly allUsers = signal<UserResponse[]>([]);
  readonly searchTerm = signal('');
  readonly roleFilter = signal<'user' | 'admin' | null>(null);
  readonly selectedUsers = signal<UserResponse[]>([]);

  // Two-way binding bridge for p-table [(selection)]
  get selectedUsersModel(): UserResponse[] { return this.selectedUsers(); }
  set selectedUsersModel(val: UserResponse[]) { this.selectedUsers.set(val); }

  readonly filteredUsers = computed(() => {
    let users = this.allUsers();
    const term = this.searchTerm().trim().toLowerCase();
    const role = this.roleFilter();
    if (term) {
      users = users.filter(u =>
        u.fullName.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }
    if (role) {
      users = users.filter(u => u.role === role);
    }
    return users;
  });

  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  protected readonly roleOptions = [
    { label: 'Users', value: 'user' },
    { label: 'Admins', value: 'admin' },
  ];

  constructor() {
    this.userService.getAllUsers()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (res) => {
          this.allUsers.set(res.users);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  protected isSelf(user: UserResponse): boolean {
    return this.authService.currentUser()?.id === user._id;
  }

  protected toggleRole(user: UserResponse): void {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    this.userService.updateUserRole(user._id, newRole).subscribe({
      next: (updated) => {
        this.allUsers.update(users =>
          users.map(u => u._id === updated._id ? updated : u)
        );
        this.selectedUsers.update(sel =>
          sel.map(u => u._id === updated._id ? updated : u)
        );
      },
    });
  }

  protected confirmDelete(user: UserResponse): void {
    this.confirmationService.confirm({
      message: `Delete <strong>${user.fullName}</strong>? This cannot be undone.`,
      header: 'Delete User',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteUser(user),
    });
  }

  protected confirmBulkDelete(): void {
    const count = this.selectedUsers().length;
    this.confirmationService.confirm({
      message: `Delete <strong>${count} selected user${count > 1 ? 's' : ''}</strong>? This cannot be undone.`,
      header: 'Delete Users',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete all',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const deletes$ = this.selectedUsers().map(u => this.userService.deleteUser(u._id));
        forkJoin(deletes$).subscribe({
          next: () => {
            const deletedIds = new Set(this.selectedUsers().map(u => u._id));
            this.allUsers.update(users => users.filter(u => !deletedIds.has(u._id)));
            this.selectedUsers.set([]);
          },
        });
      },
    });
  }

  protected viewProjects(user: UserResponse): void {
    void this.router.navigate(['/projects/all'], { queryParams: { owner: user._id } });
  }

  protected exportCsv(): void {
    const headers = ['Name', 'Email', 'Role', 'Auth Method', 'Projects', 'Joined'];
    const rows = this.filteredUsers().map(u => [
      `"${u.fullName}"`,
      u.email ?? '',
      u.role,
      u.method,
      u.projectCount ?? 0,
      new Date(u.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private deleteUser(user: UserResponse): void {
    this.userService.deleteUser(user._id).subscribe({
      next: () => {
        this.allUsers.update(users => users.filter(u => u._id !== user._id));
        this.selectedUsers.update(sel => sel.filter(u => u._id !== user._id));
      },
    });
  }
}
