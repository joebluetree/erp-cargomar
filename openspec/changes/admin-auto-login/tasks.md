# Tasks

## 1. APPDETAILS read-only mapping

- [x] 1.1 Confirm the `APPDETAILS` column names, types and lengths with a read-only SELECT on `ALL_TAB_COLUMNS` (names, types and lengths only, no row data, no writes), and record them in design D5 if they differ from strings. Verify: the seven columns of the document are found.
- [x] 1.2 Add the `AppDetail` entity (`iErp.Entities`) and its configuration (`iErp.Data/Configurations`): `APPDETAILS` mapped with `ExcludeFromMigrations()`, keyed on `USER_APPID`, with its seven columns. Add an empty migration that records the snapshot (`dotnet ef migrations add`, never `database update`). Verify: a mapping unit test checks the table and column names, and a migration test shows `APPDETAILS` is excluded (like `MenuMappingTests` and `MenuTablesTests`).
- [x] 1.3 Add the repository read of the rows for an app id (trimmed, `AsNoTracking`, no row limit). Verify: a `ToQueryString` test shows no `FETCH` at all and no TRUE/FALSE literal, so it runs on Oracle 10g.

## 2. Auto-login backend

- [x] 2.1 Move the user, company and password check out of `LoginService.LoginAsync` into a shared private method with no change in behaviour. Verify: the existing `LoginServiceTests` and `LoginEndpointTests` all pass unchanged.
- [x] 2.2 Add `AutoLoginRequest`, its validator (`appId` required, non-blank, maximum length of `USER_APPID`), `AutoLoginOutcome` and `AutoLoginResult` with the message "Automatic login failed. Please log in.". Verify: validator unit tests cover missing, blank and too long ids.
- [x] 2.3 Implement `LoginService.AutoLoginAsync`:
  - the row lookup and the `USER_LOGGED_OUT` = 'N' check;
  - the shared credential check with the password in upper case;
  - the row's branch and year by the branch-switch rules (`IChangeBranchRepository`), with the defaults when they are empty;
  - the token issued as for the login;
  - each failure logged by reason, without the id or the password.

  Verify: `LoginServiceTests` cover every scenario of `specs/user-auto-login`: logged out, unknown id, two rows, wrong password, lower-case password, locked user, branch not allotted, year of another company or closed, empty branch and year falling back to the defaults, and the row's own branch and year. A test log sink shows that neither the id nor the password is ever logged.
- [x] 2.4 Add `POST /api/admin/login/auto` to `LoginController` (anonymous; 200 `LoginResponse`, 400 validation, 401 the one message). Verify with `LoginEndpointTests`:
  - 200 with a token that opens a protected endpoint;
  - the same 401 body for an unknown id and for a logged-out row;
  - 400 naming `appId`;
  - 405 for other methods.

  Run the full backend test suite (`dotnet test`).

## 3. Auto-login on the login screen

- [x] 3.1 Add `LoginService.autoLogin(appId)`: it posts `{ appId }` to `admin/login/auto` with `LOGIN_REQUEST` and `SKIP_ERROR_NOTIFICATION`, starts the session on success, and tracks busy. Verify: `login.service.spec.ts` checks the request body and context, that the session starts, and that busy is reset on failure.
- [x] 3.2 Add `autoLoginGuard` on the login route: with a non-blank `appid` it logs in before the login screen is created and redirects to the Dashboard, replacing the address; without Remember me. On failure it shows the single warning "Automatic login failed. Please log in." and redirects to the normal login screen. Verify: `auto-login.guard.spec.ts` covers every scenario of `specs/user-login-page`:
  - success, with no login form drawn while the request runs;
  - the address replaced (`replaceUrl`) on success and on failure;
  - Remember me untouched;
  - a blank id sends nothing, and no parameter opens the login screen as usual;
  - a 401 and a network failure each give exactly one warning, with the login screen shown;
  - in a tab with a session, an `appid` link ends that session first (`guestGuard`, `auth.guards.spec.ts`).

  Then run `npm test -- --no-watch` and `npm run build`.

## 4. Integration check

- [x] 4.1 Live read-only check against the dev database:
  - Start the API on a spare port and the frontend with a matching proxy.
  - Open `/login?appid=<id>` for an `APPDETAILS` row with `USER_LOGGED_OUT` = 'N'. The user supplies the id, and it is kept only in a temporary file.
  - Confirm the Dashboard opens with the row's branch and year, and that the address bar no longer shows the id.
  - Confirm an unknown id shows the login screen with the warning.
  - Print only booleans and counts; write nothing to the database.
  - Stop both servers afterwards.
