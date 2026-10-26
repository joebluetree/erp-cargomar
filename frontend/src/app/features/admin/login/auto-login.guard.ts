import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { NotificationService } from '../../../core/notifications/notification.service';
import { LoginService } from './login.service';

/** The one message for any failed automatic login; the backend does not say why. */
export const AUTO_LOGIN_FAILED_MESSAGE = 'Automatic login failed. Please log in.';

/**
 * The automatic login (admin-auto-login). Opened with `?appid=<id>` (the link of the old system), `/login` is not shown:
 * the guard sends the id to the backend before the login screen is created, and on success opens the Dashboard
 * directly. On any failure it opens the normal login screen with one warning. Both redirects replace the address with
 * the id, so it stays neither in the address bar nor in the history. Remember me is neither read nor changed.
 * Without the parameter the login screen opens as usual.
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
  const notifications = inject(NotificationService);
  return inject(LoginService)
    .autoLogin(appId)
    .pipe(
      map(() => new RedirectCommand(router.parseUrl('/'), { replaceUrl: true })),
      catchError(() => {
        notifications.warn(AUTO_LOGIN_FAILED_MESSAGE);
        return of(toLogin);
      }),
    );
};
