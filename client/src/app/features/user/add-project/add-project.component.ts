import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-project',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="add-project">
      <h1>Create New Project</h1>
      
      <div class="content-placeholder">
        <p>🗺️ Map integration coming soon</p>
        <p>TODO: Implement Leaflet map with drawing tools</p>
        <p>TODO: Panel selection dropdown</p>
        <p>TODO: Project form (name, address, consumption)</p>
        <p>TODO: Calculate production data</p>
      </div>
    </div>
  `,
  styles: [`
    .add-project {
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
          font-size: 1.1rem;
        }
      }
    }
  `]
})
export class AddProjectComponent {}
