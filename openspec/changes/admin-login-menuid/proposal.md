# Proposal

## Why

The old system opens the new software with an `appid` link, and the user always lands on the Dashboard. When the user started from a particular function in the old system, they then have to find that screen in the menu themselves. Version 1.1 of `kb/modules/admin/auto-login.md` (BR-002) adds a `menuid` parameter so that the link can open the screen directly.

## What Changes

- The automatic-login link may carry a `menuid` parameter beside `appid`, for example `/login?appid=<id>&menuid=NS-EMPPROFILE`. Its value is a menu code (`MENUM.MENU_CODE`), the same code the application already carries in its own URLs as `menuId`.
- After a successful automatic login with a `menuid`, the application opens that menu's screen, at the route `MENUM.MENU_ROUTE1`, in place of the Dashboard (BR-002.1, BR-002.S1).
- Without a `menuid`, or with a blank one, the automatic login opens the Dashboard as today (BR-002.2, BR-002.S2).
- The menu is looked up in the user's own menu, which is already read from `MENUM` and the user's rights for the session branch. If the code is unknown, the user has no view right on it, or the menu cannot be loaded, the Dashboard opens with one warning: "The requested screen is not available." The user stays logged in. This was decided with the user.
- The address bar ends on the opened screen's normal URL (`/<route>?menuId=<code>`). The address with `appid` and `menuid` is replaced, not kept in the history, as today.
- A failed automatic login behaves as today, whether or not `menuid` is present: the login screen with the single warning.
- No backend change. The backend's automatic login and menu endpoints are used as they are.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `user-login-page`: after a successful automatic login, the screen named by the link's `menuid` opens in place of the Dashboard, with a fallback to the Dashboard and a warning when it cannot be opened.

## Impact

- **Frontend** (`features/admin/login`): `autoLoginGuard` reads `menuid`, waits for the user's menu after the login, and redirects to the menu's screen or to the Dashboard. It comes with updated guard tests.
- **Frontend** (`core/navigation`): `MenuService` is reused as it is (`whenLoaded()`, `entries()`), and so is the existing `menuAccessGuard`, which still checks the view right when the screen opens.
- **Backend / database**: none. `MENUM` is read through the existing `GET /api/admin/menu`.
- **Depends on** the change `admin-auto-login`, which is implemented and merged but not yet archived. This change adds to the automatic-login behaviour it introduced in `user-login-page`.
- **Knowledge base**: per `CLAUDE.md`, no `kb/` document is changed. `kb/modules/admin/auto-login.md` already lists v1.1 as "Implemented" in its Change History. Correcting that status, if needed, is left for the user to request.
