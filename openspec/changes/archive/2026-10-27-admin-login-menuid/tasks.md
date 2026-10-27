# Tasks

## 1. Open the linked menu after the automatic login

- [x] 1.1 In `features/admin/login/auto-login.guard.ts`, export `MENU_NOT_AVAILABLE_MESSAGE = 'The requested screen is not available.'`, and after a successful `autoLogin()` read `menuid`, falling back to `menuId`, trimmed (design D2). Verify that `npx ng build` succeeds.
- [x] 1.2 For a non-blank `menuid`, await `MenuService.whenLoaded()` and find the entry in `entries()` by code, comparing case-insensitively after trimming. If found, redirect with `replaceUrl` to `/<entry.route>?menuId=<entry.code>`. Otherwise, including when the menu failed to load, show the one warning and redirect to `/`. A blank or absent `menuid` keeps today's redirect to `/` without waiting for the menu (design D1, D3). Verify with the tests in 1.3.
- [x] 1.3 Extend `auto-login.guard.spec.ts` with one test per scenario in `specs/user-login-page/spec.md`, and verify that they pass:
  - Profile from the link, with the address `/admin/profile?menuId=NS-EMPPROFILE` replacing the `appid` URL;
  - no `menuid`, and a blank one: the Dashboard with no warning;
  - a code in another case, with spaces;
  - an unknown code, and a menu without the view right (absent from `admin/menu`): the Dashboard, the single warning, and the session kept;
  - `admin/menu` failing: the Dashboard and the single warning;
  - a refused login with `menuid`: only the auto-login warning, and no `admin/menu` request;
  - `menuid` without `appid`: the login screen, with nothing sent.
  Add routes for a stub screen at `admin/profile` to the test router.
- [x] 1.4 Update the existing guard and login-page tests that now see the `GET admin/menu` request started by `MenuService` after the session begins. Flush it or match it in each, so that `controller.verify()` still passes. (None needed it: the guard injects `MenuService` only when `menuid` is set, so tests without it see no `admin/menu` request.) Then run `npx ng test --watch=false --include='src/app/features/admin/login/**/*.spec.ts' --include='src/app/core/**/*.spec.ts'` and verify that everything passes.
- [x] 1.5 Update the doc comment of `autoLoginGuard` to describe `menuid`, and verify that it matches the behaviour in 1.2.

## 2. Integration check

- [x] 2.1 Run the full frontend suite (`npx ng test --watch=false`) and `npx ng build`, and verify that both pass.
- [ ] 2.2 In the running app, with a valid `appid` (read-only; nothing is written to the database), open these links:
  - `/login?appid=<id>&menuid=NS-EMPPROFILE`: Profile opens directly;
  - `/login?appid=<id>`: the Dashboard opens;
  - `/login?appid=<id>&menuid=XYZ`: the Dashboard opens with the warning.
  Verify each, including that the back button never returns to the `appid` address.
