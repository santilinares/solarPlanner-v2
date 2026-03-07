import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-projects-list',
  imports: [CommonModule],
  template: `
    <div class="projects-list">
      <h1>Manage Projects</h1>
      
      <div class="content-placeholder">
        <p>📋 All projects management coming soon</p>
        <p>TODO: Fetch all projects (admin view)</p>
        <p>TODO: Display in data table with sorting</p>
        <p>TODO: Add search and filters by user/date</p>
        <p>TODO: Add delete/disable actions</p>
      </div>
    </div>
  `,
  styles: [`
    .projects-list {
      h1 {
        margin-bottom: 2rem;
      }

      .content-placeholder {
        background: var(--p-surface-0);
        padding: 3rem;
        border-radius: 8px;
        text-align: center;
        color: var(--p-text-muted-color);

        p {
          margin: 1rem 0;
        }
      }
    }
  `]
})
export class ProjectsListComponent {}
