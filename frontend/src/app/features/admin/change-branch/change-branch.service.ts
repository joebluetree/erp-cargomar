import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { SKIP_ERROR_NOTIFICATION } from '../../../core/errors/http-error.interceptor';
import { ChangeBranchRequest, ChangeBranchResponse, SessionOptions } from './change-branch.model';

/**
 * Loads what the user may switch to and switches the session. A refused switch is reported by the dialog itself (a
 * warning, not an error), so the error interceptor stays silent for the change request; the options request keeps
 * the normal error notification.
 */
@Injectable()
export class ChangeBranchService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSession);

  private readonly busyState = signal(false);
  /** True while a change request is in flight. */
  readonly busy = this.busyState.asReadonly();

  options(): Observable<SessionOptions> {
    return this.http.get<SessionOptions>('admin/session/options');
  }

  /** Switches the session; on success the stored session (and so the header) takes the new branch and year. */
  change(request: ChangeBranchRequest): Observable<ChangeBranchResponse> {
    this.busyState.set(true);
    return this.http
      .post<ChangeBranchResponse>('admin/session/change', request, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      })
      .pipe(
        map((response) => {
          this.auth.start({ token: response.token, expiresAt: response.expiresAt, ...response.session });
          return response;
        }),
        finalize(() => this.busyState.set(false)),
      );
  }
}
