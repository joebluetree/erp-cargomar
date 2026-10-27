# Design

## Context

See proposal.md for the motivation. The current state:

- **Company List** (`iErp.Reports/CompanyList`, `features/reports/company-list`) is the reference list screen:
  - `CompanyListQuery` with its validator, the repository (`Type == "C"`, not deleted, `ToUpper().Contains()` filters, order by name then id, `ToPageAsync`), `PagedResult`, and `CompaniesController`;
  - the frontend's model, service, `sortCompanies`, `CompanyListSelection`, `TableStateStore`, `TableToolbar`, `TablePager` and `TableWrapToggle`.
- **`COMPANYM`** is mapped as `Company` (`Id`, `Type`, `ParentId`, `Code`, `Name`, address lines, `Tel`, `Email`, `Web`, `DeletedDate`).
  - A branch's `COMP_PARENT_ID` is its company's `COMP_PKID`. Dev data: every branch has a parent company, and its `REC_COMPANY_CODE` always equals that company's code. CPL has 16 branches, SGT 7, CMR 2 and AGA 1; none is deleted.
  - The session gives `CompanyId` (the company's `COMP_PKID`) and `CompanyCode`.
- **Holiday List** (`admin-holiday-list`, complete, not archived) lives in `iErp.Admin/HolidayList`:
  - `HolidayLines` / `HolidayDates` (parsing), `HolidayDto` / `HolidayListDto`;
  - `HolidayListsOptions` and `HolidayFileStore` (the folder);
  - `HolidayListRepository` (branch and year codes) and `HolidayListService` (session file name);
  - `HolidaysController`.
- **The frontend's** `features/admin/holiday-list` has the page (box, Holiday | Day | Date grid, states) and its service (`admin/holidays`).
- **Module rule** (`Architecture/DependencyRuleTests`): modules reference only Entities, Data, Shared and SharedBusiness, never each other. SharedBusiness references only Entities and Shared, and is empty today. So `iErp.Reports` cannot use `iErp.Admin/HolidayList`.
- **Similar pages:** the Employee Profile opened from the Employee List shows the pattern for one page in two modes (an optional route id, a Back button).

## Goals / Non-Goals

**Goals:**
- One copy of the holiday file rules (name, folder, line reading), used by both the Holiday List and the branch holidays.
- The Branch List behaves exactly like the Company List; only the scope, the endpoint and the Holiday column differ.

**Non-Goals:**
- Other financial years than the session's on the branch holiday page.
- Editing branches or holiday files.
- Rights or roles: every logged-in user may list the company's branches, as with the Company List.

## Decisions

### D1. Holiday file reading moves to `iErp.SharedBusiness/Holidays`
The following move unchanged, apart from the namespace (`iErp.SharedBusiness.Holidays`):
- `HolidayLines`, `HolidayDates`, `HolidayDto`;
- `HolidayListsOptions`, `IHolidayFileStore` / `HolidayFileStore`.

One small new helper joins them: `HolidayFiles.NameFor(companyCode, branchCode, yearCode)`, which returns `CPL-COKSF-2026.txt`, or null when a part is missing. It holds the naming rule (trimmed codes, the year as a whole number) that `HolidayListService` builds today.
- `iErp.Admin/HolidayList` keeps its repository, service, `HolidayListDto` and controller, now using the shared pieces. Its behavior and tests stay the same; the tests' `using`s change.
- Both modules register the store with `TryAddSingleton<IHolidayFileStore, HolidayFileStore>()`. `Program.cs` keeps binding `HolidayListsOptions`, from the new namespace.
- SharedBusiness needs only `Microsoft.Extensions.Options`, which comes with the ASP.NET Core framework reference that `iErp.Shared` already has. The dependency rule is unchanged.
- *Alternative considered:* a second copy of the parser in Reports. Rejected: two copies of a hand-written file format drift apart.
- *Alternative considered:* the branch endpoint in Admin (`api/admin/branches/{id}/holidays`). Rejected: the endpoint belongs to the report that links to it, and BR-002 is part of the Reports BRS.

### D2. Backend feature `iErp.Reports/BranchList`
Built like `CompanyList`:
- `BranchListQuery` (`Code`, `Name`, `Page`, `PageSize`) and its validator, sharing the Company List's rules (page from 1, the common page sizes, filter length).
- `IBranchListRepository` / `BranchListRepository`:
  - `Branches(query, companyId)` is a public `IQueryable` for `ToQueryString()` tests: `Type == "B" && ParentId == companyId && DeletedDate == null`, with the same filters and the order name, then id;
  - `ListAsync` calls `ToPageAsync`;
  - `FindListedAsync(id, companyId)` returns the branch only if it is one of the company's listed branches.
  - The company is matched by `ParentId == CompanyId` rather than `REC_COMPANY_CODE == CompanyCode`. The data shows they always agree, and `ParentId` is already mapped, so neither the mapping nor a migration changes.
- `BranchListItemDto(Id, Code, Name, Address1, Address2, Address3, Tel, Email, Web)`, with empty values as `""` (as `CompanyListItemDto`).
- `IBranchListService` / `BranchListService`:
  - `ListAsync(query)` returns an empty page when the session has no company;
  - `GetHolidaysAsync(id)` returns `BranchHolidayListDto(BranchCode, BranchName, Items)` or null. It needs a listed branch, the session's year code (`YEARM.YEAR_CODE` through the repository, `FinancialYear` by `YearId`), `HolidayFiles.NameFor` and the store; any missing piece gives null.
- `BranchesController`:
  - `GET api/reports/branches` answers 200 `PagedResult`, or 400 through the validation filter;
  - `GET api/reports/branches/{id}/holidays` answers 200, or 404 "Holiday list not found." through `ApiProblem`.
- Registered in `ReportsRegistration`.

### D3. Frontend feature `features/reports/branch-list`
A copy of the Company List's structure:
- `branch-list.model.ts`: `Branch`, query, `COLUMNS` (the eight sortable ones), `SortState`, state key `reports/branches`;
- `branch-list.service.ts`, `branch-list.table.ts` (`sortBranches`), `branch-list.selection.ts`, and `branch-list.page.ts/html` with the same shared pieces.

The Holiday List column is a ninth, non-sortable header "Holiday List".
- Each cell holds a small outline icon button (`lucideCalendarDays`), named `Holidays of <name>` (`aria-label`, also the `title`).
- It navigates with `router.navigate(['/reports/branches', id, 'holidays'])`. `$event.stopPropagation()` on click, Enter and Space leaves the row selection unchanged.

Routes `reports/branches`:
- `''` is the list, with `BranchListService` provided;
- `':id/holidays'` is the Holiday List page, with `HolidayListService` provided.

`NAV_ITEMS` gains `{ label: 'Branch List', icon: 'lucideBuilding2', route: '/reports/branches', tone: 'teal' }` after Company List. `lucideBuilding2` is added to `NAV_ICONS`; `teal` is the next tone not used by another entry.

### D4. The Holiday List page for a given branch
`HolidayListPage` reads the route's `id` (optional, as `EmployeeProfilePage` does).
- With an id:
  - `service.load(id)` requests `reports/branches/{id}/holidays`;
  - the service keeps the response's `branchCode` and `branchName` in a `branch` signal;
  - a Back button before the title returns to the previous page, or to `/reports/branches` when opened directly;
  - the branch's name shows as the header inside the box, as on the own Holiday List (admin-holiday-list D3);
  - it does not follow a branch switch: the branch is the one in the URL, and the list reloads only when the session's year changes.
- Without an id, everything is as before.

The 404 state, the box and the columns are shared, so both pages look the same.

## Risks / Trade-offs

- [Moving files between projects can break the Holiday List] → The move is mechanical; the Holiday List's existing tests run unchanged apart from `using`s and must stay green. Its live behavior is checked again in the final task.
- [`ParentId` instead of `REC_COMPANY_CODE`] → Verified equal in the dev data. If they ever differ, the parent link is the one the rest of the application (Change Branch) already trusts.
- [A link to another company's branch] → It answers 404 like a missing file, so it reveals neither the branch nor whether a file exists.
- [`admin-holiday-list` not archived yet] → This change's apply starts from that code. The two changes are archived in order: `admin-holiday-list` first.

## Migration Plan

There is no database change and no migration; deploying is the usual build. Rollback is reverting the change. The Holiday List keeps working, because the shared code is the same code moved.
