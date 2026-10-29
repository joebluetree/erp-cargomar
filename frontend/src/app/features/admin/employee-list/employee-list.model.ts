/** One employee as returned by `GET /api/admin/employees`. Empty values arrive as null. */
export interface Employee {
  id: string;
  code: string | null;
  name: string | null;
  fatherName: string | null;
  /** `yyyy-MM-dd`. */
  dateOfBirth: string | null;
  /** The current address lines 1–3, joined with ", ". */
  address: string | null;
  mobile: string | null;
  email: string | null;
  /** The name of the employee's branch, or its code when the company has no branch with that code. */
  branch: string | null;
}

/** The status filter (admin-emp-status): current employees, relieved ones, or both. */
export type EmployeeStatus = 'active' | 'relieved' | 'all';

/** One option of the Status dropdown. */
export interface StatusOption {
  value: EmployeeStatus;
  label: string;
}

/** The Status dropdown's options, in display order. */
export const STATUS_OPTIONS: readonly StatusOption[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'relieved', label: 'Relieved' },
];

/** The status until the user searches another: current employees only. */
export const DEFAULT_STATUS: EmployeeStatus = 'active';

/** One branch of the session's company, as `GET /api/admin/employees/branches` returns it (admins only). */
export interface EmployeeBranch {
  id: string;
  code: string | null;
  name: string | null;
}

/** The `branch` value that lists every branch of the company. */
export const ALL_BRANCHES = 'all';

/**
 * A choice of the Branch filter (admin-emp-status design D7): `null` is the session's branch, so it follows a branch
 * switch; otherwise `all` or a branch id.
 */
export type BranchChoice = string | null;

/** One option of the Branch dropdown. */
export interface BranchOption {
  value: BranchChoice;
  label: string;
}

/** What the page asks the backend for: the searched filters and one page. */
export interface EmployeeListQuery {
  code: string;
  name: string;
  status: EmployeeStatus;
  /** Sent as `branch` unless it is `null` (the session's branch). */
  branch: BranchChoice;
  /** One-based page number. */
  page: number;
  pageSize: number;
}

export type SortColumn = Exclude<keyof Employee, 'id'>;
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

/**
 * Everything the page remembers while the user is on another screen (the selected row is kept separately by
 * `EmployeeListSelection`). Rows are not part of it: they are requested again when the page is shown.
 */
export interface EmployeeListState {
  /** The text in the filter boxes and the status chosen, searched or not. */
  codeInput: string;
  nameInput: string;
  statusInput: EmployeeStatus;
  /** The branch chosen (admins only), searched or not. */
  branchInput: BranchChoice;
  /** The filters last searched; paging and the request on return use these. */
  applied: { code: string; name: string; status: EmployeeStatus; branch: BranchChoice };
  /** One-based page number. */
  page: number;
  pageSize: number;
  sort: SortState;
  /** Whether the user chose a sort (until then rows keep the backend's order). */
  sortChosen: boolean;
  /** Whether the "Wrap text" toggle is on. */
  wrap: boolean;
  /** The session's branch when the state was saved: after a branch switch the status is back to Active. */
  sessionBranch: string | null;
}

/** The key under which the Employee List saves its state in `TableStateStore`. */
export const EMPLOYEE_LIST_STATE_KEY = 'admin/employees';

/** The table columns in display order; a `nowrap` column stays on one line even with "Wrap text" on. */
export const COLUMNS: readonly { key: SortColumn; label: string; nowrap?: boolean }[] = [
  { key: 'code', label: 'Emp. No' },
  { key: 'name', label: 'Emp. Name' },
  { key: 'fatherName', label: "Father's Name" },
  { key: 'dateOfBirth', label: 'DOB', nowrap: true },
  { key: 'address', label: 'Address' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'branch', label: 'Branch' },
];

/** The backend returns employees by name, so that is the order shown until the user chooses a sort. */
export const DEFAULT_SORT: SortState = { column: 'name', direction: 'asc' };

/** What a cell shows when the employee has no value. */
export const EMPTY_VALUE = '—';
