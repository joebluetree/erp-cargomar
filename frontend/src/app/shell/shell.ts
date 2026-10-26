import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeftRight, lucideBuilding2, lucideCalendarDays, lucideLogOut, lucideMenu, lucideMoon, lucideSun, lucideUser } from '@ng-icons/lucide';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { AuthSession } from '../core/auth/auth-session';
import { ThemeService } from '../core/theme/theme.service';
import { AppIconTone } from '../shared/ui/icon-tone/icon-tone';
import { AppNav } from './app-nav';
import { LoadingService } from '../core/loading/loading.service';
import { LoadingBar } from '../shared/ui/loading-bar/loading-bar';
import { LoadingOverlay } from '../shared/ui/loading-overlay/loading-overlay';

/**
 * The frame around every page: header, sidebar and content area.
 * At 768px and wider (Tailwind `md`) the sidebar sits beside the content and the header hamburger hides and shows it;
 * below that the sidebar is hidden and the header hamburger opens it as a sheet. The choice to hide the sidebar lives
 * here, in the component that stays alive across routes, so it is kept while the application stays open and is gone
 * after a reload. The header's title is the logged-in company; it also holds the user, branch and year, Change branch,
 * the light/dark theme switch and Log out.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, NgIcon, HlmButtonImports, HlmSheetImports, AppNav, AppIconTone, LoadingBar, LoadingOverlay],
  providers: [provideIcons({ lucideArrowLeftRight, lucideBuilding2, lucideCalendarDays, lucideLogOut, lucideMenu, lucideMoon, lucideSun, lucideUser })],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly dialogs = inject(HlmDialogService);
  protected readonly auth = inject(AuthSession);
  protected readonly loading = inject(LoadingService);

  /** The header's main title: the logged-in company, or the fixed name when there is no session. */
  protected readonly title = computed(() => this.auth.details()?.company || 'Cargomar Pvt Ltd');

  /** The session details in one line, for the tooltip and screen readers. */
  protected readonly detailsText = computed(() => {
    const d = this.auth.details();
    return d ? `${d.user}, ${d.branch}, ${d.year}` : '';
  });

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

  /**
   * Opens the Change Branch dialog. The feature is loaded on first use, so it stays out of the main bundle and the
   * shell does not depend on it statically. The dialog gives the focus back to this button when it closes.
   */
  protected async changeBranch(): Promise<void> {
    const { ChangeBranchDialog } = await import('../features/admin/change-branch/change-branch.dialog');
    // 36rem, so each label fits on the same line as its field. The dialog caps itself at 28rem from `sm` up, so the cap
    // is raised too (the classes are merged); on narrow screens it still stays within the window.
    this.dialogs.open(ChangeBranchDialog, { contentClass: 'w-xl sm:max-w-xl' });
  }

  /** Ends the session in this browser and shows the login screen; Back cannot return to the app (the guard). */
  protected logout(): void {
    this.auth.end();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
