import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

import { routes } from './app.routes';
import {
  jwtInterceptor,
  apiResponseInterceptor,
  authRefreshInterceptor,
} from './core/interceptors';

const SolarPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#E8F5F0',
            100: '#D1F4E0',
            200: '#95D5B2',
            300: '#74C69D',
            400: '#52B788',
            500: '#2D6A4F',
            600: '#1B4332',
            700: '#081C15',
            800: '#041910',
            900: '#020C08',
            950: '#010604'
        },
        colorScheme: {
            light: {
                surface: {
                    0: '#ffffff',
                    50: '#F0F7F4',
                    100: '#D1F4E0',
                    200: '#95D5B2',
                    300: '#74C69D',
                    400: '#52B788',
                    500: '#2D6A4F',
                    600: '#1B4332',
                    700: '#081C15',
                    800: '#041910',
                    900: '#020C08',
                    950: '#010604'
                }
            },
            dark: {
                surface: {
                    0: '#ffffff',
                    50: '#081C15',
                    100: '#1B4332',
                    200: '#2D6A4F',
                    300: '#52B788',
                    400: '#74C69D',
                    500: '#95D5B2',
                    600: '#D1F4E0',
                    700: '#E8F5F0',
                    800: '#F0F7F4',
                    900: '#ffffff',
                    950: '#F0F7F4'
                }
            }
        }
    }
});

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
