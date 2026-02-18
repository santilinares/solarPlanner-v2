import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import {
  jwtInterceptor,
  apiResponseInterceptor,
  authRefreshInterceptor,
} from './core/interceptors';
import { SolarPreset } from '../styles/primeng-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([jwtInterceptor, authRefreshInterceptor, apiResponseInterceptor])
    ),
    providePrimeNG({
        theme: {
            preset: SolarPreset,
            options: {
                darkModeSelector: '.dark-mode',
                cssLayer: {
                    name: 'primeng',
                    order: 'theme, primeng'
                }
            }
        }
    })
  ],
};
