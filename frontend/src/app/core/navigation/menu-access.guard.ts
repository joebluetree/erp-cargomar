import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateChildFn, RedirectCommand, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SKIP_ERROR_NOTIFICATION } from '../errors/http-error.interceptor';
import { MENU_CODE_DATA, MENU_ID_PARAM, MenuCodeRights, RELATED_MENU_CODES_DATA } from './menu.model';
import { MenuRightsStore } from './menu-rights.store';

/** Where a screen without the view right goes; the address bar keeps the screen's URL. */
export const NO_ACCESS_URL = '/no-access';

/**
 * The screen check (admin-user-rights design D5), as `canActivateChild` on the parents of the screens that have a menu,
 * so it runs for each screen that opens, also when moving from a list to an employee's profile. The screen's route
 * names its menu in `data.menuCode`, and the menus of the screens it links to in `data.relatedMenuCodes`. On every
 * opening it loads the user's rights on all of them live, in one request, and keeps them in `MenuRightsStore`. The
 * screen opens only when `menuId` is absent or its code and the view right on its menu is true. Otherwise it shows the
 * "no access" page in place of the screen, so the screen sends none of its own requests.
 *
 * The screen routes set `runGuardsAndResolvers: 'always'`, so that the branch switch, which opens the same URL again,
 * runs this check for the new branch and refills the rights the switch cleared.
 */
export const menuAccessGuard: CanActivateChildFn = async (route, state) => {
  const http = inject(HttpClient);
  const store = inject(MenuRightsStore);
  const router = inject(Router);
  // The no-access page in place of the screen, with the screen's own URL in the address bar.
  const denied = new RedirectCommand(router.parseUrl(NO_ACCESS_URL), { browserUrl: state.url });

  const code = route.data[MENU_CODE_DATA] as string | undefined;
  const menuId = route.queryParamMap.get(MENU_ID_PARAM);
  if (!code || (menuId !== null && menuId !== code)) return denied;
  const related = (route.data[RELATED_MENU_CODES_DATA] as readonly string[] | undefined) ?? [];

  try {
    const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);
    const params = new HttpParams().set('codes', [code, ...related].join(','));
    const rights = await firstValueFrom(http.get<MenuCodeRights[]>('admin/menu/rights', { params, context }));
    rights.forEach(({ code: c, ...r }) => store.set(c, r));
    return rights.find((r) => r.code === code)?.view === true ? true : denied;
  } catch {
    return denied;
  }
};
