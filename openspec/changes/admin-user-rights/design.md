# Design

## Context

See proposal.md for the motivation. The current state and the data (dev DB, read only):

- **The menu today:**
  - `NAV_ITEMS` (`core/navigation/nav-items.ts`) is a static list: label, icon, route and tone. The `NAV_MENU` token injects it into `AppNav` (sidebar and mobile sheet) and `Dashboard` (quick links).
  - Specs: `app-shell` "Navigation menu" ("SHALL NOT vary by permissions") and `app-dashboard` "Quick links".
- **`MENUM`** (647 rows, all four companies) has `MENU_PKID`, `REC_COMPANY_CODE`, `MENU_MODULE_ID`, `MENU_CODE`, `MENU_NAME`, `MENU_ROUTE1`/`2`, `MENU_TYPE`, `MENU_DISPLAYED`, `MENU_ORDER` (number), `MENU_GROUP_ID` and `MENU_NEWSOFTWARE` (`CHAR(1)`).
  - Five menus are 'Y' for the new software, all CPL and all in module "Hr": `NS-COMPLIST` (`reports/companies`, order 200), `NS-BRANCHLIST` (201), `NS-EMPPROFILE` (`admin/profile`, 202), `NS-EMPLIST` (203) and `NS-HOLIDAYLIST` (204).
  - Their `MENU_DISPLAYED` is 'N', which is the legacy software's flag and is not used here.
- **`MODULEM`** has `MODULE_PKID`, `REC_COMPANY_CODE`, `MODULE_NAME` and `MODULE_ORDER`.
- **`USERRIGHTS`** (27,405 rows) has `RIGHTS_PKID`, `RIGHTS_BRANCH_ID` (`COMPANYM` branch id), `RIGHTS_USER_ID` (`USERM.USER_PKID`), `RIGHTS_MENU_ID` and Y/N flags: `RIGHTS_VIEW`, `ADD`, `EDIT`, `DELETE`, `PRINT`, `EMAIL`, `DOCS`, `DOCS_UPLOAD`, `ADMIN` and `COMPANY`, plus `RIGHTS_APPROVAL` (text).
  - There is at most one row per user, menu and branch, and every row's menu and branch exist.
  - **No row exists yet for the five new-software menus.**
- **Session:** `ICurrentSession` gives `UserId`, `CompanyCode`, `BranchId` and `YearId`.
- **Module rule:** modules reference only Entities, Data, Shared and SharedBusiness. The rights check must guard controllers in both Admin and Reports.

## Goals / Non-Goals

**Goals:**
- One rule for "may see this menu": the session company, new software, and view in the session branch. It is used by the menu, by the screen check and by the API check.
  The rule reads only `MENUM.REC_COMPANY_CODE` and `MENU_NEWSOFTWARE`, and the `USERRIGHTS` row's `RIGHTS_VIEW`. `MODULEM` (by company and `MENU_MODULE_ID`) gives only the module heading.
- The API is safe on its own: hiding a link is not the only protection.

**Non-Goals:**
- Editing menus, modules or rights. The existing software maintains them; this change writes nothing.
- Add, Edit and Delete behavior. The rights are loaded and exposed, but every current screen is view only.
- `MENU_ROUTE2`, `MENU_TYPE`, `MENU_GROUP_ID`, `RIGHTS_COMPANY` and `RIGHTS_APPROVAL` are not used.

## Decisions

### D1. Read-only mappings
- `Menu` (`MENUM`): `Id`, `CompanyCode`, `ModuleId`, `Code`, `Name`, `Route`, `Order` (`decimal?`) and `NewSoftware` (fixed length 1).
- `Module` (`MODULEM`): `Id`, `CompanyCode`, `Name` and `Order`.
- `UserRight` (`USERRIGHTS`): `Id`, `BranchId`, `UserId`, `MenuId`, and the nine flags as `string?` (fixed length 1).

All three use `ExcludeFromMigrations()`, string keys and `ValueGeneratedNever()`, with the snapshot-only migration `MenuRightsReadOnlyMapping`. The flags stay `'Y'`/`'N'` strings and are compared with `== "Y"`, so the SQL holds no bool literal (Oracle 10g).

### D2. Menu and rights (`iErp.Admin/UserRights`)
- `IMenuRepository` / `MenuRepository`:
  - `VisibleMenus(companyCode, userId, branchId)` is a public `IQueryable` for SQL tests. It covers the company's menus with `NewSoftware == "Y"` that have a `UserRight` for the user, branch and menu with `View == "Y"`.
  - `ListModulesAsync(companyCode, ids)`;
  - `FindMenuAsync(menuId, companyCode)` (new software only);
  - `ListRightsAsync(codes, companyCode, userId, branchId)`: the user's `UserRight` rows in the branch on the company's new-software menus with these codes, with each menu's code;
  - `HasViewRightAsync(menuCode, companyCode, userId, branchId)`.
- `IUserMenuService` / `UserMenuService`:
  - `GetMenuAsync()` returns `UserMenuDto(Modules: [ModuleDto(Id, Name, Menus: [MenuDto(Id, Code, Name, Route)])])`. Modules are in `Order`, then name, then id; menus the same. Empty modules are dropped, and so are menus whose module is not one of the company's.
  - `GetRightsAsync(codes)` returns one `MenuCodeRightsDto(Code, View, Add, Edit, Delete, Print, Email, Docs, DocsUpload, Admin)` per code in the order given, all false for a code without a menu or row.
  - Without a user, company or branch in the session, the menu is empty and every right is false.
- `MenuController`:
  - `GET api/admin/menu` answers 200;
  - `GET api/admin/menu/rights?codes=a,b` answers 200, or 400 through `ApiProblem` for no codes, more than 10 or an empty code. It replaces the earlier `{menuId}/rights`.
- *Alternative considered:* putting the rights in the token at login. Rejected: rights change in the legacy software while a session lasts, and a branch switch changes them. One small query per screen open (its menu and its related menus together) is cheap.

### D3. `[RequiresMenu("<code>")]` on the screens' controllers
- `iErp.Shared/Auth`:
  - `RequiresMenuAttribute(string menuCode)`, a type-filter attribute;
  - `IMenuAccess.CanViewAsync(menuCode, ct)`;
  - `MenuAccessFilter`, an `IAsyncAuthorizationFilter` that runs after authentication. It answers 403 `ApiProblem` "You do not have access to this screen." when the check fails, before the action runs.
- `iErp.Admin/UserRights/MenuAccess` implements `IMenuAccess` with the session and `MenuRepository.HasViewRightAsync`. Admin registers it.
- Applied as follows:
  - `CompaniesController` (`NS-COMPLIST`);
  - `BranchesController`, per action: the list (`NS-BRANCHLIST`); a branch's holidays `{id}/holidays` (`NS-HOLIDAYLIST`), since the Branch List opens the Holiday List screen;
  - `EmployeeProfileController` (`NS-EMPPROFILE`);
  - `EmployeesController`, per action: the list (`NS-EMPLIST`); an employee's profile `{id}` and `{id}/photo` (`NS-EMPPROFILE`), since the Employee List opens the Profile screen;
  - `HolidaysController` (`NS-HOLIDAYLIST`).

  The codes are constants in `iErp.Shared/Auth/MenuCodes`.
- Tests: `ApiFactory` replaces `IMenuAccess` with an allow-all fake, so existing endpoint tests are unchanged. New tests replace it with deny or a recording fake to check the 403 and that the repository is not called.
- *Alternative considered:* a menu id header sent by the frontend. Rejected: a client could send any id. The server knows which menu guards each endpoint.

### D4. Frontend menu (`core/navigation`)
- `menu.model.ts`: `UserMenu`, `MenuModule`, `MenuEntry` (id, code, name, route) and `MenuRights`.
- `MenuService` (root):
  - `load()` requests `admin/menu`; the signals are `modules`, `loaded` and `error`;
  - `entryForUrl(url)` finds the entry whose route the URL is under;
  - it loads after login (`AuthSession.start`) and after a branch switch (an effect on the session's `branchId`), and clears on logout.
- `nav-look.ts` replaces `NAV_ITEMS`:
  - `DASHBOARD_ITEM` (house, blue);
  - `NAV_LOOK`, keyed by route: `reports/companies` → `lucideFileText`, green; `reports/branches` → `lucideBuilding2`, teal; `admin/profile` → `lucideCircleUser`, violet; `admin/employees` → `lucideUsers`, amber; `admin/holidays` → `lucideCalendarDays`, rose;
  - a fallback of `lucideFileText`, brand, for a route without one.
- `AppNav` renders:
  - Dashboard;
  - for each module, a heading (`role="presentation"`, small caps style from the shared pieces);
  - its entries as links: `[routerLink]="'/' + route"`, `[queryParams]="{ menuId: code }"` (the menu code, not the internal id), `routerLinkActive` as before.
- `Dashboard` groups its quick links by module the same way, and shows none when the menu is empty.

### D5. Screen check (`menuAccessGuard`)
- Each guarded route declares its menu in `data: { menuCode }` (`MenuCodes` mirrored in the frontend): `reports/companies` `NS-COMPLIST`; `reports/branches` `NS-BRANCHLIST`; `admin/profile` and `admin/employees/:id` `NS-EMPPROFILE`; `admin/employees` `NS-EMPLIST`; `admin/holidays` and `reports/branches/:id/holidays` `NS-HOLIDAYLIST`. A route whose screen links to other screens also declares `relatedMenuCodes`: `admin/employees` `[NS-EMPPROFILE]`; `reports/branches` `[NS-HOLIDAYLIST]`.
- `core/navigation/menu-access.guard.ts`, used as `canActivateChild` on the screens' parent routes in `app.routes.ts`, so it runs for each screen that opens:
  1. Take the route's `menuCode`. Without one, or when `menuId` is in the URL and differs from it, deny.
  2. Request `GET admin/menu/rights?codes=<menuCode>,<relatedMenuCodes…>`, live on every opening; when the request fails, deny.
  3. When the view right on `menuCode` is false, deny.
  4. Otherwise store every returned code's rights in `MenuRightsStore` (root, a signal map by menu **code**). The store is cleared on logout and on a branch switch.

  The guard no longer needs the loaded menu: the live rights decide. Deny redirects to `/no-access` with `browserUrl` set to the screen's URL, so the address bar keeps the screen's URL. (`skipLocationChange` would keep the previous page's URL instead, because the redirected navigation never reaches the address bar.)
- `features/no-access/no-access.page`: the title "No access" and the message "You do not have access to this screen.".
- In-screen links set the target's code rather than keeping the current one:
  - the Employee No link and cell open `/admin/employees/<id>` with `menuId: NS-EMPPROFILE`, and only when `MenuRightsStore.rightsOf('NS-EMPPROFILE')?.view` is true (loaded by the guard with the Employee List). Otherwise the Employee No is plain text, without the cursor class and click handler;
  - the Branch List's "Holiday List" column is in the table only when `MenuRightsStore.rightsOf('NS-HOLIDAYLIST')?.view` is true (loaded by the guard with the Branch List); its button opens the holidays with `menuId: NS-HOLIDAYLIST`.
- Back uses history. The direct-open fallbacks (`/admin/employees`, `/reports/branches`) set the code of the screen they open.
- A 403 from a screen's API (rights removed while the screen is open) shows the interceptor's notification, as other refusals do.

## Risks / Trade-offs

- [No rights exist yet for the five menus] → After this change every user sees only the Dashboard until rights are added in the existing software (the user's choice). The proposal and the final task report it.
- [A menu route the frontend does not have] → The entry still shows; the router's `**` sends it to the Dashboard. New-software menus are added together with their screens.
- [The rights check costs a query per screen open and per API call] → Each is one indexed lookup (user, menu, branch). Holiday files and lists cost more.
- [The legacy `MENU_DISPLAYED` flag is 'N' for the new menus] → Only `MENU_NEWSOFTWARE` decides, as the BRS says.
- [Breaking menu specs] → `app-shell` and `app-dashboard` are modified here. The five screens' menu-entry requirements are qualified by `user-menu-access` rather than rewritten.

## Migration Plan

There is no data change; one snapshot-only migration. Deploying requires rights rows in `USERRIGHTS` for the users who should see the new screens, which are added in the existing software. Rollback is reverting the change; the static menu then returns.
