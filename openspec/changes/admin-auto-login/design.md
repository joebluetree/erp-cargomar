# Design

## Context

See `proposal.md` for the motivation. Today's login works like this:

- **Backend.** `POST /api/admin/login` (`iErp.Admin/Login`):
  - `LoginService` checks the user code, password and company code against `USERM` and `COMPANYM`. The typed password is encrypted with the legacy `Lib.Encrypt` and compared in fixed time.
  - It then takes the user's default branch and the company's latest year, and issues a token with `ISessionTokenIssuer`.
  - The branch switch (`iErp.Admin/ChangeBranch`) already has the rules for "a branch the user may switch to" (`IChangeBranchRepository.FindBranchAsync(userId, companyId, branchId)`) and "a year of the company" (`FindYearAsync`).
  - Legacy tables are mapped read-only with `ExcludeFromMigrations()`, as in `MenuConfiguration`. Each such mapping comes with an empty migration that records the model snapshot.
- **Frontend.** `features/admin/login`:
  - `LoginPage` holds the form.
  - `LoginService.login()` posts with `LOGIN_REQUEST` and `SKIP_ERROR_NOTIFICATION` and starts the `AuthSession`. It sends the user code and password in upper case, because the legacy system stored them that way.
  - `guestGuard` sends a tab that already has a session to the Dashboard.

`APPDETAILS` is written by the old system. Its column types are not yet confirmed in this repository.

## Goals / Non-Goals

**Goals:**
- One credential check shared by the normal and the automatic login, so the two can never drift apart.
- The automatic login leaks nothing: one answer for every failure, and neither the password nor the id is ever logged.

**Non-Goals:**
- Changing how the old system writes `APPDETAILS`, or writing it from this application (logout included). This was decided with the user.
- Making the link one-time or time-limited, and rate limiting. The user chose to follow the document as written. See Risks.
- Remembering the automatic login (Remember me) or any change to the normal login screen.

## Decisions

### D1. A separate endpoint: `POST /api/admin/login/auto` with `{ "appId": "…" }`
- Anonymous, in `LoginController`, beside the normal login.
- A POST body keeps the id out of server access logs and caches.
- A separate route, rather than an optional field on `POST /api/admin/login`, keeps the two contracts and their validation simple.
- An `AutoLoginRequest` with a FluentValidation validator enforces required and maximum length (the length of `USER_APPID`).
- The answer is `LoginResponse`, on 200, or 401 problem details with `AutoLoginResult.FailedMessage` = "Automatic login failed. Please log in.".

### D2. Share the credential check in `LoginService`
- The part of `LoginAsync` that finds the user and the company and compares the password moves into a private method.
- `LoginAsync` uses it unchanged.
- The new `AutoLoginAsync(appId)`:
  1. reads the `APPDETAILS` row;
  2. requires `USER_LOGGED_OUT` = 'N';
  3. runs the same check with `USER_CODE`, `USER_PASSWORD.ToUpperInvariant()` and `USER_COMPANY_CODE`. Upper case matches what the login screen sends; see the spec;
  4. resolves the branch and year (D3);
  5. issues the token exactly as `LoginAsync` does.
- Alternative considered: calling `LoginAsync` with a built `LoginRequest`. Rejected, because the branch and year must come from the row and not from the defaults.

### D3. Branch and year: the row's, checked by the branch-switch rules
- `LoginService` takes `IChangeBranchRepository`, which is already registered.
  - A set `USER_BRANCH_ID` must pass `FindBranchAsync(user.Id, company.Id, branchId)`.
  - A set `USER_YEAR_ID` must pass `FindYearAsync(company.Code, yearId)`.
  - An empty value falls back to the normal login's default (`FindBranchAsync(user.BranchId)` with the company check, and `FindLatestYearAsync`).
- This means an automatic login can never open a branch or year that the user could not switch to by hand.
- Alternative considered: always use the defaults and ignore the row. Rejected: the document says to use the row's branch and year.

### D4. One failure, logged by reason
- Each failure returns `AutoLoginOutcome.Failed`, whatever the reason: unknown id, more than one row, logged out, invalid credentials, no or disallowed branch, no or disallowed year.
- The log names the reason and the user code once it is known. It never contains the id or the password.
- Like the normal login, the password comparison runs even when no user is found. This keeps the timing from revealing whether the user exists. An unknown id still answers faster than a known one; that difference only tells whether the id exists, which is already the main risk (see Risks).

### D5. `APPDETAILS` read-only mapping
- A new entity `AppDetail`, in `iErp.Entities`, has string properties for the seven columns. It is configured with `ToTable("APPDETAILS", t => t.ExcludeFromMigrations())`, keyed on `USER_APPID`.
- An `AppDetailsRepository`, or a method on `ILoginRepository`, reads the matching rows `AsNoTracking`. It has no row limit: `USER_APPID` is the key, and a `Take(n)` is sent as a bind (`FETCH FIRST :p ROWS ONLY`) that the Oracle 10g rewrite does not handle (found in the live check). Several rows would still be a failure.
- Confirmed by a read-only check of the column definitions (task 1.1): the seven columns are strings.
  - `USER_APPID` NVARCHAR2(80), not null; `USER_CODE` NVARCHAR2(30); `USER_PASSWORD` NVARCHAR2(100); `USER_COMPANY_CODE` NVARCHAR2(20); `USER_BRANCH_ID` and `USER_YEAR_ID` NVARCHAR2(80); `USER_LOGGED_OUT` CHAR(1).
  - The table has further columns this change does not use (`USER_HIDE_MENU`, `USER_DEVICEID`, `USER_IP`, record audit columns); they are not mapped.
  - Every existing `USER_APPID` is a 36-character random id, unique, and not a `USERM.USER_PKID`. So `appId` is limited to 80 characters.
- An empty migration records the snapshot, as in `MenuRightsReadOnlyMapping`.

### D6. Frontend: a route guard runs the automatic login before the login screen exists
- **Where.** `autoLoginGuard` is a `canActivate` guard on the login route (`features/admin/login/auto-login.guard.ts`). It runs before the login screen is created, so the screen is never drawn during a successful automatic login. The user asked for this after the first version, which showed the form disabled with "Logging in…" while the request ran.
- **Starting it.** Without an `appid` parameter the guard lets the login screen open. With a non-blank one it calls `LoginService.autoLogin(appId)`, which posts to `admin/login/auto` with the same `LOGIN_REQUEST` and `SKIP_ERROR_NOTIFICATION` context and starts the session on success. A blank one redirects to `/login` and sends nothing.
- **While in flight.** Nothing is drawn: the navigation is pending, and the page stays blank until the guard answers.
- **Result.** On success the guard returns a `RedirectCommand` to `/`. On any failure it shows one `notifications.warn('Automatic login failed. Please log in.')` and returns a `RedirectCommand` to `/login`. Both use `replaceUrl`, so the address with the id is replaced and not kept in the history.
- **Alternative considered.** Starting it from `LoginPage` (the first version) always drew the login screen first, which the user did not want.
- **Remember me.** It is neither read for sending nor written.
- **A tab with a session.** `guestGuard` (on `/login`) normally sends a logged-in tab to `/`. For a URL with `appid` it ends the session instead and lets `/login` open, so the automatic login runs. The user chose this after a logged-out link seemed to log in: the tab had kept its earlier session and the id was never sent.
- **The parameter name.** It is `appid` (lower case), as in the document's User Interface section.

## Risks / Trade-offs

- **[Guessable id]** Anyone who has the link, or who guesses a `USER_APPID` of a user with `USER_LOGGED_OUT` = 'N', is logged in as that user, possibly an administrator. This was accepted by the user. The existing ids are 36-character random ids, which makes guessing impractical; the link itself is the main exposure.
  - Mitigations within scope:
    - one generic answer;
    - no id in the logs;
    - the id is removed from the address bar.
  - Recommended follow-ups, if the old system can support them: a one-time or time-limited id, or a random token in place of the row id, plus rate limiting on the endpoint.
- **[Plain-text password in `APPDETAILS`]** The password is readable by anyone with database access. This is outside this application's control, and it is never logged or returned.
- **[Logout does not end the link]** Logging out of the new software leaves `USER_LOGGED_OUT` = 'N', so the same link logs in again. This was accepted by the user. Only the old system ends it.
- **[Link in the old system's history]** The link with the id may stay in the history of the browser or tool that opened it. → The new software removes it from its own address bar. The old system should open the link in a way that does not keep it.
- **[Column types unknown]** → They are confirmed by the read-only schema check in task 1.1, before any mapping is written.

## Migration Plan

- There is no data migration. The new empty EF migration only updates the model snapshot, and `APPDETAILS` is excluded from migrations.
- Rollback: revert the change. Nothing in the database needs undoing.
