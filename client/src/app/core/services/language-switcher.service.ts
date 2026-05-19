import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageSwitcherService {
  private readonly translate = inject(TranslateService);

  switchLanguage(lang: 'en' | 'es'): void {
    this.translate.use(lang);
  }

  initFromUser(lang: 'en' | 'es'): void {
    this.translate.use(lang);
  }
}
