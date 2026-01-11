import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  template: `
    <div class="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <div class="dashboard-grid">
        <div class="dashboard-card">
          <h3>Total Users</h3>
          <p class="stat">0</p>
          <a href="/admin/users" class="card-link">Manage →</a>
        </div>
        
        <div class="dashboard-card">
          <h3>Total Projects</h3>
          <p class="stat">0</p>
          <a href="/admin/projects" class="card-link">Manage →</a>
        </div>
        
        <div class="dashboard-card">
          <h3>Panel Types</h3>
          <p class="stat">0</p>
          <a href="/admin/panels" class="card-link">Manage →</a>
        </div>
      </div>
      
      <!-- TODO: Add admin statistics charts -->
      <!-- TODO: Add recent activity log -->
    </div>
  `,
  styles: [`
    .admin-dashboard {
      h1 {
        margin-bottom: 2rem;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-top: 2rem;

        .dashboard-card {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);

          h3 {
            margin-bottom: 1rem;
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
          }

          .stat {
            font-size: 2.5rem;
            font-weight: bold;
            color: #c62828;
            margin: 0;
          }

          .card-link {
            display: inline-block;
            margin-top: 1rem;
            color: #c62828;
            text-decoration: none;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
  `]
})
export class AdminDashboardComponent {}
