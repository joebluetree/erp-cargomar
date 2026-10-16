import { Employee, SortState } from './employee-list.model';

/**
 * Returns a sorted copy of the rows, ignoring case; the sort is stable so equal values keep their order, and an
 * empty value sorts as "". Dates are `yyyy-MM-dd`, so comparing them as text orders them by date. The page only has
 * the rows of the current page, so this orders that page and nothing else: the backend decides which employees are
 * on which page.
 */
export function sortEmployees(employees: readonly Employee[], sort: SortState): Employee[] {
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...employees].sort(
    (a, b) => factor * (a[sort.column] ?? '').localeCompare(b[sort.column] ?? '', undefined, { sensitivity: 'base' }),
  );
}
