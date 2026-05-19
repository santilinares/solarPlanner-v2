import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'solar-planner-theme';
  readonly isDarkMode = signal(false);

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const dark = saved === 'dark';
    this.isDarkMode.set(dark);
    this._apply(dark);
  }

  toggle(): void {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    localStorage.setItem(this.STORAGE_KEY, next ? 'dark' : 'light');
    this._apply(next);
  }

  private _apply(dark: boolean): void {
    document.documentElement.classList.toggle('dark-mode', dark);
  }
}
