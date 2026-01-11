import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-panel-list',
  imports: [CommonModule],
  template: `
    <div class="panel-list">
      <h1>Solar Panels</h1>
      
      <div class="content-placeholder">
        <p>⚡ Panel catalog coming soon</p>
        <p>TODO: Fetch panels from PanelService</p>
        <p>TODO: Display panels in grid</p>
        <p>TODO: Add search and filters</p>
        <p>TODO: Show panel specifications</p>
      </div>
    </div>
  `,
  styles: [`
    .panel-list {
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
export class PanelListComponent {}
