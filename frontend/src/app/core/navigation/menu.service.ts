import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthSession } from '../auth/auth-session';
import { MenuEntry, MenuModule, UserMenu } from './menu.model';

/** The menu entry whose route the URL is on or beneath (`/admin/employees/e-1?x` → Employee List), or null. */
export function entryForUrl(entries: readonly MenuEntry[], url: string): MenuEntry | null {
  const path = url.split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '');
  return entries.find((e) => path === e.route || path.startsWith(`${e.route}/`)) ?? null;
}

/**
 * The logged-in user's menu (admin-user-rights design D4): the modules and menus they have the view right on in the
 * session branch, from `GET /api/admin/menu`. Loaded after login and after a branch switch, cleared on logout. While it
 * loads, and when it cannot be loaded, it is empty, so the menu shows only the Dashboard.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSession);

  private readonly _modules = signal<readonly MenuModule[]>([]);
  private readonly _loaded = signal(false);
  private readonly _error = signal(false);
  private requestId = 0;
  /** The session context the current menu was requested for; null when none was. */
  private requestedFor: string | null = null;

  readonly modules = this._modules.asReadonly();
  /** True once the menu of the current session has loaded (or failed). */
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
  /** Every menu entry, in menu order. */
  readonly entries = computed(() => this._modules().flatMap((m) => m.menus));

  /** What the menu belongs to: the login (token and user) and the branch; a year switch does not change it. */
  private readonly context = computed(() => {
    const s = this.auth.session();
    return s ? `${s.token}|${s.userCode}|${s.branchId}` : null;
  });

  /** Callers of `whenLoaded()` waiting for the current request. */
  private waiting: (() => void)[] = [];

  constructor() {
    effect(() => {
      const context = this.context();
      untracked(() => (context ? this.ensureLoaded() : this.clear()));
    });
  }

  /** Requests the menu of the current session unless it already was (by the effect or an earlier call). */
  ensureLoaded(): void {
    const context = this.context();
    if (context && context !== this.requestedFor) this.load();
  }

  load(): void {
    const id = ++this.requestId;
    this.requestedFor = this.context();
    this._modules.set([]);
    this._loaded.set(false);
    this._error.set(false);
    this.http.get<UserMenu>('admin/menu').subscribe({
      next: (menu) => {
        if (id !== this.requestId) return; // a newer load() superseded this one
        this._modules.set(menu.modules);
        this.finish();
      },
      error: () => {
        if (id !== this.requestId) return;
        this._error.set(true);
        this.finish();
      },
    });
  }

  /** Resolves once the current menu has loaded (or failed), requesting it first when needed. */
  whenLoaded(): Promise<void> {
    this.ensureLoaded();
    return this._loaded() ? Promise.resolve() : new Promise((resolve) => this.waiting.push(resolve));
  }

  private finish(): void {
    this._loaded.set(true);
    const waiting = this.waiting;
    this.waiting = [];
    waiting.forEach((resolve) => resolve());
  }

  /** The menu entry whose route the URL is on or beneath, or null. */
  entryForUrl(url: string): MenuEntry | null {
    return entryForUrl(this.entries(), url);
  }

  private clear(): void {
    this.requestId++;
    this.requestedFor = null;
    this._modules.set([]);
    this._loaded.set(false);
    this._error.set(false);
  }
}
