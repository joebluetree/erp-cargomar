/** One holiday of the branch's holiday file: its holiday, day and date, exactly as the file writes them. */
export interface Holiday {
  holiday: string | null;
  day: string | null;
  date: string | null;
}

/**
 * What `GET /api/admin/holidays` (the session's branch) and `GET /api/reports/branches/{id}/holidays` (a listed
 * branch) return: the branch and the holidays of its financial year, in file order.
 */
export interface HolidayList {
  branchCode: string;
  branchName: string;
  items: Holiday[];
}

/** The branch whose holidays are shown; its name heads the box. */
export interface HolidayBranch {
  code: string;
  name: string;
}

/** What a missing value shows. */
export const EMPTY_VALUE = '—';

/** Shown when the branch has no holiday file for the session's financial year (the backend answers 404). */
export const NOT_FOUND_TEXT = 'Holiday List Not Found';

/** The table's column headings, in display order. */
export const HOLIDAY_COLUMNS = ['Holiday', 'Day', 'Date'] as const;
