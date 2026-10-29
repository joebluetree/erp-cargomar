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

## 4. Backend: branch filter for admins (BR-004)

- [x] 4.1 Add `IsAdminAsync(menuCode)` to `IMenuAccess` and implement it in `MenuAccess` from the rights row's `RIGHTS_ADMIN` (D4). Verify with `ToQueryString()` that the SQL holds no `TRUE`/`FALSE`, and with unit tests: 'Y' (any case, padded) is true; 'N', null, no row and no session are false.
- [x] 4.2 Add the company's branches query and `FindListedBranchAsync` to the employee repository (D6), and make `EmployeeScope` take an optional branch code (D5). Verify with `ToQueryString()`:
  - the branches are type 'B' under the company id, not deleted, ordered by name then id;
  - a scope without a branch code has `REC_COMPANY_CODE` and no `REC_BRANCH_CODE` condition;
  - neither has `TRUE`/`FALSE`.
- [x] 4.3 Add `Branch` to `EmployeeListQuery` (at most 40 characters in the validator) and resolve the list scope from it (D5), with 403 for a non-admin and 400 naming `Branch` for an unknown id. Make the profile and photo scope the company for an admin. Verify with `EmployeeListServiceTests`, `EmployeeProfileServiceTests` and `EmployeeListQueryValidatorTests`.
- [x] 4.4 Add `GET /api/admin/employees/branches` (D6). Extend `EmployeeListEndpointTests` and the profile and photo endpoint tests, and verify:
  - an admin's `branch=<id>`, `branch=all` and `branch=ALL` list the right rows and totals, never of another company;
  - no `branch` lists the session's branch for admins and non-admins;
  - a non-admin's `branch=all` gets 403, and `branch=<session branch id>` gets 200;
  - an admin's unknown or other company's branch id gets 400 naming `Branch`;
  - the options answer 200 by name for an admin, 403 for a non-admin and 401 without a token;
  - an admin's profile and photo of another branch's employee answer 200, and of another company's 404; a non-admin's of another branch 404.
- [x] 4.5 Extend the Oracle-gated `EmployeeListTablesTests`: on the real tables (read only, never pointed at the dev DB for writes), check that the branch options equal a `SELECT` of the company's branches, and that the `all` total equals a `SELECT COUNT(*)` for the company. Verify the test is skipped without `IERP_TEST_ORACLE`.

## 5. Frontend: Branch dropdown and reset at login

- [x] 5.1 Add the branch option type, `branchInput` and `applied.branch` (`null` = the session's branch) to `employee-list.model.ts`; add `branches()` and send `branch` when it is not `null` in `EmployeeListService` (D7). Verify in `employee-list.service.spec.ts` that `branch` is sent for an id and for `all`, and left out for `null`.
- [x] 5.2 Add the Branch LOV field (`hlm-select`, label `for="filter-branch"`, `w-48`) after Status in `employee-list.page.html`, shown only for the admin right, and in `employee-list.page.ts` load the options for admins, seed it from the saved state, copy it on Search, and include it in `saveState()` and `hasFilters` (D7). Verify with `employee-list.page.spec.ts`:
  - a non-admin has no Branch dropdown, no options request and no `branch` parameter;
  - an admin sees All first, then the branches, with the session's branch chosen;
  - choosing a branch alone sends nothing; Search sends page 1 with `branch`; paging keeps the searched branch;
  - the branch is kept after leaving and returning;
  - while on the session's branch, a branch switch follows the new branch; a searched All stays;
  - failed options still show the session's branch and the list;
  - the order is Emp. No, Name, Branch, Status, then Search.
- [x] 5.3 Clear `TableStateStore` on logout and on another user's login, keeping it on a branch or year switch. Verify with `table-state.spec.ts`, and in `employee-list.page.spec.ts` that a searched Relieved opens as Active after logging out and in.
- [x] 5.4 Run `npm test -- --no-watch` and `npx ng build` in `frontend/`, and verify that both succeed with no new warnings.

## 6. Integration for BR-004

- [x] 6.1 Update the `## Purpose` of `openspec/specs/employee-list-api/spec.md` and `openspec/specs/employee-list-page/spec.md` for the branch filter. Verify with `openspec validate admin-emp-status --strict`.
- [ ] 6.2 Check the running app by hand, with `RIGHTS_ADMIN` = 'Y' set on `NS-EMPLIST` for a test user's rights row in the branch they log in to, the user being assigned (`USERD`) two other branches (a data change made by the user or an administrator, not by this change):
  - logged in to a branch with `RIGHTS_ADMIN` 'N', the user sees the Branch dropdown disabled on that branch;
  - the admin sees the session's branch by default, and the options All, then their assigned branches by name;
  - All or another assigned branch with Search lists the right employees, and never a branch not assigned to them;
  - the admin opens an allowed branch's employee's profile;
  - after logging out and in, Status is Active and Branch is the session's branch.
- [x] 6.3 Leave `kb/modules/admin/employee-list.md` unchanged (its v1.1 stays `[Status: Proposed]`, and its `REC_BRANCH_ID` stays as written), and tell the user that those updates were skipped.

## 7. Revision: branches by the admin right in each branch

Supersedes the whole-company parts of sections 4 and 5 (design D4–D7 revised).

- [x] 7.1 Replace `IMenuAccess.IsAdminAsync` with `AdminBranchIdsAsync(menuCode)` and add its `IMenuRepository` query (D4). Verify with `ToQueryString()` that the SQL holds `"RIGHTS_ADMIN"`, the user and the company's new-software menu code, no `RIGHTS_BRANCH_ID` condition, and no `TRUE`/`FALSE`, JSON or `FETCH`; and with `MenuAccessTests` that only 'Y' rows (any case, padded) count and that there is nothing without a session.
- [x] 7.2 Make `EmployeeScope` take a list of branch codes (`IN`), and build the list and profile scopes from the allowed branches (D5): `all` = every allowed branch, an allowed id = that branch, anything else 403 for everyone (no 400), the profile scope = every allowed branch. Verify with `EmployeeListQueryTests` (an `IN` of constants, no JSON) and `EmployeeScopeResolverTests`/`EmployeeListServiceTests`, including an admin branch of another company or a deleted one left out.
- [x] 7.3 Make `GET /api/admin/employees/branches` return the allowed branches by name, and `[]` for a non-admin (D6). Verify with `EmployeeListEndpointTests`:
  - an admin of b-2 logged in to b-1 lists b-1 and b-2 with `branch=all`, b-2 with `branch=b-2`, and gets 403 for b-3, an unknown id and another company's branch;
  - a non-admin gets 403 for any branch, and `[]` for the options;
  - the admin's profile and photo of a b-2 employee answer 200, and of a b-3 employee 404.
- [x] 7.4 Update the Oracle-gated `EmployeeListTablesTests`: on the shaped tables, admin rows in two branches (one deleted, one of another company) give the expected allowed branches and `all` list; on the real tables (read only), the allowed branches equal a plain `SELECT` of the user's `RIGHTS_ADMIN` = 'Y' rows joined to the company's branches. Verify it is skipped without `IERP_TEST_ORACLE`.
- [x] 7.5 Frontend (D7): request the options on every opening, show the dropdown only when they are not empty, and drop the use of `MenuRightsStore.admin`. Verify with `employee-list.page.spec.ts`: an empty answer, a pending request and a failed one show no dropdown and still list; a non-empty answer shows All then the branches, with the session's branch chosen; the other branch-filter tests still pass.
- [x] 7.6 Run `dotnet test -c Release` in `backend/`, and `npm test -- --no-watch` and `npx ng build` in `frontend/`, and verify all succeed with no new warnings.
- [x] 7.7 Update the `## Purpose` of `openspec/specs/employee-list-api/spec.md` and `employee-list-page/spec.md` for the allowed branches. Verify with `openspec validate admin-emp-status --strict`.

## 8. Revision: the admin right in the session branch, the branches with the view right

Supersedes the admin-branch parts of section 7 (design D4 revised, D5–D7 adjusted).

- [x] 8.1 Replace `IMenuAccess.AdminBranchIdsAsync` with `BranchAccessAsync(menuCode)` returning `MenuBranchAccess(IsAdmin, ViewBranchIds)`, built in `MenuAccess` from `ListRightsInEveryBranchAsync` (D4). Verify with `MenuAccessTests`: the admin flag counts only on the session branch's row ('Y' in any case, padded); the view branches are the rows with view 'Y'; nothing without a session.
- [x] 8.2 Make the resolver's allowed branches: for an admin, the session's branch plus the company's branches with the view right; for a non-admin, none to choose (D4, D5). Verify with `EmployeeScopeResolverTests`: admin in Kochi with view in Chennai and Delhi (all = Kochi, Chennai, Delhi; Mumbai 403); the same user in Chennai with admin 'N' (403 for any other branch, profile scope Chennai only); view 'N', a deleted branch and another company's branch left out.
- [x] 8.3 Update `EmployeeListEndpointTests` for the list, options, profile and photo with the new rule (admin flag in the session branch, view-right branches), and verify a user with admin rights only outside the session branch gets `[]` and 403.
- [x] 8.4 Keep the Oracle-gated checks: `MenuTablesTests` reads the rows in every branch with their view and admin flags against a plain `SELECT`. Verify they are skipped without `IERP_TEST_ORACLE`.
- [x] 8.5 Frontend: no change in behaviour (the options decide, D7); verify the branch-filter tests in `employee-list.page.spec.ts` still describe the new rule, and adjust their names and data.
- [x] 8.6 Run `dotnet test -c Release` in `backend/`, and `npm test -- --no-watch` and `npx ng build` in `frontend/`, and verify all succeed with no new warnings.
- [x] 8.7 Update the `## Purpose` of `openspec/specs/employee-list-api/spec.md` and `employee-list-page/spec.md` for the new rule. Verify with `openspec validate admin-emp-status --strict`.

## 9. Revision: the assigned branches for an admin, a disabled filter otherwise

Supersedes the view-right parts of section 8 (design D4 revised, D5–D7 adjusted).

- [x] 9.1 Replace `IMenuAccess.BranchAccessAsync` with `IsAdminAsync(menuCode)` (the session branch's row, from `ListRightsAsync`), and remove `ListRightsInEveryBranchAsync` and its query (D4). Verify with `MenuAccessTests`: 'Y' in any case, padded, counts; 'N', null and no row do not; nothing without a session.
- [x] 9.2 Read the assigned branches with Change Branch's `IChangeBranchRepository.ListBranchesAsync(userId, companyId)` (the user's `USERD` branches of the company, type 'B', not deleted, by name then id), and remove the employee repository's `ListBranchesAsync(companyId, ids)` (D6). Its SQL is already checked by `ChangeBranchQueryTests` and `ChangeBranchTablesTests`.
- [x] 9.3 Make the resolver's allowed branches: for an admin, the assigned branches plus the session's; for a non-admin, none to choose (D4, D5). Verify with `EmployeeScopeResolverTests` and `EmployeeListEndpointTests`: admin in Kochi assigned Chennai and Delhi (all = Kochi, Chennai, Delhi; Mumbai 403; Chennai's profile 200, Mumbai's 404); the same user in Chennai with admin 'N' (`[]`, 403 for any other branch, profile scope Chennai only).
- [x] 9.4 Update the Oracle-gated checks: `EmployeeListTablesTests` reads the assigned branches against a plain `SELECT` of `USERD` joined to `COMPANYM` (real tables, read only), and on shaped tables leaves out a deleted and another company's branch; remove the all-branch rights check from `MenuTablesTests`. Verify they are skipped without `IERP_TEST_ORACLE`.
- [x] 9.5 Frontend (D7): always show the Branch dropdown, enabled only when the options are not empty, otherwise disabled on the session's branch. Verify with `employee-list.page.spec.ts`: a non-admin, a pending and a failed request show it disabled on the session's branch and still list; an admin's options enable it with All then the branches; the label, the order and the other branch-filter tests still pass.
- [x] 9.6 Run `dotnet test -c Release` in `backend/`, and `npm test -- --no-watch` and `npx ng build` in `frontend/`, and verify all succeed with no new warnings.
- [x] 9.7 Update the `## Purpose` of `openspec/specs/employee-list-api/spec.md` and `employee-list-page/spec.md` for the assigned branches. Verify with `openspec validate admin-emp-status --strict`.
