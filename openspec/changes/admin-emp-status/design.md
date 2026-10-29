# Design

## Context

See proposal.md for the motivation, and the delta specs for the behaviour. The current state (from `admin-emp-list`):

- **One scope for everything.** `EmployeeScope.Apply` (`iErp.Admin/EmployeeProfile/EmployeeScope.cs`) filters company code, branch code and `Relieved == "N"`. It is used by:
  - `EmployeeListRepository.Employees` (the list);
  - `EmployeeProfileRepository.FindInScopeAsync` (the profile and photo of a listed employee).
- **Data.** `Employee.Relieved` already maps `EMP_IS_RELIEVED` (`CHAR(1)`, fixed length). In the dev data it is always 'Y' (262 rows) or 'N' (270).
- **Query.** `EmployeeListQuery` (`Code`, `Name`, `Page`, `PageSize`) is checked by `EmployeeListQueryValidator` (FluentValidation, 400 naming the field).
- **Frontend.** `EmployeeListPage` keeps what is typed apart from what was last searched (`applied`) and saves `EmployeeListState` in `TableStateStore`. Dropdowns in forms are the Spartan `hlm-select` LOV field (`kb/architecture/frontend.md`, "Dialogs and LOV fields"), as in the Change Branch dialog.
- **Rights.** `[RequiresMenu]` checks the view right through `IMenuAccess` (`iErp.Shared`), implemented by `MenuAccess` over `IMenuRepository`. `USERRIGHTS` holds one row per user, menu and branch (`RIGHTS_BRANCH_ID`); `RIGHTS_ADMIN` is mapped (`UserRight.Admin`). `GET /api/admin/menu/rights` and the frontend's `MenuRightsStore` give the rights in the session branch only, so they cannot tell whether the user is an admin of the list in another branch.
- **Assigned branches.** `USERD` holds the branches assigned to a user (`USER_ID`, `USER_BRANCH_ID`). `ChangeBranchRepository.AllowedBranches` already reads them for the Change Branch dialog: the user's `USERD` rows joined to the company's `COMPANYM` branches (type 'B', not deleted).
- **Branches.** A company's branches are the `COMPANYM` rows with `COMP_TYPE` 'B', `COMP_PARENT_ID` = the company's id and no `REC_DELETED_DATE` (as in `BranchListRepository.Listed`, `iErp.Reports`). `EMPM` holds a branch's code (`REC_BRANCH_CODE` = `COMP_CODE`); it has no branch id column.
- **List state.** `TableStateStore` is cleared on logout and when another user logs in (on this branch, `sourav/default-status`); a branch or year switch keeps it.
- **Oracle 10.2.** No `TRUE`/`FALSE` literals. Queries are checked with `ToQueryString()`.

## Goals / Non-Goals

**Goals:**
- One place decides the scope (company and branch) and one place decides the status, so the list and the profile cannot disagree.
- The default request (no `status`) behaves exactly as today.

**Non-Goals:**
- A status column or a relieved badge in the table.
- A status on the own Profile screen (`/admin/profile`), which is unchanged.
- A branch filter for non-admins, or across companies.
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
  - `STATUS_OPTIONS: readonly { value: EmployeeStatus; label: string }[]` = All, Active, Relieved (the user's order; Active stays the default);
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

### D4. "Admin of the list" is the admin right in the session branch; the branches are the user's assigned branches

- A user is an **admin of the list** when their rights row on the session company's new-software `NS-EMPLIST` menu **in the session branch** has `RIGHTS_ADMIN` = 'Y'. With 'N', or no row, they are not.
- An admin's **allowed branches** are the session's branch plus every branch **assigned to the user** (`USERD`) that is a branch of the session company (type 'B', not deleted): the branches the Change Branch dialog offers. The rights in those branches are not checked (the user's decision). A non-admin's allowed branches are the session's branch alone.
- `IMenuAccess` gains `Task<bool> IsAdminAsync(string menuCode, CancellationToken ct)`: the admin flag of the user's rights row in the session branch, read with the existing `IMenuRepository.ListRightsAsync` (no new SQL) and compared trimmed, in any letter case. It replaces `BranchAccessAsync`; the all-branch rights query (`ListRightsInEveryBranchAsync`) is no longer needed and is removed.
- The backend decides from the session on every request; the frontend only shows what the backend returns.
- **Alternatives rejected:** the branches with the view right (the third version of this design), the admin right in any branch with the branches holding it (the second), and every branch of the company (the first). The user asked for the assigned branches, without checking rights there.

### D5. The scope is a list of branch codes; the resolver builds it from the allowed branches

- `EmployeeScope(string CompanyCode, IReadOnlyList<string> BranchCodes)`: `Apply` filters the company code and `BranchCodes.Contains(e.BranchCode)`, which EF turns into `REC_BRANCH_CODE IN (...)` with constants, as `RightsByCode` already does on Oracle 10g (no JSON collection parameter).
- The resolver reads the allowed branches (D4) once per request and builds:
  - **List** (`ResolveListAsync(string? branch)`):
    - no `branch` (or blank), or the session's branch id: the session's branch;
    - `all`, in any letter case: every allowed branch;
    - the id of an allowed branch: that branch;
    - anything else, for everyone: refused with 403 "You do not have access to this branch.". An id that names no branch is refused the same way, so the answer does not tell which ids exist (the first version's 400 is dropped).
  - **Profile and photo** (`ResolveProfileAsync()`): every allowed branch (the user's decision), so every row the user can list opens, and nothing else. A profile URL never carries a branch.
- `EmployeeListQuery.Branch` stays a `string?` of at most 40 characters (validator).
- **Alternative rejected:** the whole company for All, or for an admin's profiles (the first version). It would show branches the user is not assigned to.

### D6. Branch options are the allowed branches, for every Employee List user

- `GET /api/admin/employees/branches`, `[RequiresMenu(NS-EMPLIST)]`, answers 200 with `[{ id, code, name }]`: the allowed branches (D4), ordered by name then id, when the user is an admin of the list (admin flag in the session branch), and `[]` otherwise. It is not paged.
- The page asks it on every opening, so one request tells it both whether to show the dropdown and what to offer; a 403 would turn the normal case of a non-admin into an error.
- The query is Change Branch's own (`IChangeBranchRepository.ListBranchesAsync(userId, companyId)`: the user's `USERD` branches of the company, by name then id), reused by the resolver rather than copied, so both screens always offer the same branches. The scopes always include the session's branch, and the page always offers it.
- **Alternative rejected:** the Branch List endpoint (`/api/reports/branches`). It needs the Branch List right, lists every branch, and `iErp.Admin` does not reference `iErp.Reports`.

### D7. Frontend: a Branch LOV for admins, defaulting to the session's branch

- **Visibility.** The dropdown is always shown. The page requests the options (D6) when it opens and after a branch switch, and enables the dropdown only when they are not empty. While they load, when they fail, and for a non-admin (empty options), it is disabled and shows the session's branch, and the list is that branch. The options alone decide, so the page and the backend never disagree.
- **Options.** `All` first, then the allowed branches by name (the session's branch among them), labelled by name.
- **State.** `EmployeeListState` gains `branchInput: string | null` and `applied.branch: string | null`, where `null` means "the session's branch". Choosing the session's branch stores `null`, so after a branch switch the default follows the new branch, while an explicit other branch or All stays. A saved state without them reads as `null`. The choice is kept apart from the dropdown, which can show a remembered branch only once the options have loaded.
- **Request.** `applied.branch` is sent as `branch` when it is not `null` (an id or `all`). Such a request waits for the options of the current session (on opening and after a branch switch): when the choice is no longer among them (for example All after a switch to a branch without the admin right), the searched and the chosen branch go back to the session's (`null`) and the request asks for no branch, so the backend never refuses it. A request for the session's branch is sent at once. A Search with the dropdown disabled sends no branch.
- **Page.** The field is `hlm-select` with `buttonId="filter-branch"` and `w-48`, after Status and before Search; it applies only on Search, and `hasFilters` is also true when `applied.branch` is not `null`.
- **Reset at login.** Clearing `TableStateStore` at logout and at another user's login (Context) resets Status to Active and Branch to the session's branch, with nothing added for them.

## Risks / Trade-offs

- **[Risk]** Widening the scope exposes relieved employees' profiles to anyone with the Profile right in that branch. → **Mitigation:** this is the user's decision, and the same users could already see them in the old system. The rights checks (`RequiresMenu`) are unchanged.
- **[Risk]** `EMP_IS_RELIEVED` is null or another value on some production row. → **Mitigation:** `all` still lists it, and `active` and `relieved` leave it out, so nothing breaks. The Oracle-gated table test counts the three statuses against `SELECT COUNT(*)` on the real tables (read only).
- **[Risk]** An admin sees and opens the employees of other branches without any right there. → **Mitigation:** the user's decision; only with `RIGHTS_ADMIN` = 'Y' in the session branch, and only of the branches assigned to the user (where they could log in anyway), checked on the server for the list, the options, the profile and the photo; any other branch answers 403 (list) or 404 (profile). The company never widens.
- **[Risk]** No user has the admin flag on `NS-EMPLIST` in the dev data, so the dropdown cannot be seen there. → **Mitigation:** the backend and frontend tests cover both cases; the manual check needs the flag set on a test user's rights row, a data change made outside this change.
- **[Decision]** A Branch column, last in the table, shows each employee's branch name (requested by the user). The service reads the names of the page's branch codes in one query (`COMPANYM` type 'B' under the session company, deleted or not, `COMP_CODE IN (...)` of constants), after the paged query, so the paging SQL is unchanged; an unknown code shows as itself.
- **[Trade-off]** Every opening of the list makes one more small request (the options), also for non-admins. Accepted: it is one indexed read of `USERRIGHTS` and `COMPANYM`.
- **[Trade-off]** With All, the table does not show who is relieved. Accepted, because the BRS adds no column, and the profile is one click away.

## Migration Plan

No data or schema change. Deploy the backend and frontend together. An older frontend sends no `status` or `branch` and still gets the active list of the session's branch. Rollback is a plain redeploy.
