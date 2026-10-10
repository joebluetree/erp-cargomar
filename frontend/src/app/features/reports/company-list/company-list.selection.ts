import { Injectable, signal } from '@angular/core';

/**
 * The company the user selected in the Company List, by id. Provided in root, unlike the feature's
 * data service, so the selection outlives the route: it is still there when the user leaves the screen
 * and comes back. It is kept in memory only, so a browser reload clears it.
 */
@Injectable({ providedIn: 'root' })
export class CompanyListSelection {
  private readonly _selectedId = signal<string | null>(null);

  readonly selectedId = this._selectedId.asReadonly();

  /** Selects the company, or clears the selection if it is already the selected one. */
  toggle(id: string): void {
    this._selectedId.update((current) => (current === id ? null : id));
  }
}
