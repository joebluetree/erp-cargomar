import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ANNOUNCEMENT_URL, Announcement } from '../../../core/announcement/announcement.model';
import { SERVER_ERROR_MESSAGE, isApiError } from '../../../core/errors/api-error';
import { SKIP_ERROR_NOTIFICATION } from '../../../core/errors/http-error.interceptor';
import { NotificationService as Toasts } from '../../../core/notifications/notification.service';

/**
 * Loads the latest announcement for the Notification screen and owns its state (admin-notify-bar design D3). Provided
 * by the feature routes, not in root. Unlike the bar's quiet request, it shows the usual spinner. A 404 means there is
 * no announcement: a normal answer, so it shows no notification. Any other failure gets the one error notification
 * other screens give (the request opts out of the interceptor's, as the Holiday List does).
 */
@Injectable()
export class NotificationScreenService {
  private readonly http = inject(HttpClient);
  private readonly toasts = inject(Toasts);

  private readonly _announcement = signal<Announcement | null>(null);
  private readonly _loading = signal(false);
  private readonly _notFound = signal(false);
  private readonly _error = signal(false);
  private requestId = 0;

  readonly announcement = this._announcement.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** True when there is no announcement. */
  readonly notFound = this._notFound.asReadonly();
  readonly error = this._error.asReadonly();

  load(): void {
    const id = ++this.requestId;
    this._announcement.set(null);
    this._loading.set(true);
    this._notFound.set(false);
    this._error.set(false);

    const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);
    this.http.get<Announcement>(ANNOUNCEMENT_URL, { context }).subscribe({
      next: (announcement) => {
        if (id !== this.requestId) return; // a newer load() superseded this one
        this._announcement.set(announcement);
        this._loading.set(false);
      },
      error: (error: unknown) => {
        if (id !== this.requestId) return;
        this._loading.set(false);
        if (isApiError(error) && error.status === 404) {
          this._notFound.set(true);
          return;
        }
        this._error.set(true);
        this.toasts.error(isApiError(error) ? error.message : SERVER_ERROR_MESSAGE);
      },
    });
  }
}
