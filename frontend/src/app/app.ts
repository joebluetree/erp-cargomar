import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { HistoryEpoch } from './core/navigation/history-epoch';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmToasterImports],
  template: `
    <router-outlet />
    <hlm-toaster position="top-right" [theme]="themeService.theme()" />
  `,
})
export class App {
  protected readonly themeService = inject(ThemeService);

  constructor() {
    // Created with the app, so every history entry from the first one on carries its history epoch.
    inject(HistoryEpoch);
  }
}
