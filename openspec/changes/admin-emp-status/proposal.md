# Proposal

## Why

The Employee List shows only current employees (`EMP_IS_RELIEVED` = 'N'), so users cannot look up an employee who has left. The Employee List BRS v1.1 (BR-003, `kb/modules/admin/employee-list.md`) adds a status filter: Active, Relieved or All, with Active as the default.

## What Changes

- **Status filter on the list endpoint.** `GET /api/admin/employees` takes an optional `status` of `active` (the default), `relieved` or `all`:
  - `active` lists `EMP_IS_RELIEVED` = 'N';
  - `relieved` lists `EMP_IS_RELIEVED` = 'Y';
  - `all` does not check the column.

  Any other value is rejected with 400 naming the field. Without the parameter the list is the same as today.
- **Relieved employees open.** The scope of the profile and photo endpoints (`GET /api/admin/employees/{id}` and `{id}/photo`) becomes the session's company and branch, whatever the relieved status, so every employee the list can show also opens. Decided by the user. **BREAKING** for the profile endpoint only: a relieved employee of the session's branch now answers 200 instead of 404.
- **Status dropdown on the screen.** The Employee List filter row gains a Status dropdown with Active, Relieved and All, after Name and before Search, defaulting to Active.
  - Like the other filters, it applies only when Search is pressed.
  - It is kept with the rest of the list state.
  - A status other than Active counts as a searched filter for the "no match" message.
- **No new columns.** The BRS keeps the same columns.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-list-api`:
  - the scope no longer excludes relieved employees;
  - the list endpoint gains the `status` filter (default `active`);
  - a relieved employee's profile and photo open.
- `employee-list-page`:
  - the screen's filter row gains the Status dropdown;
  - the Search, state and empty-message rules cover it.

## Impact

- **Backend (`iErp.Admin`):**
  - `EmployeeScope` drops the relieved condition;
  - `EmployeeListQuery` and its validator gain `Status`;
  - `EmployeeListRepository` filters on it.

  The profile and photo then follow the wider scope with no further change.
- **Backend tests:**
  - `EmployeeListQueryTests` (SQL per status, no `TRUE`/`FALSE`);
  - `EmployeeListQueryValidatorTests`;
  - `EmployeeListEndpointTests`;
  - `EmployeeProfileEndpointTests` and `EmployeePhotoEndpointTests` (relieved now 200);
  - the Oracle-gated `EmployeeListTablesTests`.
- **Frontend (`features/admin/employee-list`):**
  - the model (query, state), the service (sends `status`), and the page and template (the `hlm-select` LOV field);
  - their specs.
- **Data:** read-only use of `EMPM.EMP_IS_RELIEVED`, already mapped. No schema change and no migration.
- **Knowledge base:** none. `kb/modules/admin/employee-list.md` v1.1 is marked `[Status: Proposed]` and is left unchanged.
