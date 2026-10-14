import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
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
}
