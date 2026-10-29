import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Paged } from '../../../shared/paging/paged';
import { Employee, EmployeeBranch, EmployeeListQuery } from './employee-list.model';

/**
 * Loads one page of the employees (of the session's branch, or for an admin of the branch chosen) from the backend and
 * owns its state. Provided by the feature
 * routes, not in root. Failures are reported by the HTTP error interceptor; the service only records that one happened.
 */
@Injectable()
export class EmployeeListService {
  private readonly http = inject(HttpClient);

  private readonly _items = signal<readonly Employee[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal(false);
  private requestId = 0;

  /** The rows of the page last loaded. */
  readonly items = this._items.asReadonly();
  /** How many employees match the searched filters in all. */
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  load(query: EmployeeListQuery): void {
    const id = ++this.requestId;
    this._loading.set(true);
    this._error.set(false);
    this._items.set([]);

    // The status is always sent: the backend's default is the same, so the request says what it asks for.
    let params = new HttpParams().set('status', query.status).set('page', query.page).set('pageSize', query.pageSize);
    const code = query.code.trim();
    const name = query.name.trim();
    if (code) params = params.set('code', code);
    if (name) params = params.set('name', name);
    if (query.branch !== null) params = params.set('branch', query.branch);

    this.http.get<Paged<Employee>>('admin/employees', { params }).subscribe({
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

  /** The user's allowed branches for the Branch filter; empty for a user without an admin branch. */
  branches(): Observable<readonly EmployeeBranch[]> {
    return this.http.get<readonly EmployeeBranch[]>('admin/employees/branches');
  }
}
