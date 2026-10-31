import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageRule } from '../../../shared/ui/page-rule/page-rule';
import { PageTitle } from '../../../shared/ui/page-title/page-title';
import { headingText } from '../../../core/announcement/announcement.model';
import { NotificationScreenService } from './notification.service';

/**
 * The Notification screen: the latest announcement, opened from the bar above the header (admin-notify-bar design D5).
 * Its heading (the banner without one) heads one box like the Holiday List's, with the content below it. Both are shown
 * exactly as entered, with their spaces and line breaks and no line wrapped, and the box fits them: as wide as the
 * longest line and as high as the lines (a line wider than the screen scrolls sideways). View only, and open to every
 * logged-in user.
 */
@Component({
  selector: 'app-notification',
  imports: [NgIcon, HlmButtonImports, HlmCardImports, PageTitle, PageRule],
  providers: [provideIcons({ lucideArrowLeft })],
  templateUrl: './notification.page.html',
})
export class NotificationPage {
  protected readonly service = inject(NotificationScreenService);
  protected readonly headingText = headingText;
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  /** True when the user reached this page from another page of the app, so browser history can take them back. */
  private readonly cameFromApp = this.router.currentNavigation()?.previousNavigation != null;

  constructor() {
    this.service.load();
  }

  protected reload(): void {
    this.service.load();
  }

  /** Back to the page the user came from, or the Dashboard when this page was opened directly. */
  protected back(): void {
    if (this.cameFromApp) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/');
    }
  }
}
