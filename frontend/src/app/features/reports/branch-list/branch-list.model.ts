/** One branch as returned by `GET /api/reports/branches`. Optional values arrive as empty strings. */
export interface Branch {
  id: string;
  code: string;
  name: string;
  address1: string;
  address2: string;
  address3: string;
  tel: string;
  email: string;
  web: string;
}

/** What the page asks the backend for: the searched filters and one page. */
export interface BranchListQuery {
  code: string;
  name: string;
  /** One-based page number. */
  page: number;
  pageSize: number;
}

export type SortColumn = Exclude<keyof Branch, 'id'>;
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

/**
 * Everything the page remembers while the user is on another screen (the selected row is kept separately by
 * `BranchListSelection`). Rows are not part of it: they are requested again when the page is shown.
 */
export interface BranchListState {
  /** The text in the filter boxes, searched or not. */
  codeInput: string;
  nameInput: string;
  /** The filters last searched; paging and the request on return use these. */
  applied: { code: string; name: string };
  /** One-based page number. */
  page: number;
  pageSize: number;
  sort: SortState;
  /** Whether the user chose a sort (until then rows keep the backend's order). */
  sortChosen: boolean;
  /** Whether the "Wrap text" toggle is on. Optional so state saved before it existed means the default (on). */
  wrap?: boolean;
}

/** The key under which the Branch List saves its state in `TableStateStore`. */
export const BRANCH_LIST_STATE_KEY = 'reports/branches';

/** The table columns in display order. */
export const COLUMNS: readonly { key: SortColumn; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'address1', label: 'Address-1' },
  { key: 'address2', label: 'Address-2' },
  { key: 'address3', label: 'Address-3' },
  { key: 'tel', label: 'Tel' },
  { key: 'email', label: 'Email' },
  { key: 'web', label: 'Web' },
];

/** The backend returns branches by name, so that is the order shown until the user chooses a sort. */
export const DEFAULT_SORT: SortState = { column: 'name', direction: 'asc' };
