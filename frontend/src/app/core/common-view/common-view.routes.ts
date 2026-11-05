import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, Routes } from '@angular/router';
import { MENU_NOT_AVAILABLE_MESSAGE } from '../../features/admin/login/auto-login.guard';
import { COMMON_VIEW_MESSAGE_PATH, COMMON_VIEW_REASON_PARAM, commonViewGuard } from './common-view.guards';

/** The message for a link without a valid APPDETAILS row. */
export const LINK_INVALID_MESSAGE = 'This link is not valid.';

/**
 * What the common view shows when it cannot open the screen (admin-common-endpoint): one message on a bare page, with
 * no login form, Dashboard or link to another screen. `?reason=link` when the link has no app id or its APPDETAILS row
 * is not valid; any other reason, or none, when the menu is missing or not in the user's menu.
 */
@Component({
  selector: 'app-common-view-message',
  template: `<p role="status" data-slot="common-view-message" class="p-6 text-muted-foreground">{{ message }}</p>`,
})
export class CommonViewMessagePage {
  private readonly reason = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap.get(COMMON_VIEW_REASON_PARAM);

  protected readonly message = this.reason === 'link' ? LINK_INVALID_MESSAGE : MENU_NOT_AVAILABLE_MESSAGE;
}

/**
 * The routes under `/view`, outside the shell and without a session guard (admin-common-endpoint design D2):
 * - `/view?appid=…&menuid=…`: the common view. Its guard starts the session and always redirects, so it renders nothing;
 * - the message shown when the screen cannot be opened;
 * - any other path under `/view` shows "The requested screen is not available.", without the query.
 */
export const COMMON_VIEW_ROUTES: Routes = [
  { path: '', pathMatch: 'full', canActivate: [commonViewGuard], children: [] },
  { path: COMMON_VIEW_MESSAGE_PATH, component: CommonViewMessagePage },
  { path: '**', redirectTo: () => inject(Router).createUrlTree(['/view', COMMON_VIEW_MESSAGE_PATH]) },
];
