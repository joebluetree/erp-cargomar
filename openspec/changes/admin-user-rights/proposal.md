# Proposal

## Why

The sidebar is a fixed list today, so every logged-in user sees and can open every screen. The BRS `kb/modules/admin/user-rights.md` v1.0 asks for the menu of the legacy ERP:
- the new software shows only the menus marked for it (`MENUM.MENU_NEWSOFTWARE`), grouped under their module (`MODULEM`);
- a user sees and opens a menu only with rights on it (`USERRIGHTS`) in the session's branch (BR-001, BR-002).

## What Changes

- **Menu from the database:**
  - New read-only endpoint `GET /api/admin/menu`. It returns the session company's modules, each with its menus marked for the new software on which the user has the view right in the session branch, in module and menu order.
  - A module without such a menu is left out.
  - The sidebar and the Dashboard quick links are built from it, with Dashboard always first.
  - **BREAKING:** the static `NAV_ITEMS` list goes away; a user without rights sees only the Dashboard.
- **Module headings:** the sidebar and the quick links show each module's name as a heading, with its menus under it.
- **Menu code in the URL:** each menu link carries its menu code (`?menuId=<MENU_CODE>`, for example `NS-EMPLIST`). A link inside a screen carries the code of the screen it opens: an employee's profile opened from the Employee List carries `NS-EMPPROFILE` and needs the Profile right, on the screen and on its API (`GET /api/admin/employees/{id}`). Without the Profile right the Employee List shows the Employee No as plain text, not as a link. In the same way, a branch's holidays opened from the Branch List carry `NS-HOLIDAYLIST` and need the Holiday List right (`GET /api/reports/branches/{id}/holidays` too); without it the Branch List has no "Holiday List" column.
- **Rights of a menu:** new endpoint `GET /api/admin/menu/rights?codes=<code>,<code>` returns the user's rights on those menus in the session branch (view, add, edit, delete, print, email, docs, docs upload, admin), read live. Opening a screen loads, in one request, the rights on its menu and on its related menus (the Employee List with the Profile, the Branch List with the Holiday List), so a right changed in the existing software applies on the next opening.
  - Without the view right, the screen shows "You do not have access to this screen." instead of its content.
  - The rights are kept for the screen's later Add/Edit/Delete actions; the current screens are all view only.
- **API enforcement:** the endpoints of the five screens answer 403 "You do not have access to this screen." without the view right on their menu, so neither a typed URL nor a direct API call bypasses the menu:
  - Company List and Branch List, with the branch holidays;
  - Profile and its photo;
  - Employee List, with a listed employee's profile and photo;
  - Holiday List.
- **No rights are created.** In the dev data no user has rights on the five new-software menus yet, so after this change the sidebar shows only the Dashboard until rights are added in the existing software (the user's choice).

## Capabilities

### New Capabilities
- `user-menu-api`: the menu and menu-rights endpoints, and the view-right check on the screens' endpoints.
- `user-menu-access`: the screen-level check. The menu code is in the URL, the rights load on opening, and the "no access" state replaces the content.

### Modified Capabilities
- `app-shell`: "Navigation menu". The entries come from the backend by the user's rights, grouped under module headings, instead of one static list.
- `app-dashboard`: "Quick links". Built from the same menu and grouped by module.

## Impact

- **Backend:**
  - read-only mappings `Menu` (`MENUM`), `Module` (`MODULEM`) and `UserRight` (`USERRIGHTS`), with a snapshot-only migration;
  - new `iErp.Admin/UserRights` (repository, service, controller);
  - a `[RequiresMenu("<menu code>")]` attribute and its filter, declared in `iErp.Shared` and implemented in Admin, on the five screens' controllers;
  - `ApiFactory` gets an allow-all rights check so the existing endpoint tests keep testing their own behavior.
- **Frontend:**
  - a root `MenuService` (loads the menu after login and after a branch switch);
  - the sidebar and Dashboard rebuilt from it, with icons and colors per route;
  - a `menuAccessGuard` and a "no access" state;
  - `queryParamsHandling` on the in-screen links;
  - many specs change: nav-items, app-nav, Dashboard, clickable-cursor, and the screens' route tests.
- **Specs not edited here:** the menu-entry requirements of the five screens' own specs (Company List, Profile, Employee List, Holiday List, Branch List) now apply only to users with rights on those menus. This change states that rule in `user-menu-access` rather than editing each spec.
- **Docs:** `kb/architecture/frontend.md` (navigation) and `kb/architecture/backend.md` (rights filter) would need updates. Per CLAUDE.md they are not edited.
