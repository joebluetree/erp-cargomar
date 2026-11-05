import { Location } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { LOGIN_REQUEST } from '../../core/auth/auth.interceptors';
import { SKIP_ERROR_NOTIFICATION } from '../../core/errors/http-error.interceptor';
import { MENU_ID_PARAM } from '../../core/navigation/menu.model';
import { MenuService } from '../../core/navigation/menu.service';
import { LoginResponse } from '../admin/login/login.model';

/** The path of the message page under `/view`, and the query parameter that says which message it shows. */
export const COMMON_VIEW_MESSAGE_PATH = 'unavailable';
export const COMMON_VIEW_REASON_PARAM = 'reason';

/** `link`: the link has no app id, or its APPDETAILS row is not valid. Without a reason: the menu is not available. */
export type CommonViewReason = 'link';

/**
 * The common view (admin-common-endpoint design D2): `/view?appid=…&menuid=…`, which the old system opens to show one
 * menu screen. It always redirects, replacing the `/view` address in the history:
 *
 * 1. Without an `appid` it shows "This link is not valid.", without a request.
 * 2. It asks `admin/login/common-view` for the APPDETAILS row's details (user, company, branch, year). Nobody is
 *    logged in and no token is issued: the details are kept with the app id in place of any session the tab has,
 *    marked `commonView` so the Shell shows only the content, and every request then sends the app id, which the
 *    backend checks each time. A refused or failed request shows "This link is not valid." and keeps nothing.
 * 3. It finds `menuid` (or `menuId`, any letter case) in the user's menu and opens that menu's route with its URL
 *    parameter, `/<route>?menuId=<code>`, as a menu link does. The menu's route, rights and screen then work as usual.
 *    A missing menu, or one that is not in the user's menu, shows "The requested screen is not available."
 *
 * Every other parameter of the link is dropped.
 */
export const commonViewGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const auth = inject(AuthSession);
  const menu = inject(MenuService);
  const show = (reason?: CommonViewReason) =>
    new RedirectCommand(
      router.createUrlTree(['/view', COMMON_VIEW_MESSAGE_PATH], { queryParams: reason ? { [COMMON_VIEW_REASON_PARAM]: reason } : {} }),
      { replaceUrl: true },
    );

  const appId = (route.queryParamMap.get('appid') ?? '').trim();
  if (!appId) return show('link');

  try {
    // A login request: sent without the tab's token, and its 401 is a refused link, not an expired session.
    const context = new HttpContext().set(LOGIN_REQUEST, true).set(SKIP_ERROR_NOTIFICATION, true);
    const details = await firstValueFrom(http.post<LoginResponse['session']>('admin/login/common-view', { appId }, { context }));
    auth.start({ token: '', expiresAt: '', ...details, appId, commonView: true });
  } catch {
    return show('link');
  }

  const code = (route.queryParamMap.get('menuid') ?? route.queryParamMap.get(MENU_ID_PARAM) ?? '').trim().toUpperCase();
  if (!code) return show();
  // The user's menu has only the menus they may open in the session branch, each with its route.
  await menu.whenLoaded();
  const entry = menu.entries().find((e) => e.code.trim().toUpperCase() === code);
  return entry
    ? new RedirectCommand(router.createUrlTree(['/' + entry.route], { queryParams: { [MENU_ID_PARAM]: entry.code } }), {
        replaceUrl: true,
      })
    : show();
};

/**
 * On the Dashboard: the common view has no Dashboard (admin-common-endpoint). A screen's Back, or any other way to the
 * Dashboard, goes to the previous page in the browser's history instead, such as the page that opened the link.
 */
export const commonViewNoDashboardGuard: CanActivateFn = () => {
  if (inject(AuthSession).session()?.commonView !== true) return true;
  inject(Location).back();
  return false;
};
