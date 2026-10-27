# Tasks

## 1. Backend

- [x] 1.1 Line parsing (D2): `HolidayLines.Parse(lines)` returns `HolidayDto(Reason, Date)` items in file order. Verify with `Unit/HolidayLinesTests`:
  - "Republic Day, 26-01-2026";
  - a reason with commas (split at the last comma);
  - a line without a comma (no date);
  - an empty reason or date becomes null;
  - spaces are trimmed;
  - blank lines are skipped;
  - no lines gives no items.
- [x] 1.2 Folder and file (D1):
  - `HolidayListsOptions` (`HolidayLists:Folder`), bound in `Program.cs`, with `"HolidayLists": { "Folder": "D:\\erp-cargomar\\resources\\Holiday List\\" }` in `appsettings.json`;
  - `HolidayFileStore.Read(fileName)`.

  Verify with `Admin/HolidayFileStoreTests` on a temporary folder:
  - the file's lines are read (UTF-8, with and without a byte order mark);
  - a missing file, an empty folder setting, a non-`.txt` name and a name with a path ("..\x.txt") give null, and nothing outside the folder is read;
  - a changed folder setting applies.
- [x] 1.3 Branch and year codes (D1): `HolidayListRepository` with `FindBranchCodeAsync` (`COMPANYM`, `COMP_TYPE` 'B') and `FindYearCodeAsync` (`YEARM.YEAR_CODE`). Verify with `Unit/HolidayListQueryTests`, using `ToQueryString()`: the SQL has no `TRUE`/`FALSE` and reads `COMPANYM` with `COMP_TYPE` 'B' and `YEARM` by `YEAR_PKID`.
- [x] 1.4 Service and endpoint (D1):
  - `HolidayListService.GetAsync()` builds `"{company}-{branch}-{year}.txt"` from the session and returns the parsed items, or null;
  - `HolidaysController` `GET api/admin/holidays` answers 200 `{ items: [{ reason, date }] }` or 404 "Holiday list not found.";
  - registered in `AdminRegistration`.

  Verify with tests:
  - `Admin/HolidayListServiceTests`: the file name `CPL-COKSF-2026.txt` from codes with spaces and a decimal year 2026; no company, branch, year, branch code or year code gives null and reads no file; a missing file gives null; an empty file gives no items;
  - `Integration/HolidayListEndpointTests` with a fake repository and a temporary folder: 200 camelCase body in file order, 404 with the message, 401 without a token (no file read).
- [x] 1.6 Calendar dates (D2): `HolidayDates.Read(text)`, and `HolidayDto(Reason, DateText, Date)` with `Date` as `yyyy-MM-dd`. Verify with tests:
  - `Unit/HolidayLinesTests`: `26-01-2026`, `26/01/2026`, `26.01.2026` and `2026-01-26` read as 2026-01-26; `31-02-2026`, `26-13-2026` and a missing date give no date while the text is kept;
  - `Integration/HolidayListEndpointTests`: the body has `reason`, `dateText` and `date` (`"2026-01-26"`);
  - `dotnet test` passes.
- [x] 1.7 Columns (D2): split lines into columns at tabs or two or more spaces, skip a `Holiday … Date` heading, take the first and last columns, and read month names in dates. Verify with tests:
  - `Unit/HolidayLinesTests`: the three-column and two-column layouts; the heading skipped (any case); the middle column ignored; the real files' lines (`Republic Day    Monday    26-January-2026` and `Republic Day    26-01-2026`); comma lines unchanged;
  - `Unit/HolidayDatesTests`: `26-January-2026`, `26-Jan-2026`, `26 jan 2026` and `26-Sept-2026` are read; `26-Janu-2026` and `31-February-2026` are not;
  - `dotnet test` passes.
- [x] 1.8 Year from the file name (D2): `HolidayDates.Read(text, fileYear)` and `HolidayLines.Parse(lines, fileYear)` read day-month dates with the file's year; `HolidayListService` (and `BranchListService`) pass the year code. Verify with tests:
  - `Unit/HolidayLinesTests` and `HolidayDatesTests`: `26-01`, `26/01`, `26.01`, `26-Jan`, `26-January` and `26 Jan` with year 2026 read as 2026-01-26; the text is kept; `31-02` is no date; a date with its own year keeps it; without a file year a day-month date is no date; `Onam 26-08` splits at the single space;
  - service tests: the year code that names the file reaches the parser (`26-Jan` in `CPL-COKSF-2026.txt` gives 2026-01-26), for the Holiday List and the Branch List;
  - `dotnet test` passes.
- [x] 1.9 Exact `holiday,day,date` lines (D2): `HolidayDto(Holiday, Day, Date)` as written, the comma rules and the heading skip; remove `HolidayDates`, `HolidayFiles.YearOf`, the space and single-space rules and their tests; `HolidayListDto` gains the session branch's `BranchCode` and `BranchName` (`FindBranchAsync`); `BranchListService` follows. Verify with tests:
  - `Unit/HolidayLinesTests`: three fields as written (a wrong day kept); a holiday with commas; two fields; one field; empty fields; the heading (any case) skipped; a space-separated line is the holiday only; blank lines; no lines;
  - service tests (Holiday List and Branch List): the parsed items; the Holiday List response has the branch code and name;
  - `Integration/HolidayListEndpointTests` and `BranchListEndpointTests`: camelCase `holiday`, `day`, `date`, and `branchCode` / `branchName`;
  - `dotnet test` passes.
- [x] 1.5 Photo folder (D4): set `EmployeeImages:Folder` in `appsettings.json` to `D:\\erp-cargomar\\resources\\images\\`. Verify that `dotnet build` and `dotnet test` (`backend/iErp.sln`) pass.

## 2. Frontend

- [x] 2.1 Holiday List feature (D3): model, service, page, routes, and the `admin/holidays` route in `app.routes.ts`. Verify with specs:
  - `holiday-list.service.spec.ts`: requests `admin/holidays` without the interceptor notification; exposes the items; 404 sets not found with no notification; another failure sets the error with one notification; a superseded response is ignored;
  - `holiday-list.page.spec.ts`:
    - the title "Holiday List";
    - one box with the Profile box look;
    - rows of reason then date in file order, both columns left-aligned;
    - "—" for a missing value;
    - no inputs or edit, save or delete buttons;
    - the loading, "Holiday List Not Found", "There are no holidays in the list." and alert-with-Retry states;
    - a reload after a branch switch and after a year switch, and none after another session change;
  - the look guard passes.
- [x] 2.3 Three columns (D3): the model's `dateText` and `date`, `weekdayOf` and `formatHolidayDate`, and the page's Holiday, Day and Date grid with its heading row. Verify with specs:
  - the model: `2026-01-26` gives "Monday" and "26-Jan-2026", with no time-zone shift (also on the first and last day of a month);
  - the page: the headings Holiday, Day and Date in that order; each row's reason, weekday and `dd-MMM-yyyy` date; "—" under Day with the text under Date for an unreadable date; "—" for missing values; all columns left-aligned;
  - `npm test -- --no-watch` and `npm run build` pass.
- [x] 2.4 Date as written (D3): the Date column shows `dateText` unchanged, the Day column `weekdayOf(date)`; remove `formatHolidayDate`. Verify with specs: a row shows the calculated weekday and the date text as written ("01-May-2026" with "Friday"); "—" under Day for an unreadable date; `npm test -- --no-watch` and `npm run build` pass.
- [x] 2.5 One date format (D3): `formatHolidayDate(date)` gives `dd-MMMM-yyyy` with English month names, and the Date column shows it, or `dateText` as written when `date` is null. Verify with specs:
  - the model: `2026-01-26` gives "26-January-2026" and `2026-05-01` "01-May-2026", with no time-zone shift on the first and last day of a month;
  - the page: dates written as `26-01-2026`, `26/08/2026`, `2026-11-08` and `01-May-2026` all show as `dd-MMMM-yyyy`; an unreadable date shows as written with "—" for its day;
  - the branch holiday page shows the same format;
  - `npm test -- --no-watch` and `npm run build` pass.
- [x] 2.6 Exact columns and the branch header (D3): the model's `holiday`, `day`, `date` and the list's branch; the page shows each value as received and the branch name as a header inside the box, on the own Holiday List and the branch holiday page; remove `weekdayOf` and `formatHolidayDate`. Verify with specs: the header is the first thing in the box on both pages; rows show the received texts unchanged ("Tuesday" with "01-May-2026"); "—" for a missing value; the branch line is no longer under the title on the branch page; `npm test -- --no-watch` and `npm run build` pass.
- [x] 2.2 Add the Holiday List entry to `NAV_ITEMS` (`lucideCalendarDays`, tone rose). Verify that the nav-items, app-nav, Dashboard and clickable-cursor specs pass with the new entry. Then run `npm test -- --no-watch` and `npm run build`.

## 3. Final check

- [x] 3.1 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate admin-holiday-list --strict`. Then in the browser, using the dev DB read-only and a test file in a temporary folder set with `HolidayLists__Folder` (never written into the real folder), check:
  - open Holiday List from the menu;
  - the holidays of the session's company, branch and year appear in file order, and "—" shows for a missing date;
  - "Holiday List Not Found" appears for a branch without a file, after a branch switch;
  - the Profile photo still shows from `resources\images`;
  - dark theme and phone width.

  Report the kb documents that are now out of date, without editing them.
