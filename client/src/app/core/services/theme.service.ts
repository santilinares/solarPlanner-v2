import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this._apply(this._mediaQuery.matches);
    this._mediaQuery.addEventListener('change', (e) => this._apply(e.matches));
  }

  private _apply(dark: boolean): void {
    document.documentElement.classList.toggle('dark-mode', dark);
  }
}
