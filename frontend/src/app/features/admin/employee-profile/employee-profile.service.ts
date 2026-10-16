import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { SERVER_ERROR_MESSAGE, isApiError } from '../../../core/errors/api-error';
import { SKIP_ERROR_NOTIFICATION } from '../../../core/errors/http-error.interceptor';
import { NotificationService } from '../../../core/notifications/notification.service';
import { EmployeeProfile } from './employee-profile.model';

/**
 * Loads an employee profile and owns its state: the logged-in user's own (`load()`), or a listed employee's
 * (`load(id)`, from the Employee List). Provided by the feature routes, not in root. A 404 means no employee is linked
 * to the user, or that the given employee is not in the user's branch: that is a normal answer, so it shows no
 * notification. Any other
 * failure gets the one notification other screens give (the request opts out of the interceptor's, design D5).
 *
 * When the profile says a photo is available, the photo is fetched through the HTTP client (an `<img>` alone could not
 * send the session token) and kept as an object URL in `photoUrl`. A failed photo shows no notification: the page
 * keeps the initials (design D7). The page calls `releasePhoto()` when it goes away.
 */
@Injectable()
export class EmployeeProfileService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);

  private readonly _profile = signal<EmployeeProfile | null>(null);
  private readonly _loading = signal(false);
  private readonly _notLinked = signal(false);
  private readonly _error = signal(false);
  private readonly _photoUrl = signal<string | null>(null);
  private requestId = 0;

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** True when the backend has no profile to show (404): the user has no employee, or the given one is not listed. */
  readonly notLinked = this._notLinked.asReadonly();
  readonly error = this._error.asReadonly();
  /** An object URL of the employee's photo once it has loaded; null otherwise. */
  readonly photoUrl = this._photoUrl.asReadonly();

  /** Loads the user's own profile, or with `employeeId` that employee's (`admin/employees/{id}`) and its photo. */
  load(employeeId?: string): void {
    const id = ++this.requestId;
    const url = employeeId ? `admin/employees/${encodeURIComponent(employeeId)}` : 'admin/profile';
    this._profile.set(null);
    this._loading.set(true);
    this._notLinked.set(false);
    this._error.set(false);
    this.releasePhoto();

    const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);
    this.http.get<EmployeeProfile>(url, { context }).subscribe({
      next: (profile) => {
        if (id !== this.requestId) return; // a newer load() superseded this one
        this._profile.set(profile);
        this._loading.set(false);
        if (profile.hasPhoto) this.loadPhoto(id, `${url}/photo`);
      },
      error: (error: unknown) => {
        if (id !== this.requestId) return;
        this._loading.set(false);
        if (isApiError(error) && error.status === 404) {
          this._notLinked.set(true);
          return;
        }
        this._error.set(true);
        this.notifications.error(isApiError(error) ? error.message : SERVER_ERROR_MESSAGE);
      },
    });
  }

  /** Frees the photo's object URL (when the profile loads again, or the page goes away). */
  releasePhoto(): void {
    const url = this._photoUrl();
    if (url) URL.revokeObjectURL(url);
    this._photoUrl.set(null);
  }

  private loadPhoto(id: number, url: string): void {
    const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);
    this.http.get(url, { context, responseType: 'blob' }).subscribe({
      next: (photo) => {
        if (id !== this.requestId) return;
        this.releasePhoto();
        this._photoUrl.set(URL.createObjectURL(photo));
      },
      // No photo after all (or it could not be read): the page keeps the initials, without a notification.
      error: () => {},
    });
  }
}
