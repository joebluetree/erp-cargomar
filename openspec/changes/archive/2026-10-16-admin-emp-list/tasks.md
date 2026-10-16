# Tasks

## 1. Mapping

- [x] 1.1 Add `CompanyCode` (`REC_COMPANY_CODE`, 15), `BranchCode` (`REC_BRANCH_CODE`, 15) and `Relieved` (`EMP_IS_RELIEVED`, fixed length 1) to `Employee` and `EmployeeConfiguration` (D1). Verify:
  - `EmployeeMappingTests` checks each new column, and the property count is updated;
  - `dotnet build backend/iErp.sln` passes.
- [x] 1.2 Add the snapshot-only migration `EmployeeScopeReadOnlyMapping` (empty `Up`/`Down`). Verify that `dotnet ef migrations script` has no `EMPM` statement.

## 2. Backend

- [x] 2.1 Scope (D1):
  - `EmployeeScope`;
  - building it from `ICurrentSession` (company code, and the branch code from `COMPANYM` by `BranchId`, `Type == "B"`);
  - `InScope` on the repository, with `FindInScopeAsync`.

  Verify with tests:
  - unit tests on the scope builder: no company, no branch, or no branch row gives no scope;
  - `Unit/EmployeeListQueryTests` with `ToQueryString()`: the scope and filter SQL has no `TRUE`/`FALSE`, filters `REC_COMPANY_CODE`, `REC_BRANCH_CODE` and `EMP_IS_RELIEVED = N'N'`, and uses `LIKE … ESCAPE`.
- [x] 2.2 List (D2):
  - `EmployeeListQuery` and validator;
  - repository `ListAsync`;
  - `EmployeeListService` with `EmployeeListItemDto` (the address joined);
  - `EmployeesController` `GET api/admin/employees`;
  - registered in `AdminRegistration`.

  Verify with tests:
  - validator tests (page, page size, filter length);
  - service tests (mapping, address joining, empty values, no scope gives an empty page);
  - `Integration/EmployeeListEndpointTests` with a fake repository: 200 paged body in camelCase, 400 cases, 401 without a token.
- [x] 2.3 Profile and photo of a listed employee (D3):
  - `EmployeeProfileService.GetAsync(id)` and `GetPhotoAsync(id)`, reusing the mapping and the photo store;
  - `GET api/admin/employees/{id}` and `{id}/photo`, with 404 "Employee not found." and `no-store`.

  Verify with tests:
  - service tests: in scope returns the full profile; out of scope or an unknown id returns null; the own profile is not affected;
  - endpoint tests: 200 for an employee in scope, 404 for another branch, a relieved employee or an unknown id, photo 200/404, 401.

  Then run `dotnet test backend/iErp.sln`.
- [x] 2.4 Add the Oracle-gated `Integration/EmployeeListTablesTests` (following `EmployeeProfileTablesTests`). It creates shaped tables only in a schema that has none, and checks the scope (other branch, relieved, other company), the filters, the order and the paging. Verify that it is skipped in `dotnet test` without `IERP_TEST_ORACLE`, and never point it at the dev database.
- [x] 2.5 Read-only check against the dev database through the running API, with credentials handled only in a temporary file that is deleted right after:
  - the list total equals a read-only `SELECT COUNT(*)` for the user's company, branch and relieved 'N';
  - a filter narrows it;
  - one listed employee's profile is 200;
  - a relieved employee's id is 404.

## 3. Frontend

- [x] 3.1 The list feature (D4): model, service, table sort, selection, page, routes and the code link. Verify with specs following the Company List specs:
  - the service builds the query parameters;
  - the page shows the layout, the seven columns in order with "—" and `dd-MM-yyyy`, Search-only filtering, sorting, selection, the pager, Wrap text, the remembered state, and the loading, empty and error states;
  - the code link navigates to `/admin/employees/{id}` without changing the selection;
  - the look guard passes.
- [x] 3.2 The Profile page for a listed employee (D5): the route id, `load(id)` and the photo URL, the back button, and the "Employee not found." 404 state. Verify with specs:
  - with an id it requests `admin/employees/{id}` and its photo;
  - a 404 shows "Employee not found." without a notification;
  - without an id it requests `admin/profile` as before (the existing specs stay green).
- [x] 3.3 Add the Employee List entry to `NAV_ITEMS` (`lucideUsers`, tone amber). Verify that the nav-items, app-nav, Dashboard and clickable-cursor specs pass with the new entry. Then run `npm test -- --no-watch` and `npm run build`.

## 4. Final check

- [x] 4.1 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-list --strict`. In the browser (dev DB, read-only):
  - open Employee List from the menu;
  - search by name and code;
  - page and sort;
  - click a code to open the profile, with the photo or initials and all boxes;
  - go back and find the list as it was left;
  - switch the branch and see the list follow;
  - check the dark theme and phone width.

  Per `CLAUDE.md`, do not update `kb/`. Report the out-of-date notes so the user can decide: the BRS status and its copy errors, `kb/architecture/*`, and `kb/modules/admin/employee-profile.md`.
