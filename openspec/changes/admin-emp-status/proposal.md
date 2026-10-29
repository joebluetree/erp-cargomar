# Proposal

## Why

The Employee List shows only current employees (`EMP_IS_RELIEVED` = 'N'), so users cannot look up an employee who has left. The Employee List BRS v1.1 (BR-003, `kb/modules/admin/employee-list.md`) adds a status filter: Active, Relieved or All, with Active as the default.

BR-004 of the same version adds a Branch filter for users with the admin right on the Employee List in the branch they are logged into: they can list the employees of each branch assigned to them, or of all of those branches. Everyone else sees the Branch filter disabled on the session's branch.

## What Changes

- **Status filter on the list endpoint.** `GET /api/admin/employees` takes an optional `status` of `active` (the default), `relieved` or `all`:
  - `active` lists `EMP_IS_RELIEVED` = 'N';
  - `relieved` lists `EMP_IS_RELIEVED` = 'Y';
  - `all` does not check the column.

  Any other value is rejected with 400 naming the field. Without the parameter the list is the same as today.
- **Relieved employees open.** The scope of the profile and photo endpoints (`GET /api/admin/employees/{id}` and `{id}/photo`) becomes the session's company and branch, whatever the relieved status, so every employee the list can show also opens. Decided by the user. **BREAKING** for the profile endpoint only: a relieved employee of the session's branch now answers 200 instead of 404.
- **Status dropdown on the screen.** The Employee List filter row gains a Status dropdown with All, Active and Relieved, in that order, defaulting to Active.
  - Like the other filters, it applies only when Search is pressed.
  - It is kept with the rest of the list state.
  - A status other than Active counts as a searched filter for the "no match" message.
- **Branch filter for admins.** A user is an admin of the list when their `USERRIGHTS` row for the Employee List (`NS-EMPLIST`) in the session branch has `RIGHTS_ADMIN` = 'Y'. An admin's allowed branches are the session's branch plus the branches of the session company assigned to them (`USERD`), with no rights check there; a non-admin's are the session's branch alone (decided by the user):
  - `GET /api/admin/employees` takes an optional `branch`: the id of an allowed branch, or `all` for every allowed branch. Without it the list is the session's branch, as today. Any other value, including any branch for a non-admin, gets 403.
  - A new `GET /api/admin/employees/branches` returns the allowed branches for the dropdown, and an empty list for a non-admin.
  - For an admin, the profile and photo of an employee of any allowed branch open (decided by the user), so every row an admin can list opens, and no other.
  - The screen shows a Branch dropdown after Status: for an admin, All, then the allowed branches by name, defaulting to the session's branch (decided by the user); for anyone else, disabled on the session's branch. It applies on Search like the other filters.
- **Filters reset at login.** The list state, Status and Branch included, is cleared on logout and when another user logs in, so each login opens the list with Active and the session's branch.
- **Branch column.** The table gains a Branch column at the end: the name of each employee's branch (the code when the company has no branch with it), so a list of several branches shows where each employee belongs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-list-api`:
  - the scope no longer excludes relieved employees;
  - the list endpoint gains the `status` filter (default `active`);
  - a relieved employee's profile and photo open;
  - admins (admin flag in the session branch) choose one of their assigned branches, or all of them, with `branch`, and get those branches from a new endpoint;
  - an admin's profile and photo scope is their allowed branches.
- `employee-list-page`:
  - the screen's filter row gains the Status dropdown, and the Branch dropdown for admins;
  - the Search, state and empty-message rules cover both;
  - both reset at each login.

## Impact

- **Backend (`iErp.Admin`):**
  - `EmployeeScope` drops the relieved condition;
  - `EmployeeListQuery` and its validator gain `Status`;
  - `EmployeeListRepository` filters on it.

  The profile and photo then follow the wider scope with no further change.
- **Backend for BR-004:**
  - `IMenuAccess` gains `IsAdminAsync` (the admin flag in the session branch), implemented in `MenuAccess` with the existing rights query; the employee repository reads the user's assigned branches (`USERD`);
  - `EmployeeScope` takes a list of branch codes, and the resolver builds it from the session, the allowed branches and `branch`;
  - `EmployeeListQuery` and its validator gain `Branch`;
  - `EmployeesController` gains the `branches` action.
- **Backend tests:**
  - `EmployeeListQueryTests` (SQL per status, no `TRUE`/`FALSE`);
  - `EmployeeListQueryValidatorTests`;
  - `EmployeeListEndpointTests`;
  - `EmployeeProfileEndpointTests` and `EmployeePhotoEndpointTests` (relieved now 200);
  - the Oracle-gated `EmployeeListTablesTests`.
- **Frontend (`features/admin/employee-list`):**
  - the model (query, state), the service (sends `status`), and the page and template (the `hlm-select` LOV field);
  - the Branch dropdown, always shown, enabled when the branch options are not empty;
  - `TableStateStore` clears on logout and on another user's login;
  - their specs.
- **Data:** read-only use of `EMPM.EMP_IS_RELIEVED` and `EMPM.REC_BRANCH_CODE`, already mapped, and of `COMPANYM`, `USERD` and `USERRIGHTS.RIGHTS_ADMIN`. No schema change and no migration. In the dev data no user has `RIGHTS_ADMIN` = 'Y' on `NS-EMPLIST` yet, so the Branch filter shows for nobody until that flag is set.
- **Knowledge base:** none. `kb/modules/admin/employee-list.md` v1.1 is marked `[Status: Proposed]` and is left unchanged. Its Data Model lists `REC_BRANCH_ID` (v1.2) for the branch filter, but `EMPM` has no such column; the filter uses `REC_BRANCH_CODE`, which the scope already uses.
