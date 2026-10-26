import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthSession } from '../auth/auth-session';
import { MenuModule } from './menu.model';

/** The module that is open when the user logs in, by name ("HR" in the data, "Hr" in some); the others start collapsed. */
const OPEN_AT_LOGIN = 'hr';

/**
 * Which menu modules are open in the navigation menu. Shared by the desktop sidebar and the mobile sheet, so both show
 * the same. At login only the HR module is open; the user's own choices, by module id, are kept until the next login or
 * logout. In memory only.
 */
@Injectable({ providedIn: 'root' })
export class NavCollapseStore {
  private readonly auth = inject(AuthSession);
  /** The user's choices: module id to open (true) or collapsed (false). */
  private readonly choices = signal<ReadonlyMap<string, boolean>>(new Map());

  /** The login: a new one starts from the default again; a branch or year switch keeps the choices. */
  private readonly context = computed(() => {
    const s = this.auth.session();
    return s ? `${s.token}|${s.userCode}` : null;
  });

  constructor() {
    let seen = this.context();
    effect(() => {
      const context = this.context();
      if (context === seen) return;
      seen = context;
      untracked(() => this.choices.set(new Map()));
    });
  }

  isOpen(module: MenuModule): boolean {
    return this.choices().get(module.id) ?? module.name.trim().toLowerCase() === OPEN_AT_LOGIN;
  }

  toggle(module: MenuModule): void {
    const open = this.isOpen(module);
    this.choices.update((current) => new Map(current).set(module.id, !open));
  }
}
