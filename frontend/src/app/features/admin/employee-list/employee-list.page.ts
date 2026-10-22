import { Location } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowLeft, lucideArrowUp, lucideArrowUpDown, lucideLoaderCircle, lucideSearch } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { AuthSession } from '../../../core/auth/auth-session';
import { DEFAULT_PAGE_SIZE, rangeOf } from '../../../shared/paging/paged';
import { TablePager } from '../../../shared/paging/table-pager';
import { TableStateStore } from '../../../shared/paging/table-state';
import { PageTitle } from '../../../shared/ui/page-title/page-title';
import { TableToolbar } from '../../../shared/ui/table-toolbar/table-toolbar';
import { TableWrapToggle } from '../../../shared/ui/table-wrap-toggle/table-wrap-toggle';
import { formatDate } from '../employee-profile/employee-profile.model';
import {
  COLUMNS,
  DEFAULT_SORT,
  EMPLOYEE_LIST_STATE_KEY,
  EMPTY_VALUE,
  Employee,
  EmployeeListState,
  SortColumn,
  SortState,
} from './employee-list.model';
import { EmployeeListSelection } from './employee-list.selection';
import { EmployeeListService } from './employee-list.service';
import { sortEmployees } from './employee-list.table';

/**
 * The Employee List: the current employees of the session's company and branch, read-only. It works like the Company
 * List: the backend filters and pages, what the user types is kept apart from the filters last searched, sorting
 * reorders only the rows on screen, and the state is kept while the user is elsewhere. The employee code opens that
 * employee's profile without changing the row selection. A branch switch reloads the list for the new branch.
 */
@Component({
  selector: 'app-employee-list',
  imports: [NgIcon, RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports, HlmTableImports, TablePager, PageTitle, TableToolbar, TableWrapToggle],
  providers: [provideIcons({ lucideArrowDown, lucideArrowLeft, lucideArrowUp, lucideArrowUpDown, lucideLoaderCircle, lucideSearch })],
  templateUrl: './employee-list.page.html',
})
export class EmployeeListPage {
  protected readonly service = inject(EmployeeListService);
  private readonly selection = inject(EmployeeListSelection);
  private readonly stateStore = inject(TableStateStore);
  private readonly auth = inject(AuthSession);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  /** True when the user reached this page from another page of the app, so browser history can take them back. */
  private readonly cameFromApp = this.router.currentNavigation()?.previousNavigation != null;

  protected readonly columns = COLUMNS;

  /** What the user left behind last time (undefined on the first visit and after a browser reload). */
  private readonly saved = this.stateStore.get<EmployeeListState>(EMPLOYEE_LIST_STATE_KEY);

  /** What is typed in the filter boxes. It has no effect until the user presses Search. */
  protected readonly codeInput = signal(this.saved?.codeInput ?? '');
  protected readonly nameInput = signal(this.saved?.nameInput ?? '');
  /** The filters that were last searched. Paging uses these. */
  private readonly applied = signal(this.saved?.applied ?? { code: '', name: '' });

  protected readonly page = signal(this.saved?.page ?? 1);
  protected readonly pageSize = signal(this.saved?.pageSize ?? DEFAULT_PAGE_SIZE);
  protected readonly sort = signal<SortState>(this.saved?.sort ?? DEFAULT_SORT);
  /** Until the user chooses a sort, the rows stay in the order the backend returned (name, then id). */
  private readonly sortChosen = signal(this.saved?.sortChosen ?? false);
  /** The "Wrap text" toggle: on (the default) wraps the cells to the screen width, off scrolls sideways. */
  protected readonly wrap = signal(this.saved?.wrap ?? true);

  /** The rows on screen: the backend's page, reordered by the column the user chose. */
  protected readonly rows = computed(() =>
    this.sortChosen() ? sortEmployees(this.service.items(), this.sort()) : this.service.items(),
  );

  /** Whether the shown result comes from a search with filters, to tell "no employees" from "no match". */
  protected readonly hasFilters = computed(() => this.applied().code !== '' || this.applied().name !== '');

  /** The session's branch; the list holds that branch's employees. */
  private readonly branchId = computed(() => this.auth.session()?.branchId ?? null);

  constructor() {
    // The first request is for the remembered page with the remembered searched filters (or page 1 on a first visit).
    this.fetch();

    // After a branch switch the rows belong to another branch: show page 1 of the new branch's employees.
    let shownBranch = untracked(this.branchId);
    effect(() => {
      const branch = this.branchId();
      if (branch === shownBranch) return;
      shownBranch = branch;
      untracked(() => this.goToPage(1));
    });

    // Save the state whenever any part of it changes, and once more when the page goes away, so a change made just
    // before leaving is not lost.
    effect(() => this.saveState());
    inject(DestroyRef).onDestroy(() => untracked(() => this.saveState()));

    // A page past the end (for example employees were relieved meanwhile) comes back empty with a total that still
    // has rows: ask for the last page that has rows instead.
    effect(() => {
      const empty = !this.service.loading() && !this.service.error() && this.service.items().length === 0;
      const total = this.service.total();
      if (!empty || total === 0) return;
      untracked(() => {
        const { pageCount } = rangeOf(total, this.page(), this.pageSize());
        if (this.page() > pageCount) this.goToPage(pageCount);
      });
    });
  }

  private saveState(): void {
    this.stateStore.set<EmployeeListState>(EMPLOYEE_LIST_STATE_KEY, {
      codeInput: this.codeInput(),
      nameInput: this.nameInput(),
      applied: this.applied(),
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sort(),
      sortChosen: this.sortChosen(),
      wrap: this.wrap(),
    });
  }

  private fetch(): void {
    const { code, name } = this.applied();
    this.service.load({ code, name, page: this.page(), pageSize: this.pageSize() });
  }

  /** Back to the page the user came from, or the Dashboard when this page was opened directly. */
  protected back(): void {
    if (this.cameFromApp) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/');
    }
  }

  protected setCodeInput(event: Event): void {
    this.codeInput.set((event.target as HTMLInputElement).value);
  }

  protected setNameInput(event: Event): void {
    this.nameInput.set((event.target as HTMLInputElement).value);
  }

  /** Applies the typed filters: one request for page 1. */
  protected search(): void {
    this.applied.set({ code: this.codeInput().trim(), name: this.nameInput().trim() });
    this.page.set(1);
    this.fetch();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  protected changePageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.fetch();
  }

  /** Repeats the last request. */
  protected reload(): void {
    this.fetch();
  }

  /** What a cell shows: the date as `dd-MM-yyyy`, any other value as is, and a dash for an empty value. */
  protected cell(employee: Employee, column: SortColumn): string {
    const value = column === 'dateOfBirth' ? formatDate(employee.dateOfBirth) : employee[column];
    return value?.trim() || EMPTY_VALUE;
  }

  protected toggleSort(column: SortColumn): void {
    const current = this.sort();
    this.sortChosen.set(true);
    this.sort.set({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc',
    });
  }

  protected ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    const { column: sorted, direction } = this.sort();
    if (sorted !== column) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIcon(column: SortColumn): string {
    const { column: sorted, direction } = this.sort();
    if (sorted !== column) return 'lucideArrowUpDown';
    return direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }

  protected isSelected(id: string): boolean {
    return this.selection.selectedId() === id;
  }

  /**
   * Opens the employee's profile from a click anywhere in the Employee No cell. The click stays with the cell (the row
   * would otherwise toggle its selection), so the selection is unchanged.
   */
  protected openProfile(employee: Employee, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/admin/employees', employee.id]);
  }

  protected toggleRow(id: string): void {
    this.selection.toggle(id);
  }
}
