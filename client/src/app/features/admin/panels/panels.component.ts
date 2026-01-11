import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-panels',
  imports: [CommonModule],
  template: `
    <div class="panels-admin">
      <div class="header">
        <h1>Manage Panels</h1>
        <button class="btn btn-primary">+ Add Panel</button>
      </div>
      
      <div class="content-placeholder">
        <p>⚡ Panel management coming soon</p>
        <p>TODO: Fetch all panels from PanelService</p>
        <p>TODO: Display in editable table</p>
        <p>TODO: Add create panel form</p>
        <p>TODO: Add edit/update actions</p>
        <p>TODO: Add delete action with confirmation</p>
      </div>
    </div>
  `,
  styles: [`
    .panels-admin {
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;

        h1 {
          margin: 0;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;

          &.btn-primary {
            background-color: #c62828;
            color: white;

            &:hover {
              background-color: #b71c1c;
            }
          }
        }
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
export class PanelsComponent {}
