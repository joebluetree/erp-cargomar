import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthSession } from '../auth/auth-session';
import { SKIP_ERROR_NOTIFICATION } from '../errors/http-error.interceptor';
import { SKIP_LOADING } from '../loading/loading.interceptor';
import { ANNOUNCEMENT_URL, Announcement, bannerText } from './announcement.model';

/**
 * The announcement the bar above the header shows (admin-notify-bar design D3). It asks once when a session starts:
 * after a login, and when the application opens with a kept session (a reload). A branch or year switch keeps the
 * user, and the announcement is the same in every branch, so it does not ask again. The request is quiet: it does not
 * freeze the screen, and when there is no announcement or the request fails there is simply no bar.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncementStore {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSession);

  private readonly _announcement = signal<Announcement | null>(null);
  private request?: Subscription;

  /** The latest announcement; null without a session, when there is none, or when it could not be loaded. */
  readonly announcement = this._announcement.asReadonly();
  /** The bar's text, exactly as entered: the banner, or the heading without one; null when there is no bar. */
  readonly barText = computed(() => {
    const announcement = this._announcement();
    return announcement ? bannerText(announcement) : null;
  });

  /** Whose session this is: a branch or year switch keeps it, a login or logout changes it. */
  private readonly user = computed(() => this.auth.session()?.userCode ?? null);

  constructor() {
    let seen: string | null | undefined;
    effect(() => {
      const user = this.user();
      if (user === seen) return;
      seen = user;
      untracked(() => (user === null ? this.clear() : this.load()));
    });
  }

  private load(): void {
    this.request?.unsubscribe(); // an answer for an earlier session is dropped
    this._announcement.set(null);
    const context = new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_NOTIFICATION, true);
    this.request = this.http.get<Announcement>(ANNOUNCEMENT_URL, { context }).subscribe({
      next: (announcement) => this._announcement.set(announcement),
      error: () => this._announcement.set(null),
    });
  }

  private clear(): void {
    this.request?.unsubscribe();
    this._announcement.set(null);
  }
}
