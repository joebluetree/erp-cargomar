# Design

## Context

See proposal.md for the motivation. The current state:

- **`admin-emp-profile`** (complete, not archived) provides:
  - `Employee` (`EMPM`, read-only, profile columns plus `EMP_IMAGE_NAME`) and `Parameter` (`PARAM`);
  - `EmployeeProfileRepository` (find by id, list state/country names);
  - `EmployeeProfileService`, which maps an `Employee` to `EmployeeProfileDto` and finds photos through `IEmployeePhotoStore`. It is used only for the session's own employee;
  - the `api/admin/profile` and `api/admin/profile/photo` endpoints;
  - the frontend `features/admin/employee-profile`: the page, the service with `load()` and `loadPhoto()`, and the layout.
- **The Company List** (`iErp.Reports/CompanyList`, `features/reports/company-list`) is the reference list screen:
  - query class with `Code`/`Name`/`Page`/`PageSize` and a FluentValidation validator;
  - repository filtering with `ToUpper().Contains()` (Oracle `UPPER(column) LIKE :p ESCAPE`, where EF escapes `%` and `_` in the value, so they are literal);
  - `ToPageAsync` with the 10g paging rewrite;
  - `PagedResult`;
  - frontend service, table sort, selection and `TableStateStore`, `TableToolbar`, `TablePager`, `TableWrapToggle`.
- **Session:** `ICurrentSession` gives `CompanyCode` and `BranchId`. `EMPM.REC_BRANCH_CODE` holds the branch's `COMPANYM.COMP_CODE`, not its id. Dev data facts:
  - every row matches a branch code;
  - codes are unique within a company;
  - `EMP_IS_RELIEVED` is always 'Y' or 'N';
  - `REC_COMPANY_CODE` and `REC_BRANCH_CODE` are `NVARCHAR2(15)`, and `EMP_IS_RELIEVED` is `CHAR(1)`.
- **Oracle 10.2:** no `TRUE`/`FALSE` literals; check the queries with `ToQueryString()`.

## Goals / Non-Goals

**Goals:**
- One scope rule (company, branch, not relieved), applied in one place for the list, the profile and the photo.
- Reuse the profile mapping, the photo lookup and the Profile page, with no second copy.

**Non-Goals:**
- Rights or roles.
- Masking fields.
- Editing.
- Exporting.
- A column filter on relieved employees.

## Decisions

### D1. Scope in the repository, from the session
- `Employee` gains `CompanyCode` (`REC_COMPANY_CODE`, 15), `BranchCode` (`REC_BRANCH_CODE`, 15) and `Relieved` (`EMP_IS_RELIEVED`, fixed length 1). Add a snapshot-only migration.
- New `EmployeeScope(string CompanyCode, string BranchCode)`, built by the service from `ICurrentSession`:
  - the company code comes from the token;
  - the branch code is looked up as `COMPANYM.COMP_CODE` of the session's `BranchId`, with `Type == "B"`.

  With no company, branch, or branch row, there is no scope: the list is empty, and a profile answers 404.
- `IQueryable<Employee> InScope(scope)` filters `CompanyCode == scope.CompanyCode && BranchCode == scope.BranchCode && Relieved == "N"` (string comparison, no booleans). It is used by both the list and `FindInScopeAsync(id, scope)`.

### D2. List endpoint in the Admin module
Folder `iErp.Admin/EmployeeList`, following CompanyList:
- `EmployeeListQuery` (`Code`, `Name`, `Page`, `PageSize`; at most 60 characters) and `EmployeeListQueryValidator`, using `PagingRules`.
- `IEmployeeListRepository.ListAsync(query, scope)`:
  - `InScope` then the filters on `Code` and `Name` (`ToUpper().Contains`);
  - `OrderBy(Name).ThenBy(Id)`;
  - `ToPageAsync`.
- `EmployeeListService` builds the scope and maps rows to `EmployeeListItemDto(Id, Code, Name, FatherName, DateOfBirth (DateOnly?), Address, Mobile, Email)`:
  - `Address` joins the trimmed lines 1–3 with ", ", leaving out empty ones;
  - text is trimmed, and blank becomes null.
- `EmployeesController` at `api/admin/employees`: `GET` (the list), `GET {id}` (the profile) and `GET {id}/photo`.

### D3. Profile of a listed employee reuses the profile service
`EmployeeProfileService` gets `GetAsync(string employeeId)` and `GetPhotoAsync(string employeeId)`:
- they look the employee up with `FindInScopeAsync(id, scope)` and then use the same private mapping and photo lookup as `GetOwnAsync`;
- the own-profile methods are unchanged, and their own employee is not limited by the scope;
- the controller answers 404 problem details "Employee not found." for null;
- the photo uses the same `PhysicalFile` and `Cache-Control: no-store`.

Alternative considered: a second, list-specific profile DTO. Rejected, because the user asked for the same profile view, and one mapping keeps the two in step.

### D4. Frontend list feature
`features/admin/employee-list`, built like the Company List:
- `employee-list.model.ts`: `Employee`, query, `COLUMNS`, `SortState`, the state key;
- `employee-list.service.ts`: `load(query)`, with the `items`, `total`, `loading` and `error` signals, and superseded responses ignored;
- `employee-list.table.ts`: `sortEmployees`, locale-aware and ignoring case;
- `employee-list.selection.ts`;
- `employee-list.page.ts/html`.

The shared pieces are `TableToolbar`, `TablePager`, `TableWrapToggle`, `TableStateStore`, `PageTitle` and `hlmTable`.
- The Employee No cell is an `<a [routerLink]="['/admin/employees', row.id]">`. Clicking the link opens the profile without changing the row selection (`$event.stopPropagation()`).
- Dates use the profile model's `formatDate`; an empty value shows "—".
- Routes: `admin/employees` with children `''` (the list, `EmployeeListService` provided) and `':id'` (the profile page, `EmployeeProfileService` provided).
- `NAV_ITEMS` gains `{ label: 'Employee List', icon: 'lucideUsers', route: '/admin/employees', tone: 'amber' }` after Profile. `lucideUsers` is added to `NAV_ICONS`.

### D5. The Profile page shows a given employee
- `EmployeeProfilePage` reads the route's `id`. With an id it is in "other employee" mode:
  - `service.load(id)` requests `admin/employees/{id}`, and the photo `admin/employees/{id}/photo`;
  - a back button before the title returns to the previous page (the list keeps its state);
  - a 404 shows "Employee not found.", with no notification.
- Without an id (the Profile menu entry) everything is as before.
- The service gets an optional `employeeId` on `load()` and `loadPhoto()`, so the photo URL follows the mode.

## Risks / Trade-offs

- **[Everyone sees everyone's bank and ID numbers in the branch]** Decided by the user. The scope keeps it to the user's own company and branch.
- **[Old links after a branch switch]** A profile URL from another branch answers 404 "Employee not found." The list itself reloads for the new branch.
- **[Branch code lookup per request]** One small `COMPANYM` query by key per list or profile request. It is cheap; no caching is needed.
- **[Oracle-only tests]** `EmployeeListTablesTests` creates shaped `EMPM`/`COMPANYM`/`PARAM` tables only in an empty test schema, and never runs against the dev database (memory rule).

## Migration Plan

1. Deploy the backend and frontend together. The endpoints and the menu entry are new.
2. No database change; the migration is snapshot-only.
3. Rollback: redeploy the previous build.
