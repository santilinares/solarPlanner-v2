import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  template: `
    <div class="landing-page">
      <section class="hero">
        <div class="container">
          <h1>Solar Energy Planning Made Easy</h1>
          <p class="subtitle">
            Design, simulate, and optimize your solar farm projects with our advanced planning tool.
          </p>
          <div class="cta-buttons">
            <a routerLink="/registration" class="btn btn-primary">Get Started</a>
            <a routerLink="/login" class="btn btn-secondary">Sign In</a>
          </div>
        </div>
      </section>

      <section class="features">
        <div class="container">
          <h2>Key Features</h2>
          <div class="feature-grid">
            <div class="feature-card">
              <h3>🗺️ Interactive Mapping</h3>
              <p>Draw and visualize your solar farm layout with precision mapping tools.</p>
            </div>
            <div class="feature-card">
              <h3>📊 Production Analysis</h3>
              <p>Analyze monthly production data and consumption patterns.</p>
            </div>
            <div class="feature-card">
              <h3>⚡ Panel Optimization</h3>
              <p>Choose from a database of solar panels and optimize your configuration.</p>
            </div>
            <div class="feature-card">
              <h3>📄 PDF Reports</h3>
              <p>Generate professional project reports and documentation.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .landing-page {
      .hero {
        background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
        color: white;
        padding: 4rem 0;
        text-align: center;

        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .subtitle {
          font-size: 1.25rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;

          .btn {
            padding: 0.75rem 2rem;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 500;
            transition: transform 0.2s;

            &:hover {
              transform: translateY(-2px);
            }

            &.btn-primary {
              background-color: white;
              color: #1976d2;
            }

            &.btn-secondary {
              background-color: rgba(255,255,255,0.2);
              color: white;
              border: 1px solid white;
            }
          }
        }
      }

      .features {
        padding: 4rem 0;

        h2 {
          text-align: center;
          margin-bottom: 3rem;
          font-size: 2rem;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;

          .feature-card {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);

            h3 {
              margin-bottom: 1rem;
              color: #1976d2;
            }

            p {
              color: #666;
              line-height: 1.6;
            }
          }
        }
      }
    }
  `]
})
export class LandingPageComponent {}
