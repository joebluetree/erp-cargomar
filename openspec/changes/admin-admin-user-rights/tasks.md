# Tasks

## 1. Admin user check

- [x] 1.1 Add the `AdminUser` helper in `backend/iErp.Admin/UserRights` (constant `Code = "ADMIN"`, and `Is(ICurrentSession)` comparing `UserCode` trimmed and ignoring case), per design D1. Verify with new unit tests: `ADMIN`, `admin` and ` Admin ` are the admin user; `SUBADMIN`, `ADMIN1`, an empty and a null code are not.

## 2. Menu for the admin user

- [x] 2.1 Add `ListNewSoftwareMenusAsync(companyCode)` to `IMenuRepository` and `MenuRepository`, exposing the existing `NewSoftwareMenus` query (design D2). Verify with a `MenuQueryTests` case: its SQL has no `TRUE`/`FALSE`, compares `MENU_NEWSOFTWARE` with `'Y'`, and has no `USERRIGHTS` in it.
- [x] 2.2 In `UserMenuService.GetMenuAsync`, list the menus with `ListNewSoftwareMenusAsync` for the admin user and with `ListVisibleMenusAsync` otherwise, keeping the module grouping, order and empty-module rule shared. Verify with `UserMenuServiceTests` cases:
  - the admin user gets every new-software menu under its module, in order;
  - `ListVisibleMenusAsync` is never called for the admin user;
  - a `SUBADMIN` user still gets only the visible menus;
  - the existing tests still pass.

## 3. Rights for the admin user

- [x] 3.1 Add `MenuCodeRightsDto.All(code)`, and in `UserMenuService.GetRightsAsync` return `All` for each trimmed code in the order given for the admin user, without calling the repository (design D3). Verify with `UserMenuServiceTests` cases:
  - the admin user gets all nine rights true for `NS-EMPLIST` and `NS-EMPPROFILE`, in the order asked;
  - `ListRightsAsync` is never called;
  - a non-admin user keeps the row-based rights.
- [x] 3.2 Verify the endpoint with new `MenuEndpointTests` cases, adding a `userCode` parameter to `TestTokens.Create` (default `U01`). With an `ADMIN` token, `GET /api/admin/menu/rights?codes=NS-EMPLIST,NS-EMPPROFILE` returns both codes with every right true. No codes, or 11 codes, still answer 400.

## 4. Screen and admin-right checks

- [x] 4.1 In `MenuAccess`, return true from `CanViewAsync` and `IsAdminAsync` for the admin user once the session check passes, without calling the repository (design D4). Verify with `MenuAccessTests` cases:
  - the admin user can view and is admin on any code, and the repository is never called;
  - the admin user without a company, user or branch in the session, or with a blank code, still gets false;
  - a non-admin user keeps the row-based answers.
- [x] 4.2 Verify the screen check end to end in `MenuAccessEndpointTests`. With the real `MenuAccess` and no rights rows, an `ADMIN` token passes a `[RequiresMenu]` endpoint, while a `U01` token still gets 403 "You do not have access to this screen.".
- [x] 4.3 Verify the Employee List's admin right with an `EmployeeScopeResolver` test: with the admin user's `IMenuAccess`, `ListAllowedBranchesAsync` returns the user's assigned branches.

## 5. Integration check

- [x] 5.1 Run `dotnet test` in `backend` without `IERP_TEST_ORACLE` (the dev database is read-only) and the frontend `npx ng test --watch=false`. Verify that both pass with no frontend change.

## 6. Branches for the admin user

- [x] 6.1 Add `AdminUser.IsCode(string?)` and make `Is(ICurrentSession)` use it (design D6). Verify that `AdminUserTests` cover `IsCode` with the same admin and non-admin codes.
- [x] 6.2 In `ChangeBranchRepository`, add the `CompanyBranches(companyId)` query (type 'B', under the company, not deleted) and build `AllowedBranches` on it. Expose `ListCompanyBranchesAsync` (by name, then id) and `FindCompanyBranchAsync` on `IChangeBranchRepository`. Verify with a `ChangeBranchQueryTests` case: no `TRUE`/`FALSE`, no `USERD` in the company-branches SQL. The existing allotted-branches cases must still pass.
- [x] 6.3 In `ChangeBranchService`, use the company's branches for the options and the switch when `AdminUser.IsCode(user.Code)`. Verify with `ChangeBranchServiceTests` cases:
  - an `ADMIN` user is offered every company branch;
  - an `ADMIN` user may switch to a branch that isn't allotted;
  - an `ADMIN` user is refused a branch that isn't the company's ("This branch is not available to you.");
  - a `SUBADMIN` user keeps the allotted rule.
- [x] 6.4 In `LoginService.AutoLoginAsync`, check the login-details branch against the company's branches for an `ADMIN` user. Verify with `AutoLoginServiceTests` cases: an `ADMIN` row naming a company branch that isn't allotted logs in to it, and a non-admin's non-allotted branch still fails.
- [x] 6.5 In `EmployeeScopeResolver.ListAllowedBranchesAsync`, return the company's branches for the admin user (`AdminUser.Is(current)`). Verify by changing task 4.3's test to expect the company's branches (including one not assigned), and that `all` and a non-assigned company branch resolve, while another company's branch is refused. The existing non-admin and rights-admin cases still pass.
- [x] 6.6 Run `dotnet test` in `backend` without `IERP_TEST_ORACLE` and the frontend `npx ng test --watch=false`. Verify that both pass with no frontend change.

## 7. Years for the admin user

- [x] 7.1 In `ChangeBranchRepository`, add the `CompanyYears(companyCode)` query (every year of the company, open or closed, in today's order) and build `Years` on it. Expose `ListCompanyYearsAsync` and `FindCompanyYearAsync` on `IChangeBranchRepository` (design D7). Verify with a `ChangeBranchQueryTests` case: no `TRUE`/`FALSE`, no `YEAR_CLOSED` filter, same `ORDER BY`. The existing open-years case must still pass.
- [x] 7.2 In `ChangeBranchService`, use the company's years for the Year options and the switch when `AdminUser.IsCode(user.Code)`. Verify with `ChangeBranchServiceTests` cases:
  - an `ADMIN` user is offered every company year, closed included, in the repository order;
  - an `ADMIN` user may switch to a closed year;
  - an `ADMIN` user is refused another company's year ("This financial year is not available for your company.");
  - a `SUBADMIN` user is still refused a closed year.
- [x] 7.3 In `LoginService.AutoLoginAsync`, check a login-details year against the company's years for an `ADMIN` user. Leave the empty-year fallback and the normal login's latest year as they are. Verify with `AutoLoginServiceTests` cases:
  - an `ADMIN` row naming a closed year of the company logs in to it;
  - a non-admin's closed year still fails;
  - the existing normal login tests still pass unchanged.
- [x] 7.4 Run `dotnet test` in `backend` without `IERP_TEST_ORACLE` and the frontend `npx ng test --watch=false`. Verify that both pass with no frontend change.
