import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '@core/services';

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
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CardModule, SkeletonModule, MessageModule, ButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  stats = signal<DashboardData | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit(): void {
    this.loadDashboard();
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
