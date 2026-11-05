# Design

## Context

- **APPDETAILS:** `AppDetail` (`APPDETAILS`, read only) holds the old system's login details per `USER_APPID`:
  - user code and plain password;
  - company code, branch id and year id;
  - `USER_LOGGED_OUT`.
- **Logins** (`backend/iErp.Admin/Login/`):
  - `LoginService.LoginAsync` and `AutoLoginAsync` both end in the private `Issue(user, company, branch, year)`, which builds `SessionDto`, issues the token and returns `LoginResponse`. `SessionTokenIssuer` builds the token's claims (`SessionClaims`), which `HttpCurrentSession` reads.
  - `AutoLoginAsync` reads the row with `ILoginRepository.FindAppDetailsAsync`. It checks the password (`CheckCredentialsAsync`) and the allowed branch and year (`IChangeBranchRepository.FindBranchAsync` / `FindYearAsync`).
  - The admin user's variants `FindCompanyBranchAsync(companyId, branchId)` and `FindCompanyYearAsync(companyCode, yearId)` check only that the branch and year belong to the company.
  - `LoginController` (`api/admin/login`, `[AllowAnonymous]`) answers a failure with 401 problem details.
- **Frontend session:**
  - `AuthSession.start(session)` stores the `Session` in `sessionStorage` (`ierp-session`).
  - `LoginService.autoLogin` posts with the `LOGIN_REQUEST` context. That context sends no token, and its 401 is not treated as an expired session.
  - `autoLoginGuard` waits for `MenuService.whenLoaded()`, finds the menu code in `entries()`, and redirects to `/<route>?menuId=<code>`.
- **Shell:** `shell.html` shows the announcement bar, the header (with menu buttons, session details, Change branch, theme and Log out), the sidebar `app-nav`, and the content. Every route but `/login` is its child, and needs a session (`authGuard`).
- **Database:** read only. Nothing is written to the database.

## Goals / Non-Goals

**Goals:**
- The common view opens the menu by the normal routing, so every screen works unchanged, with its rights.
- No login credentials are checked: only the APPDETAILS row decides.
- The header and navigation are hidden for the common view session.

**Non-Goals:**
- Any change to the Profile, Holiday List or other screens and their endpoints.
- Any change to the login, the automatic login or `/login?appid=…&menuid=…`.
- Choosing another user, branch or year on the link.

## Decisions

### D1. Backend: the link check, its details endpoint and the `X-App-Id` authentication

`LoginService.ResolveCommonViewAsync(appId)` returns the row's `CommonViewIdentity` (user id and `SessionDto`) or null. It checks, in order:

1. `FindAppDetailsAsync(appId.Trim())` returns exactly one row.
2. Its `LoggedOut`, trimmed, equals 'N', ignoring case.
3. Its user code, company code, branch id and year id are non-blank.
4. The company (`FindCompanyAsync(code)`) exists, and exactly one user that is not deleted (`FindNotDeletedUsersAsync(code, companyCode)`, locked users included) exists. There is no password check (no `CheckCredentialsAsync`).
5. The branch is a branch of the company (`FindCompanyBranchAsync(company.Id, branchId)`), and the year is a year of the company (`FindCompanyYearAsync(company.Code, yearId)`). The user's allowed branches and years are not checked.

Each refusal reason is logged with the user and company codes, but not the app id. Nothing issues a token.

It is used in two places:
- **`POST /api/admin/login/common-view`** (`[AllowAnonymous]`, body `{ appId }` validated by `AutoLoginRequestValidator`) answers 200 with the `SessionDto`, or 401 "This link is not valid.". The frontend reads the row's details from it once.
- **`AppIdAuthenticationHandler`** (`iErp.Api/Auth`, scheme `AppId`): a request with the header `X-App-Id` is resolved again every time. On success the request gets `SessionTokenIssuer.Claims(userId, session)`, the same claims a token carries, so `HttpCurrentSession`, `IMenuAccess` and every service work unchanged. On failure authentication fails and the request answers 401. A request without the header is left to the token scheme. The handler's own challenge writes nothing; the token scheme writes the one 401 problem answer.

**Policy:** the default authorization policy accepts either scheme (`JwtBearer` or `AppId`), so every protected endpoint takes a token or an app id.

- **Alternative: issue a token from the row.** Rejected by the user: no login and no token. A token would also stay valid after the row is logged out.
- **Alternative: link endpoints per screen.** Rejected: every screen would need a second data path, and the BRS wants the screens unchanged.

### D2. Frontend: `/view` entry guard

```
/login …                        (unchanged)
/view                           (outside the shell, no session needed)
  ├─ ''                         canActivate: [commonViewGuard] (always redirects)
  ├─ unavailable                CommonViewMessagePage (by `reason`: link | none)
  └─ **                         → /view/unavailable
'' Shell …                      (unchanged; menu routes such as admin/holidays)
```

`commonViewGuard` (`features/common-view/`):
1. Reads `appid` (trimmed). Without it, redirects to `/view/unavailable?reason=link`, without a request.
2. Posts `{ appId }` to `admin/login/common-view` with `LOGIN_REQUEST` and `SKIP_ERROR_NOTIFICATION`. On success it calls `AuthSession.start({ token: '', expiresAt: '', ...details, appId, commonView: true })`, replacing any session. On failure it redirects to `/view/unavailable?reason=link`.
3. Waits for `MenuService.whenLoaded()` and finds `menuid`/`menuId` (trimmed, upper-cased) in `entries()`. It redirects with `replaceUrl` to `/<route>?menuId=<code>`. A missing code, or one not in the menu, redirects to `/view/unavailable`.

From there the Shell route, `authGuard`, `menuAccessGuard` and the screen work as for a menu link.

- **Requests:** `authTokenInterceptor` sends `X-App-Id: <appId>` instead of `Authorization` when the session has an `appId`. `isExpired` is false for it, since there is no token to expire.
- **A 401 later:** `sessionExpiryInterceptor` ends a common view and opens `/view/unavailable?reason=link`, instead of the login screen and its "session expired" warning. `menuAccessGuard` returns `false` on a 401 instead of the no-access page, so that redirect is not overridden (this also applies to an expired token).
- **Back:** the screens' Back opens the Dashboard when there is no earlier page in the app. `commonViewNoDashboardGuard` on the Dashboard route calls `Location.back()` and cancels for a common view, so Back goes to the previous page, such as the page that opened the link. The screens stay unchanged.

- **Messages:** `CommonViewMessagePage` maps `link` → "This link is not valid.", and anything else → "The requested screen is not available." (`MENU_NOT_AVAILABLE_MESSAGE`). It has no buttons or links.
- **Files:** `common-view.guards.ts`, `common-view.routes.ts` (routes and the inline message page), and one `common-view.spec.ts`. `app.routes.ts` adds the lazy `view` route before the Shell.
- **Alternative: a guard on `/login` (reusing `autoLoginGuard`).** Rejected: `/login` has `guestGuard` and the password-checking behaviour, which must stay unchanged.

### D3. Shell: content only for a common view

- `Session` gains optional `commonView?: boolean` and `appId?: string`. They are stored with the session, so a reload keeps them, and they end with it. A normal login or the automatic login starts a session without them.
- The Shell reads `commonView = computed(() => auth.session()?.commonView === true)`. When it is true, `shell.html` renders only the content area, with its padding: no announcement bar, header or sidebar (`app-nav`), and no menu buttons. The `inert` busy handling and the loading indicator stay.
- **Alternative: a separate layout route for the common view.** Rejected: the menu routes are the Shell's children, so their own routes and guards would have to be duplicated.

## Risks / Trade-offs

- **[`appid` works like a password]** While its row is not logged out, `appid` acts as the row's user on every protected endpoint. It is in the address bar of `/view`, the frontend's session storage, the browser history and the server's request logs. Mitigations:
  - the user's menu rights still apply to every screen and action;
  - the `/view` address is replaced in the history;
  - the row is checked on every request, so logging it out ends it at once.
- **[Several reads per request]** Each request reads the APPDETAILS row, the company, the user, the branch and the year. These are small key reads.
- **[No password or allowed-branch check]** A user disabled in this system, or a branch the user may not switch to, still opens screens through a row that is not logged out. This is accepted by the BRS ("no login credentials is checked").
- **[Navigation without a header]** The screen's own Back button and in-screen links still work, and Back never shows the Dashboard. Without the header, there is no Log out or Change branch. Closing the tab ends the common view. Back in a new tab with no earlier page does nothing visible.
- **[The tab's session is replaced]** A tab that had a normal session loses it, as with the automatic login.
- **[A second authentication scheme]** Every protected endpoint now also accepts `X-App-Id`. The scheme only reads, and gives exactly the claims a token of that user would.

## Migration Plan

No data migration. Deploy the backend and frontend together. To roll back, redeploy the previous build.
