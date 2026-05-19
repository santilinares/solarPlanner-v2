import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { AuthService, ProjectService } from '@core/services';
import { TranslateModule } from '@ngx-translate/core';

interface DashboardData {
  totalProjects: number;
  totalPanels: number;
  totalCapacity: number;
  totalProduction: number;
  recentProjects: Array<{
    _id: string;
    name: string;
    country?: string;
    surface?: number;
  }>;
  todayProduction: number;
  next6DaysTotal: number;
  past6DaysTotal: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CardModule, SkeletonModule, MessageModule, ButtonModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);

  // Exposed for template greeting.
  readonly user = this.authService.currentUser;

  stats = signal<DashboardData | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL_MS = 60_000;

  ngOnInit(): void {
    this.loadDashboard();
    this.pollInterval = setInterval(() => this.loadDashboard(), this.POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  private loadDashboard(): void {
    this.projectService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load dashboard data');
        this.loading.set(false);
      }
    });
  }
}
