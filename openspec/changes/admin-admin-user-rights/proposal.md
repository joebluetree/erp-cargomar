# Proposal

## Why

Today every user, the admin user included, sees and opens only the menus they have rights rows on (`USERRIGHTS`) in the session branch. In the dev data no user has rights on the new-software menus yet, so the admin user sees only the Dashboard. The BRS `kb/modules/admin/user-rights.md` v1.1 (BR-003) asks that the admin user always has every right on every menu, without reading `USERRIGHTS`, as in the existing software.

## What Changes

- **Who the admin user is:** the logged-in user whose user code (`USERM.USER_CODE`, from the session token) is `ADMIN`, trimmed and in any case. This holds after a normal login and an automatic login, and in any branch and year the admin switches to.
- **Menu (`GET /api/admin/menu`):** for the admin user it lists every menu of the session company marked for the new software (`MENU_NEWSOFTWARE` = 'Y'), under its module, in module and menu order, without reading `USERRIGHTS` (BR-003.2, BR-003.3, BR-003.S1).
- **Rights (`GET /api/admin/menu/rights`):** for the admin user every right of every code asked for is true: view, add, edit, delete, print, email, docs, docs upload and admin. No database is read (BR-003.1, BR-003.4, BR-003.S2). The 1-to-10 codes check still applies.
- **Screen endpoints (`[RequiresMenu]`):** the view-right check lets the admin user through on every screen without reading `USERRIGHTS`.
- **Employee List admin right:** the admin user has the Employee List's admin right in every branch, so the Employee List's Branch filter is enabled for them.
- **Branches for the admin user:** wherever branches are listed or allowed per user, the admin user gets every not-deleted branch of the login company (`COMPANYM` rows of type 'B' under the company), not only the branches allotted to them (`USERD`):
  - **Employee List Branch filter:** the options and the allowed `branch` values; All means every branch of the company.
  - **Change Branch dialog:** the Branch list, and the backend check on the switch.
  - **Automatic login:** the login-details branch must pass the same rule as the branch switch, so the admin user may log in to any branch of the company.
  - The login's default branch is unchanged.
- **Years for the admin user:** the Change Branch Year list offers the admin user every financial year of the login company in the database, open or closed (`YEAR_CLOSED` 'N' or 'Y'), newest first:
  - the backend accepts a switch to any of them, but still refuses another company's year;
  - the automatic login's year follows the same rule;
  - the login still opens the company's latest year by start date, as it does today for every user.
- **Other users** keep today's rights-based behaviour, their allotted branches and the open years only, unchanged.
- **No frontend change:** the sidebar, Dashboard quick links, screen guard, in-screen links, Branch filter and Change Branch dialog already follow what the backend answers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-menu-api`: the user menu endpoint, the menu rights endpoint and the screen endpoints' view-right check get an exception for the admin user. A new requirement defines the admin user and their full rights.
- `user-branch-change`: "Branches and years offered" and "Backend checks the switch" offer and allow the admin user every branch and every year, open or closed, of the login company. "Mandatory branch and year" makes its closed-current-year case non-admin only. The automatic login follows through its "same rule as the branch switch".
- `employee-list-api`: a new requirement gives the admin user every branch of the login company as Branch filter options and allowed values. It is ADDED rather than MODIFIED because the Branch filter requirements are still in the unarchived `admin-emp-status` change.

## Impact

- **Backend:**
  - `iErp.Admin/UserRights` (`UserMenuService`, `MenuAccess`, `MenuRepository`, `AdminUser`). These get one shared check for the admin user's code, from `ICurrentSession.UserCode` or the stored `USERM.USER_CODE`, plus a query for all of the company's new-software menus.
  - `iErp.Admin/ChangeBranch` (repository and service): queries for all of the company's branches and all of its years.
  - `LoginService` (automatic login) uses the company's branches and years for the admin user; `EmployeeScopeResolver` uses its branches. The normal login is unchanged.
  - No new endpoint, table or migration. `USERM`, `USERD`, `COMPANYM`, `YEARM`, `MENUM`, `MODULEM` and `USERRIGHTS` stay read-only.
- **Tests:** the unit tests for `UserMenuService`, `MenuAccess`, `ChangeBranchService`, `LoginService` (automatic login) and `EmployeeScopeResolver`, and the menu endpoint tests, get admin user cases. The Oracle 10g SQL checks cover the new menu, branch and year queries.
- **Frontend:** none.
- **Security:** anyone who can log in as `ADMIN` gets every right on every new-software menu, and may work in every branch and every year, closed years included, of the company. This is intended, as in the existing software. The user code comes from the signed token, never from a request parameter.
- **Docs:** `kb/modules/admin/user-rights.md` already describes v1.1. Its Change History marks v1.1 as "Implemented" before the change is built. Per CLAUDE.md the kb is not edited here.
