/** One page of a table as returned by every table endpoint: the rows, how many rows match in all, and the page asked for. */
export interface Paged<T> {
  items: T[];
  total: number;
  /** One-based page number. */
  page: number;
  pageSize: number;
}

/** The page sizes every table offers (2 lets paging be tried with a handful of rows). The backend rejects any other size. */
export const PAGE_SIZES = [2, 5, 10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

export interface PageRange {
  pageCount: number;
  /** One-based number of the first row shown; 0 when no row is shown. */
  from: number;
  /** One-based number of the last row shown; 0 when no row is shown. */
  to: number;
}

/** Which rows a one-based page covers, out of `total` matching rows. A page past the end shows no rows. */
export function rangeOf(total: number, page: number, pageSize: number): PageRange {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  if (total === 0 || start >= total || start < 0) {
    return { pageCount, from: 0, to: 0 };
  }
  return { pageCount, from: start + 1, to: Math.min(total, start + pageSize) };
}
