# Design

## Context

See proposal.md for the motivation. The current state:

- **Session:** `ICurrentSession` gives `CompanyCode`, `BranchId` and `YearId`. Neither the branch's code nor the year's code is in the token.
  - The branch code is `COMPANYM.COMP_CODE` of the branch row (`COMP_TYPE` 'B'). `EmployeeProfileRepository.Branch(id)` already reads it, for the Employee List scope.
  - The year code is `YEARM.YEAR_CODE`, mapped as `FinancialYear.Code` (`decimal?`). In the dev data it is the start year: 2026 for 2026-04-01 to 2027-03-31.
- **Files from a configured folder:** `EmployeeImagesOptions` (`EmployeeImages:Folder`, bound in `Program.cs`) and `EmployeePhotoStore` read a file by name through `IOptionsMonitor`. They keep only the bare file name and check that the full path stays inside the folder. This is the pattern to follow.
- **404 without a notification:** `EmployeeProfileController` answers 404 with `ApiProblem.Create(...)`. On the frontend, `EmployeeProfileService` sends the request with `SKIP_ERROR_NOTIFICATION`, treats 404 as a normal state, and notifies other failures itself.
- **Profile box look:** a `hlmCard` with `rounded-2xl bg-profile-box shadow-md ring-0`, and label-value rows in a `grid-cols-[auto_1fr]` `dl`. The labels use `text-profile-label`; the values are `font-medium`. The reference picture is `kb/ui-templates/admin/emp-profile-basic-info.JPG`.
- **Following the session:** `EmployeeListPage` reloads when `AuthSession.session().branchId` changes after a branch switch.
- **Folders on this machine:** the holiday files are in `D:\erp-cargomar\resources\Holiday List\`, which so far holds only an empty sample. The photos are in `D:\erp-cargomar\resources\images\`; `D:\erp-cargomar\images\` no longer exists.

## Goals / Non-Goals

**Goals:**
- Read one file, chosen only from session values, with no way for a request to name another file.
- Keep the file's own order and text, so the person who maintains the file decides what users see.

**Non-Goals:**
- Writing, uploading or editing holiday files.
- Any branch's list other than the session's (BRS: out of scope).
- Sorting, filtering, or parsing the dates into date values.
- Caching. The file is read on each request, so an edited file shows at once.

## Decisions

### D1. Backend feature `iErp.Admin/HolidayList`
- `HolidayListsOptions` (section `HolidayLists`, `Folder`), bound in `Program.cs` next to `EmployeeImagesOptions`. `appsettings.json` gets `"HolidayLists": { "Folder": "D:\\erp-cargomar\\resources\\Holiday List\\" }`.
- `IHolidayListRepository` / `HolidayListRepository` (read-only, `AsNoTracking`):
  - `FindBranchCodeAsync(branchId)`: `COMPANYM`, `COMP_TYPE` 'B';
  - `FindYearCodeAsync(yearId)`: `YEARM.YEAR_CODE`.

  Its own small repository rather than a call into `EmployeeProfileRepository`, so the two features stay independent. The queries are public `IQueryable`s, so their SQL can be checked for Oracle 10g with `ToQueryString()`.
- `IHolidayFileStore` / `HolidayFileStore`: `Read(fileName)` returns the file's lines, or null when there is none. It follows `EmployeePhotoStore`:
  - only the bare file name is used;
  - the full path must stay inside the folder;
  - the name must end in `.txt`;
  - an empty folder setting means no file.

  It reads with `File.ReadAllLines(path, Encoding.UTF8)`, which also honours a byte order mark.
- `IHolidayListService` / `HolidayListService.GetAsync()`:
  1. Take the company code, branch id and year id from `ICurrentSession`.
  2. Look up the branch code and the year code; any missing value means not found.
  3. Build `"{company}-{branch}-{year}.txt"` from the trimmed codes, with the year as a whole number (`2026`, not `2026.0`).
  4. Read the file through the store and parse its lines (D2).

  It returns `HolidayListDto(IReadOnlyList<HolidayDto> Items)`, or null when not found.
- `HolidaysController`: `[Authorize]`, `GET api/admin/holidays`. It answers 200 with the DTO (camelCase JSON: `{ items: [{ reason, date }] }`), or 404 `ApiProblem` with `NotFoundMessage = "Holiday list not found."`. Registered in `AdminRegistration`.
- *Alternative considered:* putting the branch and year codes in the token. Rejected: it changes the token, login and Change Branch for one screen. Two indexed key lookups per request are cheap.

### D2. Line format
`HolidayLines.Parse(lines)`, in `iErp.SharedBusiness/Holidays` since `reports-branch-list`, handles each line, trimmed:
- a blank line is skipped, and so is a heading whose fields are "Holiday", "Day" and "Date" (any case);
- the line is split at its commas, and every field is trimmed; an empty field becomes `null`;
- three or more fields: the last is the date, the one before it the day, and the rest, joined with ",", the holiday;
- two fields: holiday and date;
- one field: the holiday alone.

`HolidayDto(Holiday, Day, Date)` carries the three texts exactly as written. Nothing is calculated, checked or reformatted. The file's author decides what users see, and a wrong day in the file shows as written.
- The earlier rules are removed with their tests: columns split at spaces, the single-space split, `HolidayDates` (calendar dates, month names, the year from the file name) and `HolidayFiles.YearOf`. A space-separated line now shows whole as the holiday, which makes a file that needs rewriting easy to spot.
- `HolidayListService` and `BranchListService` call `Parse(lines)` without a year.
- `HolidayListDto` gains `BranchCode` and `BranchName`, the session branch's, so the page can show the branch in the box. `HolidayListRepository.FindBranchCodeAsync` becomes `FindBranchAsync`, returning the code and name.

### D3. Frontend feature `features/admin/holiday-list`
- `holiday-list.model.ts`: `Holiday { holiday: string | null; day: string | null; date: string | null }`, `HolidayList { branchCode; branchName; items: Holiday[] }`, `NOT_FOUND_TEXT = 'Holiday List Not Found'`. `weekdayOf` and `formatHolidayDate` are removed.
- `holiday-list.service.ts`, provided by the route:
  - `load()` requests `admin/holidays` with `SKIP_ERROR_NOTIFICATION`;
  - signals `items`, `branch`, `loading`, `notFound` and `error`; a response superseded by a newer `load()` is ignored;
  - 404 sets `notFound` with no notification; any other failure sets `error` and gives one `NotificationService.error` (as `EmployeeProfileService`).
- `holiday-list.page.ts/html`:
  - `PageTitle` "Holiday List";
  - the states: loading; not found ("Holiday List Not Found", `role="status"`); error (alert with Retry); empty ("There are no holidays in the list.");
  - otherwise one `hlmCard` box with the Profile box classes. At its top, a header (`data-slot="holiday-branch"`, semibold, `text-profile-heading`) with the branch's name. Then a three-column grid (`grid-cols-[auto_auto_auto]`) with a heading row (Holiday, Day, Date, semibold), then one row per holiday:
    - the holiday in `text-profile-label`;
    - the day;
    - the date in `font-medium`.

    Every value is shown exactly as received, all columns are left-aligned, and an empty value shows "—". The text is 18 px (`md:text-lg`) from `md` up; on phones it is 16 px with a narrower column gap, the holiday wraps between words, and the box scrolls sideways only if a row still does not fit. The box is a quarter of the screen wide (`md:w-[25vw]`, never narrower than its rows; the full width on phones) and two thirds of the screen high (`h-[66.667vh]`), scrolling inside when the list is longer.
- The page reloads when the session's `branchId` or `yearId` changes (an `effect` like the Employee List's, skipping the first run).
- `holiday-list.routes.ts` provides `HolidayListService`. `app.routes.ts` gets `admin/holidays`.
- `NAV_ITEMS` gets `{ label: 'Holiday List', icon: 'lucideCalendarDays', route: '/admin/holidays', tone: 'rose' }` after Employee List, and `lucideCalendarDays` is added to `NAV_ICONS`. `rose` is the next tone not used by another entry.

### D4. Photo folder
`appsettings.json` `EmployeeImages:Folder` becomes `D:\erp-cargomar\resources\images\`. No code changes. The `employee-profile-api` spec's default is updated to match.

## Risks / Trade-offs

- [The file is maintained by hand, and its days or dates may be wrong] → They show exactly as written, so the file stays the single source; a wrong day (`Labour Day,Tuesday,01-May-2026`) must be fixed in the file. The format is in the spec, so whoever maintains the files can follow it.
- [Files written before with spaces instead of commas] → Such a line shows whole as the holiday, with "—" for day and date, so the file is easy to spot and rewrite as `holiday,day,date`. The two current files (`CPL-BLRAF-2026.txt`, `CPL-COKSF-2026.txt`) need that rewrite.
- [The year code is a number in `YEARM`] → It is formatted as a whole number with the invariant culture. A null code means not found, not a file named `CPL-COKSF-.txt`.
- [Windows file names are case-insensitive, other systems' are not] → The codes are used as stored (upper case in the dev data). The files should be named in upper case, as in the BRS example.
- [A very large file] → Not expected. Holiday files hold a few dozen lines, so there is no size limit.
- [Settings differ per machine] → Both folders are settings and can be overridden per environment or with `HolidayLists__Folder` / `EmployeeImages__Folder`.

## Migration Plan

There is no database change and no migration. Deploying means:
- placing the holiday files, named `<company>-<branch>-<year>.txt`, in the configured folder;
- checking the two folder settings on the server.

Rollback is removing the menu entry and route, or reverting the change.
