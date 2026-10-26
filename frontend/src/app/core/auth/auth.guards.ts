import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

/**
 * Routes inside the shell need a session; without one the login screen is shown. It is a `canMatch` guard so a
 * lazy feature's code is not downloaded for a user who is not logged in.
 */
export const authGuard: CanMatchFn = () =>
  inject(AuthSession).isActive() || inject(Router).createUrlTree(['/login']);

/**
 * The login screen is for users without a session; a logged-in user is sent to the Dashboard. An automatic-login link
 * (`/login?appid=…`) is the exception: it ends the tab's session first, so the link always decides who is logged in
 * and a refused link (such as a logged-out row) never shows the Dashboard of an earlier session (admin-auto-login).
 */
export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthSession);
  const router = inject(Router);
  if (router.currentNavigation()?.extractedUrl.queryParamMap.has('appid')) {
    auth.end();
    return true;
  }
  return !auth.isActive() || router.createUrlTree(['/']);
};
