import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _query = window.matchMedia('(prefers-color-scheme: dark)');
  readonly isDarkMode = signal(this._query.matches);

  constructor() {
    this._query.addEventListener('change', (e) => this.isDarkMode.set(e.matches));
  }
}
