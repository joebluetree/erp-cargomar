import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url';
import { SKIP_ERROR_NOTIFICATION } from '../errors/http-error.interceptor';
import { NotificationService } from '../notifications/notification.service';
import { AuthSession } from './auth-session';

/** Marks the login request: it is sent without a token, and its 401 is a refused login, not an expired session. */
export const LOGIN_REQUEST = new HttpContextToken<boolean>(() => false);

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

/** Adds the session's token to every API request while a session exists. Runs after `apiBaseUrlInterceptor`. */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthSession).session()?.token;
  const base = inject(API_BASE_URL).replace(/\/+$/, '');
  if (!token || req.context.get(LOGIN_REQUEST) || !req.url.startsWith(`${base}/`)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

/**
 * A 401 from any request but the login means the session is no longer valid: the session is ended, the login
 * screen is shown and one message explains why (not one per failed request). The error is still passed on, without
 * the general error notification. Registered after `httpErrorInterceptor`, so it sees the response first.
 */
export const sessionExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthSession);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.context.get(LOGIN_REQUEST)) {
        req.context.set(SKIP_ERROR_NOTIFICATION, true);
        if (auth.isLoggedIn()) {
          auth.end();
          notifications.warn(SESSION_EXPIRED_MESSAGE);
        }
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
