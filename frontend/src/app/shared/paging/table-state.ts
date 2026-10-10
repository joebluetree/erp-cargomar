import { Injectable } from '@angular/core';

/**
 * Remembers what a table looked like while the user is on another screen, so that returning to it shows the same
 * filters, page, page size, sort and selection. It is in memory only, so a browser reload clears it. It holds
 * state, never rows: a table asks the backend for its rows again when it is shown.
 *
 * Each table uses its own key (for example its route), so tables never share state. Treat saved snapshots as
 * immutable: save a new object each time.
 */
@Injectable({ providedIn: 'root' })
export class TableStateStore {
  private readonly states = new Map<string, unknown>();

  /** The state last saved under the key, or `undefined` when there is none. */
  get<T>(key: string): T | undefined {
    return this.states.get(key) as T | undefined;
  }

  set<T>(key: string, state: T): void {
    this.states.set(key, state);
  }
}
