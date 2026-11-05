import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Paged } from '../../../shared/paging/paged';
import { Company, CompanyListQuery } from './company-list.model';

/**
 * Loads one page of companies from the backend and owns its state. Provided by the feature routes, not in root.
 * Failures are reported by the HTTP error interceptor; the service only records that one happened.
 */
@Injectable()
export class CompanyListService {
  private readonly http = inject(HttpClient);

  private readonly _items = signal<readonly Company[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal(false);
  private requestId = 0;

  /** The rows of the page last loaded. */
  readonly items = this._items.asReadonly();
  /** How many companies match the searched filters in all. */
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  load(query: CompanyListQuery): void {
    const id = ++this.requestId;
    this._loading.set(true);
    this._error.set(false);
    this._items.set([]);

    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    const code = query.code.trim();
    const name = query.name.trim();
    if (code) params = params.set('code', code);
    if (name) params = params.set('name', name);

    this.http.get<Paged<Company>>('reports/companies', { params }).subscribe({
      next: (result) => {
        if (id !== this.requestId) return; // a newer load() superseded this one
        this._items.set(result.items);
        this._total.set(result.total);
        this._loading.set(false);
      },
      error: () => {
        if (id !== this.requestId) return;
        this._error.set(true);
        this._loading.set(false);
      },
    });
  }
}

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
