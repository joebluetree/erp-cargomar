import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthSession } from '../auth/auth-session';
import { MenuRights } from './menu.model';

/**
 * The user's rights by menu code, loaded live when a screen opens: its own menu and its related menus (admin-user-rights
 * design D5). The screen guard fills it; a screen reads them, such as the Employee List for the Profile link, and later
 * for its Add, Edit or Delete actions. In memory only, and cleared on logout and on a branch switch.
 */
@Injectable({ providedIn: 'root' })
export class MenuRightsStore {
  private readonly auth = inject(AuthSession);
  private readonly rights = signal<ReadonlyMap<string, MenuRights>>(new Map());

  /** Whose rights these are: the login (token and user) and the branch; a year switch does not change them. */
  private readonly context = computed(() => {
    const s = this.auth.session();
    return s ? `${s.token}|${s.userCode}|${s.branchId}` : null;
  });

  constructor() {
    // Cleared only when the session changes: the effect's first run comes after the guard may already have stored
    // the rights of the screen being opened, which must be kept.
    let seen = this.context();
    effect(() => {
      const context = this.context();
      if (context === seen) return;
      seen = context;
      untracked(() => this.rights.set(new Map()));
    });
  }

  set(code: string, rights: MenuRights): void {
    this.rights.update((current) => new Map(current).set(code, rights));
  }

  /** The rights on the menu with this code, or null when they were not loaded. */
  rightsOf(code: string): MenuRights | null {
    return this.rights().get(code) ?? null;
  }
}
