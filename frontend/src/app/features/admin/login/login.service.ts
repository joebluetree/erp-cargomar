import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { LOGIN_REQUEST } from '../../../core/auth/auth.interceptors';
import { SKIP_ERROR_NOTIFICATION } from '../../../core/errors/http-error.interceptor';
import { LoginCredentials, LoginResponse } from './login.model';

/**
 * Sends the credentials and, when the backend accepts them, starts the session. The login page reports a failure
 * itself (a refused login is a warning, not an error), so the error interceptor stays silent for this request.
 */
@Injectable()
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSession);

  private readonly busyState = signal(false);
  /** True while a login request is in flight. */
  readonly busy = this.busyState.asReadonly();

  login(credentials: LoginCredentials): Observable<void> {
    this.busyState.set(true);
    return this.http
      .post<LoginResponse>('admin/login', credentials, {
        context: new HttpContext().set(LOGIN_REQUEST, true).set(SKIP_ERROR_NOTIFICATION, true),
      })
      .pipe(
        map((response) => this.auth.start({ token: response.token, expiresAt: response.expiresAt, ...response.session })),
        finalize(() => this.busyState.set(false)),
      );
  }
}
