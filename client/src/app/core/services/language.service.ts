import { Injectable, computed, signal } from '@angular/core';
import { SupportedLanguage } from '@core/models';
import { TRANSLATIONS, TranslationParams } from '../i18n/translations';

const STORAGE_KEY = 'solar-planner-language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly languageSignal = signal<SupportedLanguage>(this.getInitialLanguage());

  readonly currentLanguage = this.languageSignal.asReadonly();
  readonly isSpanish = computed(() => this.currentLanguage() === 'es');

  setLanguage(language: SupportedLanguage): void {
    this.languageSignal.set(language);
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }

  t(key: string, params: TranslationParams = {}): string {
    const language = this.currentLanguage();
    const template = TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key;

    return Object.entries(params).reduce(
      (text, [paramKey, value]) => text.replaceAll(`{${paramKey}}`, String(value ?? '')),
      template
    );
  }

  private getInitialLanguage(): SupportedLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    const language = stored === 'es' || stored === 'en' ? stored : DEFAULT_LANGUAGE;
    document.documentElement.lang = language;
    return language;
  }
}
