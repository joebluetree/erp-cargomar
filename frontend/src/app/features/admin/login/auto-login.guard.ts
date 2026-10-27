import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { MenuService } from '../../../core/navigation/menu.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { LoginService } from './login.service';

/** The one message for any failed automatic login; the backend does not say why. */
export const AUTO_LOGIN_FAILED_MESSAGE = 'Automatic login failed. Please log in.';

/** Shown, on the Dashboard, when the link's menu is not one the user may open (admin-login-menuid). */
export const MENU_NOT_AVAILABLE_MESSAGE = 'The requested screen is not available.';

/**
 * The automatic login (admin-auto-login). Opened with `?appid=<id>` (the link of the old system), `/login` is not shown:
 * the guard sends the id to the backend before the login screen is created, and on success opens the Dashboard
 * directly. On any failure it opens the normal login screen with one warning. Both redirects replace the address with
 * the id, so it stays neither in the address bar nor in the history. Remember me is neither read nor changed.
 * Without the parameter the login screen opens as usual.
 *
 * With `&menuid=<menu code>` as well (admin-login-menuid), a successful login opens that menu's screen in place of the
 * Dashboard, at its route in the user's menu, as a menu link would (`/<route>?menuId=<code>`). A code that is not in
 * the user's menu, or a menu that cannot be loaded, opens the Dashboard with one warning.
 */
export const autoLoginGuard: CanActivateFn = (route) => {
  const param = route.queryParamMap.get('appid');
  if (param === null) {
    return true;
  }
  const router = inject(Router);
  const toLogin = new RedirectCommand(router.parseUrl('/login'), { replaceUrl: true });
  const appId = param.trim();
  if (!appId) {
    return toLogin;
  }
  const toDashboard = new RedirectCommand(router.parseUrl('/'), { replaceUrl: true });
  const menuCode = (route.queryParamMap.get('menuid') ?? route.queryParamMap.get('menuId') ?? '').trim();
  const menu = menuCode ? inject(MenuService) : null;
  const notifications = inject(NotificationService);
  return inject(LoginService)
    .autoLogin(appId)
    .pipe(
      map((): RedirectCommand | null => null),
      catchError(() => {
        notifications.warn(AUTO_LOGIN_FAILED_MESSAGE);
        return of(toLogin);
      }),
      switchMap((failed) => {
        if (failed || !menu) {
          return of(failed ?? toDashboard);
        }
        // The user's menu has only the menus they may open in the session branch, each with its route.
        return from(menu.whenLoaded()).pipe(
          map(() => {
            const wanted = menuCode.toUpperCase();
            const entry = menu.entries().find((e) => e.code.trim().toUpperCase() === wanted);
            if (!entry) {
              notifications.warn(MENU_NOT_AVAILABLE_MESSAGE);
              return toDashboard;
            }
            const url = router.createUrlTree(['/' + entry.route], { queryParams: { menuId: entry.code } });
            return new RedirectCommand(url, { replaceUrl: true });
          }),
        );
      }),
    );
};
