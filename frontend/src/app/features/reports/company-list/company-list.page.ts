import { Location } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowLeft, lucideArrowUp, lucideArrowUpDown, lucideSearch } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { DEFAULT_PAGE_SIZE, rangeOf } from '../../../shared/paging/paged';
import { TablePager } from '../../../shared/paging/table-pager';
import { PageTitle } from '../../../shared/ui/page-title/page-title';
import { TableToolbar } from '../../../shared/ui/table-toolbar/table-toolbar';
import { TableWrapToggle } from '../../../shared/ui/table-wrap-toggle/table-wrap-toggle';
import { TableStateStore } from '../../../shared/paging/table-state';
import { AuthSession } from '../../../core/auth/auth-session';
import { COLUMNS, COMPANY_LIST_STATE_KEY, CompanyListState, DEFAULT_SORT, SortColumn, SortState } from './company-list.model';
import { CompanyListSelection } from './company-list.selection';
import { CompanyListService } from './company-list.service';
import { sortCompanies } from './company-list.table';

/**
 * The Company List report. The backend filters and pages: a search or a page change is one request. What the user
 * types is kept apart from the filters that were last searched, so paging never uses text that was not searched.
 * Sorting reorders only the rows of the page on screen. The page state is saved while it changes and restored when the
 * page is shown again, so leaving and returning shows the same filters, page, page size, sort and selection. A branch
 * or year switch puts the search fields (Code, Name) back to empty.
 */
@Component({
  selector: 'app-company-list',
  imports: [NgIcon, HlmButtonImports, HlmInputImports, HlmLabelImports, HlmTableImports, TablePager, PageTitle, TableToolbar, TableWrapToggle],
  providers: [provideIcons({ lucideArrowDown, lucideArrowLeft, lucideArrowUp, lucideArrowUpDown, lucideSearch })],
  templateUrl: './company-list.page.html',
})
export class CompanyListPage {
  protected readonly service = inject(CompanyListService);
  private readonly selection = inject(CompanyListSelection);
  private readonly stateStore = inject(TableStateStore);
  private readonly auth = inject(AuthSession);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  /** True when the user reached this page from another page of the app, so browser history can take them back. */
  private readonly cameFromApp = this.router.currentNavigation()?.previousNavigation != null;

  protected readonly columns = COLUMNS;

  /** What the user left behind last time (undefined on the first visit and after a browser reload). */
  private readonly saved = this.stateStore.get<CompanyListState>(COMPANY_LIST_STATE_KEY);

  /** The session's branch and year; a switch of either resets the search fields. */
  private readonly branchId = computed(() => this.auth.session()?.branchId ?? null);
  private readonly yearId = computed(() => this.auth.session()?.yearId ?? null);
  /**
   * The branch and year the search fields were last set for. They are saved instead of the session's: a switch that
   * closes the page before it could reset the fields (the Change Branch dialog goes to the Dashboard) must not save
   * the old fields as the new session's.
   */
  private filtersBranch = untracked(this.branchId);
  private filtersYear = untracked(this.yearId);
  /** The saved search fields count only in the branch and year they were saved in. */
  private readonly savedFilters =
    this.saved?.sessionBranch === this.filtersBranch && this.saved?.sessionYear === this.filtersYear ? this.saved : undefined;

  /** What is typed in the filter boxes. It has no effect until the user presses Search. */
  protected readonly codeInput = signal(this.savedFilters?.codeInput ?? '');
  protected readonly nameInput = signal(this.savedFilters?.nameInput ?? '');
  /** The filters that were last searched. Paging uses these. */
  private readonly applied = signal(this.savedFilters?.applied ?? { code: '', name: '' });

  protected readonly page = signal(this.saved?.page ?? 1);
  protected readonly pageSize = signal(this.saved?.pageSize ?? DEFAULT_PAGE_SIZE);
  protected readonly sort = signal<SortState>(this.saved?.sort ?? DEFAULT_SORT);
  /** Until the user chooses a sort, the rows stay in the order the backend returned (name, then id). */
  private readonly sortChosen = signal(this.saved?.sortChosen ?? false);
  /** The "Wrap text" toggle: on (the default) wraps the cells to the screen width, off scrolls sideways when the table is wide. */
  protected readonly wrap = signal(this.saved?.wrap ?? true);

  /** The rows on screen: the backend's page, reordered by the column the user chose. */
  protected readonly rows = computed(() =>
    this.sortChosen() ? sortCompanies(this.service.items(), this.sort()) : this.service.items(),
  );

  /** Whether the shown result comes from a search with filters, to tell "no companies" from "no match". */
  protected readonly hasFilters = computed(() => this.applied().code !== '' || this.applied().name !== '');

  constructor() {
    // The first request is for the remembered page with the remembered searched filters (or page 1 on a first visit).
    this.fetch();

    // A branch or year switch puts the search fields back to empty, typed and searched. The companies do not depend on
    // the session's branch or year, so the list asks again (for page 1) only when the searched fields were not empty.
    effect(() => {
      const branch = this.branchId();
      const year = this.yearId();
      if (branch === this.filtersBranch && year === this.filtersYear) return;
      untracked(() => {
        const { code, name } = this.applied();
        this.codeInput.set('');
        this.nameInput.set('');
        this.applied.set({ code: '', name: '' });
        this.filtersBranch = branch;
        this.filtersYear = year;
        if (code !== '' || name !== '') this.goToPage(1);
      });
    });

    // Save the state whenever any part of it changes, and once more when the page goes away, so a change made just
    // before leaving is not lost.
    effect(() => this.saveState());
    inject(DestroyRef).onDestroy(() => untracked(() => this.saveState()));

    // A page past the end (for example companies were removed meanwhile) comes back empty with a total that still
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
    this.stateStore.set<CompanyListState>(COMPANY_LIST_STATE_KEY, {
      codeInput: this.codeInput(),
      nameInput: this.nameInput(),
      applied: this.applied(),
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sort(),
      sortChosen: this.sortChosen(),
      wrap: this.wrap(),
      sessionBranch: this.filtersBranch,
      sessionYear: this.filtersYear,
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

  protected toggleRow(id: string): void {
    this.selection.toggle(id);
  }
}
