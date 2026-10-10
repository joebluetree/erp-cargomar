import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMenu, lucideMoon, lucideSun } from '@ng-icons/lucide';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { ThemeService } from '../core/theme/theme.service';
import { AppIconTone } from '../shared/ui/icon-tone/icon-tone';
import { AppNav } from './app-nav';

/**
 * The frame around every page: header, sidebar and content area.
 * At 768px and wider (Tailwind `md`) the sidebar sits beside the content and the header hamburger hides and shows it;
 * below that the sidebar is hidden and the header hamburger opens it as a sheet. The choice to hide the sidebar lives
 * here, in the component that stays alive across routes, so it is kept while the application stays open and is gone
 * after a reload. The header also holds the light/dark theme switch.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, NgIcon, HlmButtonImports, HlmSheetImports, AppNav, AppIconTone],
  providers: [provideIcons({ lucideMenu, lucideMoon, lucideSun })],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly themeService = inject(ThemeService);

  protected readonly menuOpen = signal(false);

  /** Whether the sidebar is shown on a wide screen. Starts shown; the wide-screen hamburger flips it. */
  protected readonly sidebarOpen = signal(true);
  protected readonly sidebarLabel = computed(() => (this.sidebarOpen() ? 'Hide navigation bar' : 'Show navigation bar'));

  /** The icon shows the theme the user will switch to. */
  protected readonly themeIcon = computed(() => (this.themeService.theme() === 'dark' ? 'lucideSun' : 'lucideMoon'));
  protected readonly themeLabel = computed(() =>
    this.themeService.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
  );

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
  }
}
