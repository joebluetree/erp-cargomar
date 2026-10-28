# Tasks

## 1. Backend: scope and status filter

- [x] 1.1 Remove the relieved condition from `EmployeeScope.Apply`, keeping company and branch only (D1), and update its doc comment and those of `EmployeesController`, `EmployeeListService` and `IEmployeeProfileService`. Verify that the following pass with `dotnet test`:
  - `EmployeeProfileServiceTests`;
  - `EmployeeProfileEndpointTests` and `EmployeePhotoEndpointTests`, with the relieved case changed from 404 to 200;
  - the 404 cases for another branch, another company and an unknown id, unchanged.
- [x] 1.2 Add `EmployeeStatus` (`active`/`relieved`/`all` with a normaliser, D2), add `Status` to `EmployeeListQuery`, and validate it in `EmployeeListQueryValidator`. Verify with `EmployeeListQueryValidatorTests`:
  - blank, missing and mixed-case values are accepted;
  - `left` gives an error on `Status`.
- [x] 1.3 Apply the status in `EmployeeListRepository.Employees` after the scope (D1). Verify with `EmployeeListQueryTests` (`ToQueryString()`):
  - `active` has `EMP_IS_RELIEVED = N'N'`;
  - `relieved` has `= N'Y'`;
  - `all` has no `EMP_IS_RELIEVED`;
  - none has `TRUE`/`FALSE`;
  - the order is still name, then id.
- [x] 1.4 Extend `EmployeeListEndpointTests` and `EmployeeListServiceTests`, and verify:
  - no `status` returns the current employees only;
  - `status=relieved`, `status=all` and `status=RELIEVED` return the right rows and totals;
  - `status=relieved&name=…` combines the filters;
  - `status=left` gives 400 problem details naming `Status`.
- [x] 1.5 Extend the Oracle-gated `Integration/EmployeeListTablesTests`. On the shaped tables, check each status, and that a relieved employee's profile answers 200. On the real tables (read only, never pointed at the dev DB for writes), check that each status's total equals a `SELECT COUNT(*)` for the branch. Verify that the test is skipped in `dotnet test` without `IERP_TEST_ORACLE`.

## 2. Frontend: Status dropdown

- [x] 2.1 Add `EmployeeStatus`, `STATUS_OPTIONS`, `DEFAULT_STATUS` and `status` on `EmployeeListQuery` and `EmployeeListState` (`statusInput`, `applied.status`) in `employee-list.model.ts`, and send `status` in `EmployeeListService.load` (D3). Verify that `employee-list.service.spec.ts` checks the `status` parameter for each value.
- [x] 2.2 Add the Status LOV field (`hlm-select`, label `for="filter-status"`, `w-48`) after Name in `employee-list.page.html`, and in `employee-list.page.ts`:
  - wire the form control, seeded from the saved state;
  - copy it into `applied.status` on Search;
  - include it in `saveState()` and in `hasFilters`.

  Verify with `employee-list.page.spec.ts`:
  - the default is Active, and the first request carries `status=active`;
  - choosing Relieved alone sends nothing, and Search sends page 1 with `status=relieved`;
  - paging keeps the searched status, not one chosen since;
  - the status is kept after leaving and returning;
  - Relieved with no rows shows "No employees match the filters.";
  - the order is Code, Name, Status, then Search.
- [x] 2.3 Run `npm test -- --no-watch` and `npx ng build` in `frontend/`, and verify that both succeed with no new warnings.

## 3. Integration and specs

- [x] 3.1 Update the `## Purpose` of `openspec/specs/employee-list-api/spec.md` and `openspec/specs/employee-list-page/spec.md`, which still say "not relieved" and "current employees", to describe the status filter. Verify with `openspec validate admin-emp-status --strict`.
- [ ] 3.2 Check the running app by hand:
  - the Employee List opens with Active;
  - Relieved and All with Search list the right employees;
  - a relieved employee's profile opens view only, with the photo or initials;
  - the dropdown works with the keyboard, in light and dark themes.
- [x] 3.3 Leave `kb/modules/admin/employee-list.md` unchanged (its v1.1 stays `[Status: Proposed]`), and tell the user that marking it implemented was skipped.
