import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-projects',
  imports: [CommonModule],
  template: `
    <div class="user-projects">
      <h1>My Projects</h1>
      
      <div class="content-placeholder">
        <p>📋 Project list coming soon</p>
        <p>TODO: Fetch projects from ProjectService</p>
        <p>TODO: Display projects in cards/table</p>
        <p>TODO: Add filters and search</p>
        <p>TODO: Add pagination</p>
      </div>
    </div>
  `,
  styles: [`
    .user-projects {
      h1 {
        margin-bottom: 2rem;
      }

      .content-placeholder {
        background: white;
        padding: 3rem;
        border-radius: 8px;
        text-align: center;
        color: #666;

        p {
          margin: 1rem 0;
        }
      }
    }
  `]
})
export class UserProjectsComponent {}
