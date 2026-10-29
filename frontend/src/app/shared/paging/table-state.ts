import { Injectable, computed, effect, inject, untracked } from '@angular/core';
import { AuthSession } from '../../core/auth/auth-session';

/**
 * Remembers what a table looked like while the user is on another screen, so that returning to it shows the same
 * filters, page, page size, sort and selection. It is in memory only, so a browser reload clears it. It holds
 * state, never rows: a table asks the backend for its rows again when it is shown.
 *
 * It belongs to one login: it is cleared on logout and when another user's session starts, so every login opens the
 * tables with their defaults (such as the Employee List's Active status). A branch or year switch keeps it.
 *
 * Each table uses its own key (for example its route), so tables never share state. Treat saved snapshots as
 * immutable: save a new object each time.
 */
@Injectable({ providedIn: 'root' })
export class TableStateStore {
  private readonly auth = inject(AuthSession);
  private readonly states = new Map<string, unknown>();

  /** Whose state this is: the logged-in user, or null without a session. */
  private readonly user = computed(() => this.auth.session()?.userCode ?? null);

  constructor() {
    let seen = this.user();
    effect(() => {
      const user = this.user();
      if (user === seen) return;
      seen = user;
      untracked(() => this.states.clear());
    });
  }

  /** The state last saved under the key, or `undefined` when there is none. */
  get<T>(key: string): T | undefined {
    return this.states.get(key) as T | undefined;
  }

  set<T>(key: string, state: T): void {
    this.states.set(key, state);
  }
}
