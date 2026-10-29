import { Location } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { Subscription } from 'rxjs';
import { lucideArrowDown, lucideArrowLeft, lucideArrowUp, lucideArrowUpDown, lucideSearch } from '@ng-icons/lucide';
import { appProfileColor } from '../../../shared/ui/icons/profile-color';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { AuthSession } from '../../../core/auth/auth-session';
import { MENU_CODES, MENU_ID_PARAM } from '../../../core/navigation/menu.model';
import { MenuRightsStore } from '../../../core/navigation/menu-rights.store';
import { DEFAULT_PAGE_SIZE, rangeOf } from '../../../shared/paging/paged';
import { TablePager } from '../../../shared/paging/table-pager';
import { TableStateStore } from '../../../shared/paging/table-state';
import { PageTitle } from '../../../shared/ui/page-title/page-title';
import { TableToolbar } from '../../../shared/ui/table-toolbar/table-toolbar';
import { TableWrapToggle } from '../../../shared/ui/table-wrap-toggle/table-wrap-toggle';
import { formatDate } from '../employee-profile/employee-profile.model';
import {
  ALL_BRANCHES,
  BranchChoice,
  BranchOption,
  COLUMNS,
  DEFAULT_SORT,
  DEFAULT_STATUS,
  EMPLOYEE_LIST_STATE_KEY,
  EMPTY_VALUE,
  Employee,
  EmployeeBranch,
  EmployeeListState,
  STATUS_OPTIONS,
  SortColumn,
  SortState,
  StatusOption,
} from './employee-list.model';
import { EmployeeListSelection } from './employee-list.selection';
import { EmployeeListService } from './employee-list.service';
import { sortEmployees } from './employee-list.table';

/**
 * The Employee List: the employees of the session's company and branch, current, relieved or both (admin-emp-status),
 * read-only. An admin of the list (admin right in the session branch) may also choose another branch where they have
 * the view right, or all of those. It works like the Company
 * List: the backend filters and pages, what the user types is kept apart from the filters last searched, sorting
 * reorders only the rows on screen, and the state is kept while the user is elsewhere. The employee code opens that
 * employee's profile without changing the row selection. A branch switch reloads the list for the new branch.
 */
@Component({
  selector: 'app-employee-list',
  imports: [NgIcon, ReactiveFormsModule, RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports, HlmSelectImports, HlmTableImports, TablePager, PageTitle, TableToolbar, TableWrapToggle],
  providers: [provideIcons({ appProfileColor, lucideArrowDown, lucideArrowLeft, lucideArrowUp, lucideArrowUpDown, lucideSearch })],
  templateUrl: './employee-list.page.html',
})
export class EmployeeListPage {
  protected readonly service = inject(EmployeeListService);
  private readonly selection = inject(EmployeeListSelection);
  private readonly stateStore = inject(TableStateStore);
  private readonly auth = inject(AuthSession);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly rights = inject(MenuRightsStore);

  /** The Profile column shows only with the Profile's view right, loaded live with the list (admin-user-rights). */
  protected readonly canOpenProfile = computed(() => this.rights.rightsOf(MENU_CODES.profile)?.view === true);
  /** An employee's profile is on the Profile screen, so it opens with the Profile's menu code. */
  protected readonly profileParams = { [MENU_ID_PARAM]: MENU_CODES.profile };
  /** True when the user reached this page from another page of the app, so browser history can take them back. */
  private readonly cameFromApp = this.router.currentNavigation()?.previousNavigation != null;

  protected readonly columns = COLUMNS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly statusLabel = (option: StatusOption) => option.label;
  protected readonly sameStatus = (option: StatusOption, value: StatusOption | null | undefined) => option.value === value?.value;

  /** What the user left behind last time (undefined on the first visit and after a browser reload). */
  private readonly saved = this.stateStore.get<EmployeeListState>(EMPLOYEE_LIST_STATE_KEY);

  /** What is typed in the filter boxes. It has no effect until the user presses Search. */
  protected readonly codeInput = signal(this.saved?.codeInput ?? '');
  protected readonly nameInput = signal(this.saved?.nameInput ?? '');
  /** The saved status counts only in the branch it was saved in: a branch switch puts the status back to Active. */
  private readonly savedStatus = this.saved?.sessionBranch === (this.auth.session()?.branchId ?? null) ? this.saved : undefined;
  /** The Status dropdown (an LOV field, so a form control). Like the boxes, it has no effect until Search. */
  protected readonly statusInput = new FormControl<StatusOption>(statusOption(this.savedStatus?.statusInput), { nonNullable: true });
  private readonly statusChosen = toSignal(this.statusInput.valueChanges, { initialValue: this.statusInput.value });
  /** The session's branch; without the Branch filter the list holds that branch's employees. */
  private readonly branchId = computed(() => this.auth.session()?.branchId ?? null);
  /**
   * The user's allowed branches, as the backend gives them (design D6): with the Employee List's admin right in the
   * session branch, the session's and those where the user has its view right. Empty while they load, when they cannot
   * be loaded, and for a user without that admin right. The rights store cannot tell which branches have the view right.
   */
  private readonly branches = signal<readonly EmployeeBranch[]>([]);
  private branchesRequest?: Subscription;
  /** Whether the allowed branches of the current session have been answered (or failed). */
  private branchesKnown = false;
  /** A request for rows held back until the allowed branches are known, because it would ask for another branch. */
  private fetchWaiting = false;
  /** The Branch filter is enabled only for an admin of the list: someone with allowed branches. */
  protected readonly isAdmin = computed(() => this.branches().length > 0);
  /** The Branch dropdown's options: All, then the branches by name, the session's being `null`. */
  protected readonly branchOptions = computed<readonly BranchOption[]>(() => {
    const own: BranchOption = { value: null, label: this.auth.session()?.branchName ?? '' };
    const listed = this.branches().map((b) => this.branchChoice(b.id) === null ? own : { value: b.id, label: b.name ?? b.code ?? b.id });
    return [{ value: ALL_BRANCHES, label: 'All' }, ...(listed.includes(own) ? listed : [own, ...listed])];
  });
  protected readonly branchLabel = (option: BranchOption) => option.label;
  protected readonly sameBranch = (option: BranchOption, value: BranchOption | null | undefined) => option.value === value?.value;
  /**
   * The branch the user chose, searched or not. It is kept apart from the dropdown, which can show it only once the
   * options have loaded (until then, and if they fail, it shows the session's branch).
   */
  private readonly branchWanted = signal<BranchChoice>(this.saved?.branchInput ?? null);
  /** The Branch dropdown (admins only). Like the boxes, it has no effect until Search. */
  protected readonly branchInput = new FormControl<BranchOption>(
    { value: this.branchOptionOf(this.branchWanted()), disabled: true },
    { nonNullable: true },
  );

  /** The filters that were last searched. Paging uses these. */
  private readonly applied = signal({
    code: this.saved?.applied.code ?? '',
    name: this.saved?.applied.name ?? '',
    status: this.savedStatus?.applied.status ?? DEFAULT_STATUS,
    branch: this.saved?.applied.branch ?? null,
  });

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
  protected readonly hasFilters = computed(() => {
    const { code, name, status, branch } = this.applied();
    return code !== '' || name !== '' || status !== DEFAULT_STATUS || this.branchChoice(branch) !== null;
  });

  constructor() {
    // The allowed branches decide whether the Branch filter is enabled; until they arrive (or if they fail), and for a
    // non-admin, it is disabled on the session's branch.
    this.loadBranches();

    // The first request is for the remembered page with the remembered searched filters (or page 1 on a first visit).
    this.fetch();
    effect(() => {
      const admin = this.isAdmin();
      untracked(() => (admin ? this.branchInput.enable({ emitEvent: false }) : this.branchInput.disable({ emitEvent: false })));
    });

    // A choice in the dropdown is the user's; the page's own updates below do not emit.
    this.branchInput.valueChanges.pipe(takeUntilDestroyed()).subscribe((option) => this.branchWanted.set(this.branchChoice(option.value)));

    // When the options change (loaded, or a branch switch renames the session's branch), the dropdown shows the chosen
    // branch with its current label.
    effect(() => {
      this.branchOptions();
      const option = this.branchOptionOf(this.branchWanted());
      untracked(() => {
        if (option !== this.branchInput.value) this.branchInput.setValue(option, { emitEvent: false });
      });
    });

    // After a branch switch the rows belong to another branch: show page 1 of the new branch's employees, Active ones.
    let shownBranch = untracked(this.branchId);
    effect(() => {
      const branch = this.branchId();
      if (branch === shownBranch) return;
      shownBranch = branch;
      untracked(() => {
        // The allowed branches first: a branch searched in the old session may not be allowed in the new one.
        this.loadBranches();
        this.statusInput.setValue(statusOption(DEFAULT_STATUS));
        this.applied.update((applied) => ({ ...applied, status: DEFAULT_STATUS }));
        this.goToPage(1);
      });
    });

    // Save the state whenever any part of it changes, and once more when the page goes away, so a change made just
    // before leaving is not lost.
    effect(() => this.saveState());
    inject(DestroyRef).onDestroy(() => {
      this.branchesRequest?.unsubscribe();
      untracked(() => this.saveState());
    });

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
      statusInput: this.statusChosen().value,
      branchInput: this.branchChoice(this.branchWanted()),
      applied: this.applied(),
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sort(),
      sortChosen: this.sortChosen(),
      wrap: this.wrap(),
      sessionBranch: this.branchId(),
    });
  }

  private fetch(): void {
    const { code, name, status, branch } = this.applied();
    const chosen = this.branchChoice(branch);
    // The session's branch needs no parameter and is always allowed. Another branch, searched earlier (perhaps in
    // another session, after a branch switch), is asked for only once the allowed branches say it still is one.
    if (chosen !== null && !this.branchesKnown) {
      this.fetchWaiting = true;
      return;
    }
    this.service.load({ code, name, status, branch: chosen, page: this.page(), pageSize: this.pageSize() });
  }

  /** Asks for the allowed branches of the current session; an answer for an earlier session is dropped. */
  private loadBranches(): void {
    this.branchesRequest?.unsubscribe();
    this.branchesKnown = false;
    const known = (branches: readonly EmployeeBranch[]) => {
      this.branches.set(branches);
      this.branchesKnown = true;
      this.dropBranchNotAllowed();
      if (this.fetchWaiting) {
        this.fetchWaiting = false;
        this.fetch();
      }
    };
    this.branchesRequest = this.service.branches().subscribe({ next: known, error: () => known([]) });
  }

  /**
   * Puts the searched and the chosen branch back to the session's when they are no longer allowed, such as All after a
   * switch to a branch without the admin right: such a user lists their session's branch only.
   */
  private dropBranchNotAllowed(): void {
    const allowed = (choice: BranchChoice) =>
      choice === null || (this.isAdmin() && (choice === ALL_BRANCHES || this.branches().some((b) => b.id === choice)));
    if (!allowed(this.branchChoice(this.applied().branch))) this.applied.update((applied) => ({ ...applied, branch: null }));
    if (!allowed(this.branchChoice(this.branchWanted()))) this.branchWanted.set(null);
  }

  /** The choice as kept: the session's branch id is `null`, so the choice follows a branch switch. */
  private branchChoice(choice: BranchChoice): BranchChoice {
    return choice === untracked(this.branchId) ? null : choice;
  }

  /** The dropdown option for a choice; the session's branch when it is not (yet) among the options. */
  private branchOptionOf(choice: BranchChoice): BranchOption {
    const options = untracked(this.branchOptions);
    return options.find((o) => o.value === this.branchChoice(choice)) ?? options.find((o) => o.value === null)!;
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
    this.applied.set({
      code: this.codeInput().trim(),
      name: this.nameInput().trim(),
      status: this.statusInput.value.value,
      // Only an admin has the dropdown; anyone else searches the session's branch.
      branch: this.isAdmin() ? this.branchChoice(this.branchInput.value.value) : null,
    });
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
    // Emails show in lower case, as on the Profile screen.
    const text = column === 'email' ? value?.toLowerCase() : value;
    return text?.trim() || EMPTY_VALUE;
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
   * Opens the employee's profile from a click anywhere in the Profile cell. The click stays with the cell (the row
   * would otherwise toggle its selection), so the selection is unchanged.
   */
  protected openProfile(employee: Employee, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/admin/employees', employee.id], { queryParams: this.profileParams });
  }

  protected toggleRow(id: string): void {
    this.selection.toggle(id);
  }
}

/** The dropdown option of a saved status; Active when nothing was saved. */
function statusOption(status: string | undefined): StatusOption {
  return STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS.find((option) => option.value === DEFAULT_STATUS)!;
}
