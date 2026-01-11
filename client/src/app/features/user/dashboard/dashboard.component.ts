import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  imports: [],
  template: `
    <div class="dashboard">
      <h1>User Dashboard</h1>
      <p>Welcome to Solar Planner v2.0!</p>
      
      <div class="dashboard-grid">
        <div class="dashboard-card">
          <h3>My Projects</h3>
          <p class="stat">0</p>
          <a href="/projects/all" class="card-link">View all →</a>
        </div>
        
        <div class="dashboard-card">
          <h3>Total Production</h3>
          <p class="stat">0 kWh</p>
        </div>
        
        <div class="dashboard-card">
          <h3>Active Panels</h3>
          <p class="stat">0</p>
        </div>
      </div>
      
      <!-- TODO: Add recent projects list -->
      <!-- TODO: Add production charts -->
    </div>
  `,
  styles: [`
    .dashboard {
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
            color: #1976d2;
            margin: 0;
          }

          .card-link {
            display: inline-block;
            margin-top: 1rem;
            color: #1976d2;
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
export class DashboardComponent {}
