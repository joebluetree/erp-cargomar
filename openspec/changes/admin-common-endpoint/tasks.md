# Tasks

The plan was revised. The screens open by the normal routing with a session from APPDETAILS, and the Profile, Holiday List and upload code stay as on `main`. The earlier implementation (link endpoints, the link session, the `appid` route matcher, the menu registry, `ScreenOnlyLayout` and the page changes) is removed first.

## 0. Remove the earlier implementation

- [x] 0.1 Restore to `main`:
  - `EmployeeProfile*` and `HolidayList*` / `HolidayUpload*` page, service, dialog and spec files;
  - `HttpCurrentSession.cs`, `Program.cs` and `AdminRegistration.cs`;
  - `app.routes.ts`.

  Delete:
  - `backend/iErp.Admin/CommonView/`;
  - `backend/iErp.Shared/Auth/CommonViewSession.cs`;
  - `CommonViewServiceTests.cs`, `CommonViewEndpointTests.cs` and `HttpCurrentSessionTests.cs`;
  - `core/navigation/common-view.ts`;
  - `shell/screen-only-layout*.ts`;
  - `features/common-view/`.

  Verify: `git status` shows none of these files changed.

## 1. Backend: the session from APPDETAILS

- [x] 1.1 Add `LoginService.CommonViewLoginAsync(appId)` (design D1) and its result. Verify with unit tests in the existing login service tests:
  - a single row with `USER_LOGGED_OUT` 'N' (also ' n ') issues a session for the row's user, company, branch and year;
  - the password is not compared (a wrong one still succeeds);
  - a branch of the company that the user may not switch to still succeeds;
  - each of these fails: no row, two rows, 'Y' or blank logged-out, a blank user, company, branch or year, an unknown user or company, a branch or year of another company;
  - surrounding spaces in the id are ignored;
  - any new query has no `TRUE`/`FALSE` literal.
- [x] 1.2 Add `POST api/admin/login/common-view` (`[AllowAnonymous]`) with a validator for a non-blank `appId`. Verify with integration tests, without a token:
  - a valid row answers 200 with the row's details (revised in 3.1: no token);
  - an invalid row answers 401 "This link is not valid.";
  - a blank `appId` answers 400;
  - `dotnet test backend -c Release` passes (the live-Oracle tests stay skipped).

## 2. Frontend: the `/view` entry and the content-only shell

- [x] 2.1 Add `commonView?: boolean` to `Session`, and the content-only Shell (design D3). Verify in `shell.spec.ts`:
  - with `commonView` the Shell shows the content and no announcement bar, header, sidebar or menu button;
  - without it the Shell is as before.
- [x] 2.2 Add `features/common-view/`, wired as the lazy `view` route before the Shell in `app.routes.ts` (design D2):
  - `common-view.guards.ts`: `commonViewGuard`;
  - `common-view.routes.ts`: the routes and the inline `CommonViewMessagePage`;
  - `common-view.spec.ts`.

  Verify in `common-view.spec.ts`:
  - `/view?appid=A1&menuid=ns-holidaylist` posts `{ appId: 'A1' }` to `admin/login/common-view`, starts the session with `commonView: true`, and ends at `/admin/holidays?menuId=NS-HOLIDAYLIST`, replacing the address;
  - `menuId` and surrounding spaces are accepted, and `userid`, `branchid` and `yearid` are dropped;
  - a tab's existing session is replaced;
  - 401 or a network error shows "This link is not valid." and starts no session;
  - a missing `appid` shows it without a request;
  - a missing `menuid`, or one not in the user's menu, shows "The requested screen is not available.";
  - the message page has no form, button or link;
  - the menu's own routes and `/login?appid=` behave as before.
- [x] 2.3 Run `npx ng test --watch=false` and `npx ng build` in `frontend`, and verify that both succeed. If failures already present on `main` remain, list them as such.

## 3. No token: the app id on every request, and Back (revision)

- [x] 3.1 Backend (design D1): `ResolveCommonViewAsync` returns the row's identity, with no token; `POST common-view` answers the `SessionDto`. Add `AppIdAuthenticationHandler` (header `X-App-Id`) with the token's claims, and a default policy that accepts either scheme. Verify with tests:
  - the details endpoint answers the row's details and no token;
  - a request with `X-App-Id` runs as the row's user, branch and year, and the row is read for every request;
  - a logged-out row's `X-App-Id` answers 401;
  - `dotnet test backend -c Release` passes.
- [x] 3.2 Frontend (design D2): the session keeps `appId` with an empty token and does not expire; `authTokenInterceptor` sends `X-App-Id`; a 401 in the common view opens "This link is not valid."; `menuAccessGuard` returns `false` on a 401; `commonViewNoDashboardGuard` on the Dashboard route goes back a page. Verify in `common-view.spec.ts`, on the real routes and interceptors:
  - every request after the link sends `X-App-Id` and no `Authorization`;
  - the Holiday List's Back goes back a page, and no Dashboard is shown;
  - a 401 on a later request shows "This link is not valid." and ends the common view;
  - `npx ng test --watch=false` and `npx ng build` pass, except failures already present on `main`.

## 4. Integration check

- [ ] 4.1 Restart the backend and run the frontend with an APPDETAILS `appid` whose row is not logged out (read only against the dev DB). Verify:
  - `/view?appid=…&menuid=NS-HOLIDAYLIST` opens `/admin/holidays?menuId=NS-HOLIDAYLIST` with the row branch's list, with no header, sidebar or announcement bar. Upload shows only for a Holiday List admin;
  - `/view?appid=…&menuid=NS-EMPPROFILE` opens `/admin/profile?menuId=NS-EMPPROFILE` with the row user's profile;
  - a reload shows the same screen, content only;
  - every request sends `X-App-Id` and no token (browser developer tools, Network);
  - Back goes to the previous page, never the Dashboard;
  - a later normal login in the tab shows the full shell;
  - an unknown `appid` shows "This link is not valid.", and a menu not in the user's menu shows "not available".
