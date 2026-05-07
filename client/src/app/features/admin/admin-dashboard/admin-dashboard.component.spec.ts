import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { UserService } from '@core/services/user.service';
import { ProjectService } from '@core/services/project.service';
import { PanelService } from '@core/services/panel.service';
import { DashboardStats } from '@core/models';

describe('AdminDashboardComponent', () => {
  let mockUserService: { getAllUsers: jest.Mock };
  let mockProjectService: { getAdminDashboardStats: jest.Mock };
  let mockPanelService: { getAllPanels: jest.Mock };

  function buildComponent() {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  async function setup(
    usersResult: Observable<unknown>,
    statsResult: Observable<unknown>,
    panelsResult: Observable<unknown>,
  ) {
    mockUserService = { getAllUsers: jest.fn().mockReturnValue(usersResult) };
    mockProjectService = { getAdminDashboardStats: jest.fn().mockReturnValue(statsResult) };
    mockPanelService = { getAllPanels: jest.fn().mockReturnValue(panelsResult) };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: mockUserService },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: PanelService, useValue: mockPanelService },
      ],
    }).compileComponents();
  }

  it('calls all three services via forkJoin on construction', async () => {
    await setup(
      of({ users: [], total: 5 }),
      of({ totalProjects: 10 } as DashboardStats),
      of({ panels: [], total: 3 }),
    );
    buildComponent();

    expect(mockUserService.getAllUsers).toHaveBeenCalled();
    expect(mockProjectService.getAdminDashboardStats).toHaveBeenCalled();
    expect(mockPanelService.getAllPanels).toHaveBeenCalled();
  });

  it('populates count signals and clears loading on success', async () => {
    await setup(
      of({ users: [], total: 42 }),
      of({ totalProjects: 17 } as DashboardStats),
      of({ panels: [], total: 8 }),
    );
    const component = buildComponent();

    expect(component.usersCount()).toBe(42);
    expect(component.projectsCount()).toBe(17);
    expect(component.panelsCount()).toBe(8);
    expect(component.loading()).toBe(false);
  });

  it('clears loading flag even when a service call fails', async () => {
    await setup(
      throwError(() => new Error('Network error')),
      of({ totalProjects: 0 } as DashboardStats),
      of({ panels: [], total: 0 }),
    );
    const component = buildComponent();

    expect(component.loading()).toBe(false);
  });
});
