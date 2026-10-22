# Tasks

## 1. Backend

- [x] 1.1 Shared holiday files (D1):
  - move `HolidayLines`, `HolidayDates`, `HolidayDto`, `HolidayListsOptions`, `IHolidayFileStore` and `HolidayFileStore` to `iErp.SharedBusiness/Holidays`;
  - add `HolidayFiles.NameFor`, and use it in `HolidayListService`;
  - register the store with `TryAddSingleton` in both modules, and update `Program.cs`.

  Verify:
  - every existing Holiday List test passes with only its `using`s changed;
  - new `Unit/HolidayFilesTests`: `CPL-COKSF-2026.txt` from codes with spaces and a decimal year, and null when a part is missing;
  - `Architecture/DependencyRuleTests` passes (SharedBusiness still depends only on Entities and Shared).
- [x] 1.2 Branch list (D2): `BranchListQuery` with its validator, `BranchListRepository` (`Branches`, `ListAsync`), `BranchListItemDto`, `BranchListService.ListAsync`, and `BranchesController` `GET api/reports/branches`, registered in `ReportsRegistration`. Verify with tests:
  - `Unit/BranchListQueryTests` (`ToQueryString()`): no `TRUE`/`FALSE`; `COMP_TYPE` 'B', `COMP_PARENT_ID` and `REC_DELETED_DATE` in the WHERE; `UPPER(...) LIKE ... ESCAPE` filters; order by name then id;
  - validator tests (page, page size, filter length);
  - service tests: mapping with `""` for empty values; no company in the session gives an empty page without a query;
  - `Integration/BranchListEndpointTests` with a fake repository: a 200 camelCase page; 400 for `page=0` and `pageSize=7`; 401 without a token.
- [x] 1.3 Branch holidays (D2): `FindListedAsync` and the year code on the repository, `BranchListService.GetHolidaysAsync`, `BranchHolidayListDto`, and `GET api/reports/branches/{id}/holidays`. Verify with tests:
  - service tests: a listed branch with a file gives its code, name and parsed holidays from `CPL-BLRAF-2026.txt`; an unlisted branch, no year or year code, and no file give null; an unlisted branch reads no file;
  - `Integration/BranchListEndpointTests` with a temporary holiday folder: 200 with `branchCode`, `branchName` and items; 404 "Holiday list not found." for an unlisted branch and for a missing file; 401 without a token.
- [x] 1.4 Add the Oracle-gated `Integration/BranchListTablesTests`, following `CompanyListTablesTests`. It creates a shaped `COMPANYM` only in a schema that has none, and checks:
  - the company scope (another company's branch, a company row, a deleted branch);
  - the filters, the order and the paging;
  - `FindListedAsync`.

  Verify that it is skipped in `dotnet test` without `IERP_TEST_ORACLE`, and never point it at the dev database.

## 2. Frontend

- [x] 2.1 Branch List feature (D3): model, service, table sort, selection, page (the eight columns plus the Holiday button column), routes, and `reports/branches` in `app.routes.ts`. Verify with specs following the Company List specs:
  - the service builds the query parameters;
  - the page: the layout; the nine columns in order; Search-only filtering; sorting the eight columns; selection; the pager; Wrap text; the remembered state; the loading, empty and error states;
  - the Holiday button: its name, and that click, Enter and Space navigate to `/reports/branches/{id}/holidays` without changing the selection;
  - the look guard passes.
- [x] 2.2 Holiday List page for a branch (D4): the route id, `load(id)` with the `branch` signal, the Back button, and the branch code and name under the title. Verify with specs:
  - with an id it requests `reports/branches/{id}/holidays` and shows the branch and its rows;
  - a 404 shows "Holiday List Not Found" without a notification;
  - a year switch reloads and a branch switch does not;
  - Back returns to the list, or to `/reports/branches` when opened directly;
  - without an id the existing specs stay green.
- [x] 2.3 Add the Branch List entry to `NAV_ITEMS` (`lucideBuilding2`, tone teal). Verify that the nav-items, app-nav, Dashboard and clickable-cursor specs pass with the new entry. Then run `npm test -- --no-watch` and `npm run build`.

## 3. Final check

- [x] 3.1 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate reports-branch-list --strict`. Then do a read-only live check against the dev DB, through the running API (credentials only in a temporary file, deleted right after):
  - the branch total equals a `SELECT COUNT(*)` of the company's branches;
  - a code filter narrows it;
  - a branch with a holiday file answers 200, and a branch of another company answers 404.

  In the browser, check:
  - open Branch List from the menu;
  - search, sort and page;
  - press a branch's Holiday button to see its list (a test file in a temporary folder set with `HolidayLists__Folder`);
  - go back to the list as it was;
  - the own Holiday List still works;
  - dark theme and phone width.

  Report the kb documents that are now out of date, without editing them.
