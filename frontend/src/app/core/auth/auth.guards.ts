import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

/**
 * Routes inside the shell need a session; without one the login screen is shown. It is a `canMatch` guard so a
 * lazy feature's code is not downloaded for a user who is not logged in.
 */
export const authGuard: CanMatchFn = () =>
  inject(AuthSession).isActive() || inject(Router).createUrlTree(['/login']);

/** The login screen is for users without a session; a logged-in user is sent to the Dashboard. */
export const guestGuard: CanMatchFn = () =>
  !inject(AuthSession).isActive() || inject(Router).createUrlTree(['/']);
