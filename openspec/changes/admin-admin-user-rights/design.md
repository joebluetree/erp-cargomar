# Design

## Context

All rights decisions are made in `iErp.Admin/UserRights`:
- `UserMenuService.GetMenuAsync` builds the menu from `MenuRepository.ListVisibleMenusAsync`, which lists the new-software menus that have a view-right row, then groups them under `MODULEM`.
- `UserMenuService.GetRightsAsync` reads the rights rows by code with `ListRightsAsync`.
- `MenuAccess` (the `IMenuAccess` behind `[RequiresMenu]`) answers `CanViewAsync` with `HasViewRightAsync`, and `IsAdminAsync` from the row's admin flag. `EmployeeScopeResolver` uses `IsAdminAsync` to widen the Employee List to the user's assigned branches.

The session (`ICurrentSession`) already carries `UserCode`. This is the claim `ierp:user_code`, which `SessionTokenIssuer` fills with the stored `USERM.USER_CODE` after a normal login, an automatic login and a branch change. The frontend reads only the two menu endpoints, so it follows whatever they answer. Motivation: see proposal.md (Why). Requirements: see `specs/user-menu-api/spec.md`.

## Goals / Non-Goals

**Goals:**
- One place decides "is the admin user", so the menu, the rights endpoint and the screen check cannot disagree.
- For the admin user, no `USERRIGHTS` query at all: not for rights, the view check or the admin check.
- Other users' behaviour, and their SQL, stay exactly as they are.

**Non-Goals:**
- No new admin concept in the database, such as a role table, a `USERM` flag or seeded rights rows.
- No change to login, the token's claims or Change Branch.
- No frontend change. In particular, no client-side admin check: the frontend keeps trusting the endpoints.
- No admin rights on menus outside the session company's new-software menus, so the old software's menus stay hidden.

## Decisions

### D1. The admin user is decided from the session's user code, in one helper

A small static helper in `iErp.Admin/UserRights` (for example `AdminUser.Is(ICurrentSession)`, with the constant `AdminUser.Code = "ADMIN"`) returns true when `current.UserCode?.Trim()` equals `ADMIN`, ignoring case. `UserMenuService` and `MenuAccess` both call it.

- *Why the session's code:* it comes from the signed token and is the stored `USER_CODE`, so it cannot be changed by a request parameter. It also needs no extra query.
- *Alternatives:*
  - Re-reading `USERM` per request: an extra query for a value the token already holds.
  - Matching "contains admin", or the user name: rejected by the user. The exact code avoids handing every right to look-alike users such as `SUBADMIN`.
  - An extension method on `ICurrentSession` in `iErp.Shared`: rejected because the rule belongs to the Admin module's user rights, and only that module uses it.

### D2. Menu for the admin user: all of the company's new-software menus, same grouping

`IMenuRepository` gets `ListNewSoftwareMenusAsync(companyCode)`, which exposes the existing private `NewSoftwareMenus(companyCode)` query with no `USERRIGHTS` sub-query. `GetMenuAsync` calls it for the admin user and `ListVisibleMenusAsync` otherwise. Everything after that is unchanged and shared by both paths: the module lookup, the order and ties, and hiding empty modules.

- *Why:* "Visible" stays one rule for everyone else, and the admin path adds only one plainer query. It has the same company and `MENU_NEWSOFTWARE = 'Y'` filters, so it is still Oracle 10g-safe with no `TRUE`/`FALSE` and a plain `'Y'` comparison.
- *Alternative:* passing an `isAdmin` flag into `VisibleMenus`, which would make that query conditional. It is harder to test for the 10g SQL check and blurs the existing rule.

### D3. Rights for the admin user: all true, built in the service

`MenuCodeRightsDto` gets `All(code)` next to `None(code)`. For the admin user, `GetRightsAsync` returns `All(code)` for each trimmed code in the order given, and does not call the repository. The controller's 1-to-10 codes check runs before the service, so it applies to the admin user unchanged.

- *Why every code, not only codes that exist as menus:* BR-003.4 says "all rights as Y without checking DB". An unknown code gets all true, but that gives access to nothing. Screens open only through their own `[RequiresMenu]` codes, and the menu lists only real menus.
- *Alternative:* checking that each code is a company new-software menu first. That reads `MENUM` against the BRS's "no DB check", and it changes nothing the user can reach.

### D4. Screen and admin-right checks: `MenuAccess` short-circuits

In `MenuAccess`, both `CanViewAsync` and `IsAdminAsync` keep their session check, which needs a company, user, branch and non-blank code. They then return true for the admin user without calling the repository.

- *Why keep the session check:* a request without a full session context still gets "no access", as today. Only the rights lookup is skipped.
- *Effect:* `[RequiresMenu]` lets the admin user through on every screen. `EmployeeScopeResolver` sees the admin right, so the Employee List's Branch filter is enabled for the admin user. Which branches it offers is D6.

### D6. Branches for the admin user: every branch of the login company

`ChangeBranchRepository` gets a shared query for the company's branches: `CompanyBranches(companyId)`, the `COMPANYM` rows of type 'B' under the company that are not deleted. The existing `AllowedBranches(userId, companyId)` becomes its join with `USERD`, so both rules share one definition of "a branch of the company". `IChangeBranchRepository` exposes `ListCompanyBranchesAsync(companyId)`, sorted by name then id, and `FindCompanyBranchAsync(companyId, branchId)`.

The admin decision is made where the user is known:
- **Change Branch (`ChangeBranchService`):** the options and the switch use the company's branches when `AdminUser.IsCode(user.Code)` holds for the user it loads from `USERM`. Otherwise they use the allotted branches as today.
- **Automatic login (`LoginService.AutoLoginAsync`):** no session exists yet, so the login-details branch is checked the same way, by the stored `USER_CODE`. Its spec's "same rule as the branch switch" then holds without a spec change.
- **Employee List (`EmployeeScopeResolver.ListAllowedBranchesAsync`):** returns the company's branches when `AdminUser.Is(current)` holds. Otherwise it returns the assigned branches, as today. `ResolveListAsync` and `ResolveProfileAsync` already build on this list, so the options, `branch=<id>`, `all` and a listed employee's profile all follow.

`AdminUser` gets `IsCode(string?)`, which `Is(ICurrentSession)` uses, so the session and the stored code share one comparison.

- *Why the stored code in Change Branch and automatic login:* both already load the user from `USERM`, and the automatic login has no session yet. The session's code equals the stored one, because the token is issued from it.
- *Alternatives:*
  - An `isAdmin` flag on `AllowedBranches`: it would make the 10g-checked query conditional, and pass a rights decision into data access.
  - Seeding `USERD` rows for `ADMIN`: rejected, as the system never writes these tables.

### D7. Years for the admin user: every year of the login company

`ChangeBranchRepository` gets `CompanyYears(companyCode)`: every `YEARM` row of the company, open or closed, in today's order (newest start date first, a year without a start date last). The existing `Years(companyCode)` becomes `CompanyYears(companyCode)` with `YEAR_CLOSED = 'N'`, so both lists sort the same way. `IChangeBranchRepository` exposes `ListCompanyYearsAsync(companyCode)` and `FindCompanyYearAsync(companyCode, yearId)`.

As in D6, the admin decision is `AdminUser.IsCode(user.Code)`:
- **Change Branch:** the Year options and the switch's year check use the company's years for the admin user. Otherwise they use the open years.
- **Automatic login:** a login-details year is checked against the company's years for the admin user. An empty year still falls back to the latest year.
- **Normal login:** unchanged. `LoginRepository.FindLatestYearAsync` already opens the company's latest year by start date, closed or not, for every user. As requested, the admin user gets no different default.

The Change Branch dialog needs no change: it preselects the session's year when the list holds it. So the admin user's closed current year is now preselected, and other users still see Year empty.

- *Alternative:* an `includeClosed` flag on `Years`. Rejected for the same reason as in D6: it keeps the 10g-checked queries unconditional and the rights decision out of data access.

### D5. Tests

- **Unit (`UserMenuServiceTests`, `MenuAccessTests`):** for the session code `ADMIN`, `admin` and ` Admin `, the admin paths answer and the repository's rights methods are never called. `SUBADMIN` and `ADMIN1` take the normal path.
- **SQL (`MenuQueryTests`):** the new menu query has no `TRUE`/`FALSE` and compares `MENU_NEWSOFTWARE` with `'Y'`.
- **Endpoint (`MenuEndpointTests`, `MenuAccessEndpointTests`):** a token with user code `ADMIN` gets all rights from `/api/admin/menu/rights`, and passes a `[RequiresMenu]` endpoint. `TestTokens` gets a way to set the user code.
- **Branches (D6):**
  - `ChangeBranchQueryTests`: the company-branches query has no `TRUE`/`FALSE` and no `USERD`.
  - `ChangeBranchServiceTests`: an `ADMIN` user is offered and may switch to every company branch, and is refused another company's branch.
  - `AutoLoginServiceTests`: the automatic login of an `ADMIN` user accepts a company branch that isn't allotted.
  - `EmployeeScopeResolverTests`: the admin user's allowed branches are the company's branches. This replaces task 4.3's "assigned branches" expectation.
- **Years (D7):**
  - `ChangeBranchQueryTests`: the company-years query has no `TRUE`/`FALSE`, keeps the order, and has no `YEAR_CLOSED` filter. The open-years query still filters `YEAR_CLOSED = 'N'`.
  - `ChangeBranchServiceTests`: an `ADMIN` user is offered every company year and may switch to a closed one, and is refused another company's year.
  - `AutoLoginServiceTests`: an `ADMIN` row naming a closed year of the company logs in to it.

## Risks / Trade-offs

- [Anyone who knows the `ADMIN` password gets every right in every branch] → Intended, as in the existing software. The code is taken only from the signed token, and the password check is unchanged.
- [Each company's `ADMIN` user is an admin of that company only] → Menus are always scoped to the session company, so an `ADMIN` of one company never sees another company's menus.
- [An admin's `USERRIGHTS` rows, such as view 'N', are ignored] → Stated in the spec ("Admin user's rows ignored"). Rights for `ADMIN` can no longer be restricted through `USERRIGHTS`.
- [The admin user works in every branch of the company, allotted or not: the Employee List, Change Branch and automatic login] → Intended (D6). Other users' allotted-branch rules are unchanged, and another company's or a deleted branch is still refused.
- [The admin user may work in a closed financial year] → Intended (D7). The system only reads data, so a closed year is browsed, not changed. Later screens that write data must check the year's closed flag themselves, whatever the user.
- [A company with many branches gives the admin user a long Branch list in the Change Branch dialog and the Employee List] → Sorted by name, as today. No paging is needed at the current branch counts.

## Migration Plan

Backend-only and stateless: deploy the API. Tokens issued before the deploy already carry the user code, so the admin user gets full rights on their next request with no new login. To roll back, redeploy the previous API.
