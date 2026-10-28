# Design

## Context

See proposal.md for the motivation, and the delta specs for the behaviour. The current state (from `admin-emp-list`):

- **One scope for everything.** `EmployeeScope.Apply` (`iErp.Admin/EmployeeProfile/EmployeeScope.cs`) filters company code, branch code and `Relieved == "N"`. It is used by:
  - `EmployeeListRepository.Employees` (the list);
  - `EmployeeProfileRepository.FindInScopeAsync` (the profile and photo of a listed employee).
- **Data.** `Employee.Relieved` already maps `EMP_IS_RELIEVED` (`CHAR(1)`, fixed length). In the dev data it is always 'Y' (262 rows) or 'N' (270).
- **Query.** `EmployeeListQuery` (`Code`, `Name`, `Page`, `PageSize`) is checked by `EmployeeListQueryValidator` (FluentValidation, 400 naming the field).
- **Frontend.** `EmployeeListPage` keeps what is typed apart from what was last searched (`applied`) and saves `EmployeeListState` in `TableStateStore`. Dropdowns in forms are the Spartan `hlm-select` LOV field (`kb/architecture/frontend.md`, "Dialogs and LOV fields"), as in the Change Branch dialog.
- **Oracle 10.2.** No `TRUE`/`FALSE` literals. Queries are checked with `ToQueryString()`.

## Goals / Non-Goals

**Goals:**
- One place decides the scope (company and branch) and one place decides the status, so the list and the profile cannot disagree.
- The default request (no `status`) behaves exactly as today.

**Non-Goals:**
- A status column or a relieved badge in the table. The BRS keeps the columns.
- A status on the own Profile screen (`/admin/profile`), which is unchanged.
- Any write, or any change to `EMPM`.

## Decisions

### D1. The scope drops the relieved condition; the status is a list filter

- `EmployeeScope.Apply` keeps only `CompanyCode == … && BranchCode == …`. The `NotRelieved` constant moves to the status filter.
- The profile and photo use the scope as is, so a relieved employee of the branch opens (the user's decision) with no change in `EmployeeProfileService` or the repository.
- The status filter is applied only in `EmployeeListRepository.Employees`, after the scope and before the code and name filters:
  - `active`: `Relieved == "N"`;
  - `relieved`: `Relieved == "Y"`;
  - `all`: no condition.

  All are plain string comparisons, as today.
- **Alternative rejected:** a status argument on the scope. The profile would then need a status it does not have (the profile URL carries none), and a link from an "All" list would break.

### D2. `status` is a validated string, not an enum

- `EmployeeListQuery.Status` is a `string?`.
- A new `EmployeeStatus` static class holds `Active = "active"`, `Relieved = "relieved"`, `All = "all"` and a normaliser: trim, lower case, blank becomes `active`.
- `EmployeeListQueryValidator` rejects any other value with "Status must be active, relieved or all.", so the 400 names `Status` like the other fields.
- **Alternative rejected:** a C# enum bound by MVC. An unknown value would fail in model binding with a framework message rather than the validator's, and numbers ("1") would be accepted.

### D3. Frontend: a Status LOV in the filter row, searched with the others

- **Model.**
  - `EmployeeStatus = 'active' | 'relieved' | 'all'`;
  - `STATUS_OPTIONS: readonly { value: EmployeeStatus; label: string }[]` = Active, Relieved, All;
  - `DEFAULT_STATUS = 'active'`;
  - `EmployeeListQuery` gains `status`.
- **State.** `EmployeeListState` gains `statusInput` (the dropdown) and `applied.status`. A saved state without them reads as `active`.
- **Service.** It always sends `status` (the backend default is the same value, so the request is explicit and easy to test).
- **Page.**
  - A `FormControl<StatusOption>` holds the dropdown, seeded from the saved state. The template uses `hlm-select` per the LOV rules:
    - `buttonId="filter-status"`, with the label's `for` pointing to it;
    - `itemToString` gives the label, and `isItemEqualToValue` compares `value`;
    - the width matches the other filters (`w-48`).
  - `search()` copies the control's value into `applied.status`.
  - `hasFilters` is also true when `applied.status !== 'active'`.
  - Choosing an option requests nothing (LS-002.1).
- **Alternative rejected:** a native `<select>`. The architecture document keeps native only for the pager's page size, and asks for the Spartan select for dropdown fields.

## Risks / Trade-offs

- **[Risk]** Widening the scope exposes relieved employees' profiles to anyone with the Profile right in that branch. → **Mitigation:** this is the user's decision, and the same users could already see them in the old system. The rights checks (`RequiresMenu`) are unchanged.
- **[Risk]** `EMP_IS_RELIEVED` is null or another value on some production row. → **Mitigation:** `all` still lists it, and `active` and `relieved` leave it out, so nothing breaks. The Oracle-gated table test counts the three statuses against `SELECT COUNT(*)` on the real tables (read only).
- **[Trade-off]** With All, the table does not show who is relieved. Accepted, because the BRS adds no column, and the profile is one click away.

## Migration Plan

No data or schema change. Deploy the backend and frontend together. An older frontend sends no `status` and still gets the active list. Rollback is a plain redeploy.
