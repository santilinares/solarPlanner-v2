import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-project',
  imports: [CommonModule],
  template: `
    <div class="view-project">
      <h1>Project Details</h1>
      
      <div class="content-placeholder">
        <p>📊 Project details coming soon</p>
        <p>TODO: Fetch project by ID from route params</p>
        <p>TODO: Display project information</p>
        <p>TODO: Show map with drawn polygon</p>
        <p>TODO: Display production charts</p>
        <p>TODO: Add PDF generation button</p>
        <p>TODO: Add edit/delete actions</p>
      </div>
    </div>
  `,
  styles: [`
    .view-project {
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
export class ViewProjectComponent {}
