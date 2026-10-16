import { Injectable, signal } from '@angular/core';

/**
 * The employee the user selected in the Employee List, by id. Provided in root, unlike the feature's data service,
 * so the selection outlives the route: it is still there when the user opens a profile and comes back. It is kept in
 * memory only, so a browser reload clears it.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeListSelection {
  private readonly _selectedId = signal<string | null>(null);

  readonly selectedId = this._selectedId.asReadonly();

  /** Selects the employee, or clears the selection if it is already the selected one. */
  toggle(id: string): void {
    this._selectedId.update((current) => (current === id ? null : id));
  }
}
