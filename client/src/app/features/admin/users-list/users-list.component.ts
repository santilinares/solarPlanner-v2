import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users-list',
  imports: [CommonModule],
  template: `
    <div class="users-list">
      <h1>Manage Users</h1>
      
      <div class="content-placeholder">
        <p>👥 User management coming soon</p>
        <p>TODO: Fetch all users from UserService</p>
        <p>TODO: Display in data table</p>
        <p>TODO: Add activate/deactivate toggle</p>
        <p>TODO: Add role management</p>
        <p>TODO: Add delete user action</p>
      </div>
    </div>
  `,
  styles: [`
    .users-list {
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
export class UsersListComponent {}
