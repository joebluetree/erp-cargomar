# Design

## Context

See `proposal.md` for the motivation. The pieces this change builds on:

- **`autoLoginGuard`** (`features/admin/login/auto-login.guard.ts`) is a `canActivate` guard on `/login`. With an `appid`, it calls `LoginService.autoLogin()`. On success it returns a `RedirectCommand` to `/` with `replaceUrl`; on failure it shows one warning and redirects to `/login`.
- **`MenuService`** (`core/navigation`, root) loads the user's menu from `GET /api/admin/menu` once a session starts. That endpoint reads `MENUM` (new-software menus) and returns only the menus the user has the view right on in the session branch, each with `code` and `route` (`MENU_ROUTE1`). `whenLoaded()` resolves once the menu has loaded or failed; `entries()` lists every menu.
- **Menu links** throughout the app go to `/<route>?menuId=<code>`. **`menuAccessGuard`** checks the view right live when such a screen opens, and shows the no-access page otherwise.
- `MENUM.MENU_CODE` values are upper case, such as `NS-EMPPROFILE`.

## Goals / Non-Goals

**Goals:**
- Open the linked screen in the same navigation as the login, so the Dashboard is never drawn first.
- Reuse the user's menu and the existing screen guard, so a link can open nothing that the user could not open from the menu.

**Non-Goals:**
- Any backend change, including a new "route by menu code" endpoint.
- `menuid` on the normal login screen, or after a manual login.
- Opening menus outside the user's menu, such as old-system menus that are not new-software menus (`MENU_NEWSOFTWARE` ≠ 'Y').

## Decisions

### D1. Resolve the menu in `autoLoginGuard`, from the user's menu
- After `autoLogin()` succeeds, the guard reads `menuid`, trimmed. When it is non-blank, the guard awaits `MenuService.whenLoaded()` and looks in `entries()` for the code, comparing case-insensitively after trimming.
- **Found:** it returns `RedirectCommand(router.createUrlTree(['/' + entry.route], { queryParams: { menuId: entry.code } }), { replaceUrl: true })`. That is the same URL a menu link builds, so `menuAccessGuard` and the active-menu highlight behave as usual. The code in the URL is the stored one (`entry.code`), not the one the link typed.
- **Not found, or the menu failed** (`MenuService.error()`, which leaves `entries()` empty): it shows `notifications.warn('The requested screen is not available.')` and redirects to `/`, as without `menuid`.
- **Blank or absent `menuid`:** it redirects to `/` as today, without waiting for the menu.
- **Alternative considered:** a backend lookup of `MENUM` by code (for example `GET /api/admin/menu/route?code=`). Rejected. The user's menu already holds every route the user may open, it is loaded right after login anyway (the shell needs it), and a separate lookup would need its own rights check to avoid opening a screen the user has no right on.
- **Alternative considered:** redirect straight to the screen and let `menuAccessGuard` decide. Rejected. The user chose the Dashboard with a warning over the no-access page, and the route is not known without the menu.

### D2. Read `menuid` from the activated route, accepting `menuId` too
- The document names the parameter `menuid`, in lower case, like `appid`. The guard reads `menuid` first and falls back to `menuId`, so that a link built in the application's own form also works. Angular query parameters are case-sensitive, so other spellings are not read.
- The `guestGuard` exception (ending an earlier session for an `appid` link) is unchanged. It keys on `appid` only.

### D3. One constant for the warning
- `MENU_NOT_AVAILABLE_MESSAGE = 'The requested screen is not available.'` is exported beside `AUTO_LOGIN_FAILED_MESSAGE`, so the tests and the guard share it.
- A failed login returns before `menuid` is read, so the failure path still shows exactly one warning (spec: "Menu id ignored when the automatic login fails").

## Risks / Trade-offs

- **[Menu load delays the screen]** On a `menuid` link, the redirect waits for `GET /api/admin/menu`, about one more round trip, during which the page stays blank. → It is the same request the shell makes after login, and `MenuService` does not repeat it once loaded.
- **[Right revoked between menu load and screen open]** `menuAccessGuard` re-checks the right live, so in that rare case the no-access page is shown rather than the warning. → This is accepted, and it is consistent with the rest of the app.
- **[Menus with child routes]** A `MENU_ROUTE1` that the frontend has no route for falls to the `**` redirect, which leads to the Dashboard without the warning. → This is the same as clicking that menu today, and it is out of scope.

## Migration Plan

- This is a frontend-only change with no data migration. Links without `menuid` behave exactly as before.
- Rollback: revert the change.
