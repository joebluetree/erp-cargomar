# Tasks

## 1. Backend

- [x] 1.1 Mappings (D1): `Menu`, `Module` and `UserRight` with their configurations, plus the snapshot-only migration `MenuRightsReadOnlyMapping`. Verify:
  - mapping tests for every column (key, lengths, fixed-length flags, `ExcludeFromMigrations`);
  - `dotnet ef migrations script` has no statement for `MENUM`, `MODULEM` or `USERRIGHTS`;
  - `dotnet build` passes.
- [x] 1.2 Menu and rights (D2): `MenuRepository`, `UserMenuService` and `MenuController` (`GET api/admin/menu`, `GET api/admin/menu/{menuId}/rights`), registered in `AdminRegistration`. Verify with tests:
  - `Unit/MenuQueryTests` (`ToQueryString()`): no `TRUE`/`FALSE`; `MENU_NEWSOFTWARE`, `RIGHTS_VIEW` compared with 'Y'; user, branch and company in the WHERE;
  - service tests: modules and menus in order (ties by name, then id); empty modules dropped; menus of an unknown module dropped; no session values give an empty menu; rights mapping (Y → true, anything else → false); no row → all false; unknown menu → null;
  - `Integration/MenuEndpointTests` with a fake repository: 200 camelCase menu; rights 200; 404 "Menu not found."; 401 without a token.
- [x] 1.3 Rights check on the screens' API (D3): `RequiresMenuAttribute`, `IMenuAccess`, `MenuAccessFilter` and `MenuCodes` in `iErp.Shared/Auth`; `MenuAccess` in Admin; the attribute on the five controllers; an allow-all `IMenuAccess` in `ApiFactory`. Verify with tests:
  - `Integration/MenuAccessEndpointTests`: every guarded endpoint answers 403 "You do not have access to this screen." with a denying `IMenuAccess`, which is asked for that endpoint's menu code, and the data repository is not called; login, change branch and the menu endpoints are not guarded;
  - `Admin/MenuAccessTests`: `CanViewAsync` uses the session user, company and branch; no session values → false;
  - `Architecture/DependencyRuleTests` passes;
  - all existing tests pass.
- [x] 1.4 Add the Oracle-gated `Integration/MenuTablesTests`. It creates shaped `MENUM`, `MODULEM` and `USERRIGHTS` only in a schema that has none, and checks the visible menus (new software, view, branch, company, order, empty module) and `HasViewRightAsync`. Verify that it is skipped without `IERP_TEST_ORACLE`; never point it at the dev database.

## 2. Frontend

- [x] 2.1 Menu service and look (D4): `menu.model.ts`, `MenuService` (load after login and branch switch, clear on logout, `entryForUrl`) and `nav-look.ts` (Dashboard item, look by route, fallback); remove `NAV_ITEMS` / `NAV_MENU`. Verify with specs: the service requests `admin/menu` after login and after a branch switch, not after another session change; it clears on logout; `entryForUrl` matches a route and its child URLs; the look map and fallback.
- [x] 2.2 Sidebar and Dashboard (D4): `AppNav` with Dashboard, module headings and entries carrying `menuId`; Dashboard quick links grouped by module. Update the app-nav, Dashboard, nav and clickable-cursor specs. Verify:
  - Dashboard first;
  - headings in module order with their entries;
  - only Dashboard while loading, on error and with an empty menu;
  - the links' `href` includes `?menuId=`;
  - the highlight on child URLs;
  - no quick links for an empty menu.
- [x] 2.3 Screen check (D5): `menuAccessGuard` on the five screens' routes, `MenuRightsStore`, the `/no-access` page, and `menuId` kept by the in-screen links and the direct-open Back fallbacks. Verify with specs:
  - with `menuId` and view true the screen opens and its rights are stored;
  - view false, or no `menuId` and the screen not in the menu, shows "You do not have access to this screen." and the screen sends no request;
  - without `menuId` the menu's entry is found by URL;
  - the Employee No link and cell and the Holiday List button keep `menuId`;
  - the Dashboard needs no right.
- [x] 2.4 Run `npm test -- --no-watch` and `npm run build`; the look guard passes.

## 3. Final check

- [x] 3.1 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate admin-user-rights --strict`. Then do a read-only live check against the dev DB through the running API (credentials only in a temporary file, deleted right after):
  - `GET api/admin/menu` for a CPL user equals a `SELECT` of their visible menus (expected empty today);
  - a guarded endpoint answers 403 for that user;
  - in the browser, the sidebar shows Dashboard only, and a typed `/reports/companies` shows "You do not have access to this screen.".

  Report that rights must be added in the existing software for the new menus to appear, and the kb documents that are now out of date, without editing them.

## 4. Menu code and Profile right

- [x] 4.1 Backend (D3): guard `EmployeesController` per action: the list with `NS-EMPLIST`; `{id}` and `{id}/photo` with `NS-EMPPROFILE`. Verify with tests:
  - `Integration/MenuAccessEndpointTests`: a recording `IMenuAccess` is asked for `NS-EMPLIST` on the list and `NS-EMPPROFILE` on `{id}` and `{id}/photo`;
  - a user allowed `NS-EMPLIST` but denied `NS-EMPPROFILE` gets 403 on `{id}` and 200 on the list;
  - all existing tests pass.
- [x] 4.2 Frontend (D4, D5): menu links carry `menuId: code`; each guarded route declares `data: { menuCode }`; `menuAccessGuard` checks the route's code against `menuId` and the user's menu, and requests the rights by the entry's id. The Employee No link and cell set `NS-EMPPROFILE` and appear only with an `NS-EMPPROFILE` entry, otherwise plain text with no cursor or click; the Holiday List button sets `NS-BRANCHLIST`; the direct-open Back fallbacks set the code of the screen they open. Verify with specs:
  - the links' `href` has `?menuId=<code>`;
  - a `menuId` of another menu, a menu not in the user's menu, or view false shows no access and sends no screen request;
  - `/admin/employees/<id>` needs the Profile entry and its view right, not the Employee List's;
  - the Employee List without the Profile entry shows plain Employee No, and a click opens nothing;
  - Back and its fallbacks.
- [x] 4.3 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate admin-user-rights --strict`. Then do a read-only browser check against the dev DB through my test servers (credentials only in a temporary file, deleted right after), as the user who has rights:
  - the sidebar links have `?menuId=<code>`;
  - with Profile view 'N' today, the Employee List shows the Employee No as plain text, and a typed `/admin/employees/<id>?menuId=NS-EMPPROFILE` shows "You do not have access to this screen.";
  - `GET api/admin/employees/{id}` answers 403.

## 5. Related menus' rights, live

- [x] 5.1 Backend (D2): `GET api/admin/menu/rights?codes=` with `ListRightsAsync` and `GetRightsAsync(codes)`, replacing `{menuId}/rights`. Verify with tests:
  - `Unit/MenuQueryTests`: the rights query has no `TRUE`/`FALSE`, compares `MENU_NEWSOFTWARE` with 'Y' and has company, user, branch and the codes in the WHERE;
  - service tests: one entry per code in order; no row or unknown code → all false; Y → true;
  - `Integration/MenuEndpointTests`: 200 camelCase list; 400 for no codes, more than 10 or an empty code; 401 without a token;
  - the Oracle-gated `MenuTablesTests` cover the new query.
- [x] 5.2 Frontend (D5): routes declare `relatedMenuCodes` (Employee List: `NS-EMPPROFILE`); the guard requests the rights by codes on every opening and checks the screen's view right; `MenuRightsStore` keyed by code and cleared on logout and branch switch; the Employee No link follows `rightsOf('NS-EMPPROFILE')?.view`. Verify with specs:
  - opening the Employee List sends one request with `NS-EMPLIST,NS-EMPPROFILE`; other screens send their own code only;
  - view false on the screen's code, another menu's code, or a failed request shows no access and sends no screen request;
  - the Employee No is a link with the Profile's view true and plain text without it; reopening the list with changed rights changes it;
  - the store is empty after logout and after a branch switch;
  - the routes spec checks `relatedMenuCodes`.
- [x] 5.3 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate admin-user-rights --strict`. Then do a read-only live check against the dev DB through my test servers (credentials only in a temporary file, deleted right after), as the user who has rights: opening the Employee List sends one rights request with both codes, the answer matches `USERRIGHTS` (Profile view 'N' today), and the Employee No is plain text.

## 6. Holiday List right in the Branch List

- [x] 6.1 Backend (D3): guard `BranchesController` per action: the list with `NS-BRANCHLIST`; `{id}/holidays` with `NS-HOLIDAYLIST`. Verify with tests:
  - `Integration/MenuAccessEndpointTests`: the recording `IMenuAccess` is asked for `NS-BRANCHLIST` on the list and `NS-HOLIDAYLIST` on `{id}/holidays`;
  - a user allowed `NS-BRANCHLIST` but denied `NS-HOLIDAYLIST` gets 200 on the list and 403 on `{id}/holidays`, and no holiday is read;
  - all existing tests pass.
- [x] 6.2 Frontend (D5): the `reports/branches` route declares `relatedMenuCodes: [NS-HOLIDAYLIST]`, and `:id/holidays` declares `menuCode: NS-HOLIDAYLIST`; the Branch List shows the "Holiday List" column only with `rightsOf('NS-HOLIDAYLIST')?.view`, and its button sets `menuId: NS-HOLIDAYLIST`. The Holiday List's direct-open Back fallback stays the Branch List with `NS-BRANCHLIST`. Verify with specs:
  - opening the Branch List sends one request with `NS-BRANCHLIST,NS-HOLIDAYLIST`;
  - the column and its button are there with the Holiday List's view true, and the table has no such column without it;
  - the button opens `/reports/branches/<id>/holidays?menuId=NS-HOLIDAYLIST`;
  - a branch's holidays need the Holiday List's view right;
  - the routes spec shows the new codes.
- [x] 6.3 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate admin-user-rights --strict`. Then do a read-only live check against the dev DB through my test servers (credentials only in a temporary file, deleted right after), as the user who has rights: report what today's rights give (Branch List and Holiday List views) and check the Branch List, its column and a branch's holidays (screen and API) against them.
