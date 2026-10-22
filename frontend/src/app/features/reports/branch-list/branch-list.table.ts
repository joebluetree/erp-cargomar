import { Branch, SortState } from './branch-list.model';

/**
 * Returns a sorted copy of the rows, ignoring case; the sort is stable so equal values keep their order.
 * The page only has the rows of the current page, so this orders that page and nothing else: the backend decides
 * which branches are on which page.
 */
export function sortBranches(branches: readonly Branch[], sort: SortState): Branch[] {
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...branches].sort(
    (a, b) => factor * a[sort.column].localeCompare(b[sort.column], undefined, { sensitivity: 'base' }),
  );
}
