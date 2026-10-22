import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { SERVER_ERROR_MESSAGE, isApiError } from '../../../core/errors/api-error';
import { SKIP_ERROR_NOTIFICATION } from '../../../core/errors/http-error.interceptor';
import { NotificationService } from '../../../core/notifications/notification.service';
import { Holiday, HolidayBranch, HolidayList } from './holiday-list.model';

/**
 * Loads a holiday list and owns its state: the session's own branch (`load()`), or a listed branch of the Branch List
 * (`load(id)`), both for the session's financial year; either answer gives the branch's code and name. Provided by the feature
 * routes, not in root. A 404 means the branch has no holiday file: that is a normal answer, so it shows no
 * notification. Any other failure gets the one notification other screens give (the request opts out of the
 * interceptor's, as the Profile does).
 */
@Injectable()
export class HolidayListService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);

  private readonly _items = signal<readonly Holiday[]>([]);
  private readonly _loading = signal(false);
  private readonly _notFound = signal(false);
  private readonly _error = signal(false);
  private requestId = 0;

  /** The holidays, in the order of the file. */
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** True when there is no holiday file for the session. */
  readonly notFound = this._notFound.asReadonly();
  readonly error = this._error.asReadonly();
  private readonly _branch = signal<HolidayBranch | null>(null);
  /** The branch of the list once it has loaded; its name heads the box. */
  readonly branch = this._branch.asReadonly();

  /** Loads the session branch's list, or with `branchId` that listed branch's (`reports/branches/{id}/holidays`). */
  load(branchId?: string): void {
    const id = ++this.requestId;
    const url = branchId ? `reports/branches/${encodeURIComponent(branchId)}/holidays` : 'admin/holidays';
    this._items.set([]);
    this._branch.set(null);
    this._loading.set(true);
    this._notFound.set(false);
    this._error.set(false);

    const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);
    this.http.get<HolidayList>(url, { context }).subscribe({
      next: (list) => {
        if (id !== this.requestId) return; // a newer load() superseded this one
        this._items.set(list.items);
        this._branch.set({ code: list.branchCode, name: list.branchName });
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
        this.notifications.error(isApiError(error) ? error.message : SERVER_ERROR_MESSAGE);
      },
    });
  }
}
