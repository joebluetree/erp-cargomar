import { Location } from '@angular/common';
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { AuthSession } from '../../../core/auth/auth-session';
import { PageTitle } from '../../../shared/ui/page-title/page-title';
import { PageRule } from '../../../shared/ui/page-rule/page-rule';
import { EMPTY_VALUE, HOLIDAY_COLUMNS, NOT_FOUND_TEXT } from './holiday-list.model';
import { HolidayListService } from './holiday-list.service';
import { MENU_CODES, MENU_ID_PARAM } from '../../../core/navigation/menu.model';

/**
 * The Holiday List screen: the holidays of the logged-in user's own branch for the session's financial year, view
 * only. The backend finds the file from the session, so the screen asks for nothing. As in the reference
 * `emp-profile-basic-info.JPG`, the holidays are in one tinted box like the Profile's, in three left-aligned columns
 * in the order of the file: Holiday, Day and Date, each exactly as the file writes it, under the branch's name as
 * the box's header. A branch or year switch shows the new branch's and
 * year's list. Opened from the Branch List with a branch id, it shows that branch's list instead, with a back button
 * to the list.
 */
@Component({
  selector: 'app-holiday-list',
  imports: [NgIcon, HlmButtonImports, HlmCardImports, PageTitle, PageRule],
  providers: [provideIcons({ lucideArrowLeft })],
  templateUrl: './holiday-list.page.html',
})
export class HolidayListPage {
  protected readonly service = inject(HolidayListService);
  private readonly auth = inject(AuthSession);
  private readonly location = inject(Location);
  private readonly router = inject(Router, { optional: true });
  /** True when the user reached this page from another page of the app, so browser history can take them back. */
  private readonly cameFromApp = this.router?.currentNavigation()?.previousNavigation != null;

  /**
   * The branch opened from the Branch List (`/reports/branches/{id}/holidays`, design D4); null on the user's own
   * Holiday List.
   */
  protected readonly branchId = inject(ActivatedRoute, { optional: true })?.snapshot.paramMap.get('id') ?? null;

  protected readonly empty = EMPTY_VALUE;
  protected readonly notFoundText = NOT_FOUND_TEXT;
  protected readonly columns = HOLIDAY_COLUMNS;

  /**
   * What the list belongs to: the session's year, and the session's branch for the user's own list. A listed branch's
   * list belongs to the branch in the URL, so a branch switch does not change it.
   */
  private readonly context = computed(() => {
    const session = this.auth.session();
    return this.branchId ? `${session?.yearId ?? ''}` : `${session?.branchId ?? ''}|${session?.yearId ?? ''}`;
  });

  constructor() {
    this.load();

    // After a switch the list belongs to another file: load the new one.
    let shown = untracked(this.context);
    effect(() => {
      const current = this.context();
      if (current === shown) return;
      shown = current;
      untracked(() => this.load());
    });
  }

  protected reload(): void {
    this.load();
  }

  /**
   * Back to the page the user came from (for a branch, the Branch List as it was left). Opened directly, a branch's
   * list goes to the Branch List and the user's own list to the Dashboard.
   */
  protected back(): void {
    if (this.cameFromApp) {
      this.location.back();
    } else if (this.branchId) {
      void this.router?.navigate(['/reports/branches'], { queryParams: { [MENU_ID_PARAM]: MENU_CODES.branchList } });
    } else {
      void this.router?.navigateByUrl('/');
    }
  }

  private load(): void {
    this.service.load(this.branchId ?? undefined);
  }
}
