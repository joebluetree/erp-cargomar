# Proposal

## Why

`kb/modules/admin/login-screen.md` (BRS v1.0, BR-001) asks for a login screen. The user enters a user code, a password and a company code. The system checks them against the database and then works in the context of the user's company, default branch and the company's latest financial year. Today the ERP has no authentication at all: every screen and every API is open, and nothing records who is working or for which company. Every later business screen depends on knowing the user, company, branch and year, so login has to come first.

## What Changes

- **Login endpoint** (`POST /api/admin/login`). It checks the credentials against the existing Oracle tables `USERM` (user code, password, company code; the code rather than the name, revised at the user's request), `COMPANYM` (the company with `COMP_TYPE='C'` and the user's default branch with `COMP_TYPE='B'`) and `YEARM` (the latest financial year of the company). On success it returns the session details: user code and name, company id, code and name, branch id and name, and year id, code and name. It also returns a signed access token (JWT) that carries these details. On failure it returns one generic message that does not reveal which value was wrong.
- **BREAKING: every other API requires login.** Every API except login now requires a valid token and answers 401 without one. This includes the existing `GET /api/reports/companies`. The backend can read the logged-in user, company, branch and year from the token through one shared accessor (`ICurrentSession`), so later screens can scope their data. This change does not scope any existing data: the Company List is unchanged.
- **Login screen** (`/login`, shown outside the app shell). Under the title "Login", User, Password and Company are stacked vertically, all mandatory (BR-001.1). The password has an eye-icon show/hide toggle: closed eye means hidden, open eye means shown (BR-001.2, BR-001.S1). Login and Cancel buttons sit at the bottom right, Login first (revised at the user's request). Cancel clears the form. A successful login opens the Dashboard. Below Company is a "Remember me" checkbox (added at the user's request). If it is ticked when a login succeeds, the browser remembers the user code, password and company code and fills them in the next time the login screen opens. If it is unticked when a login succeeds, the saved entry is deleted.
- **Logged-in frontend.** Every route inside the shell requires a session, and without one the user is sent to `/login`. The token is added to every API request. A 401 from any API other than login ends the session and returns the user to `/login`. The session survives a browser reload in the same tab (sessionStorage) and ends when the tab is closed.
- **Header.** The header's main title at the top left is the logged-in company's name. The session details are at the top right, before the theme toggle, as `User   Branch   Year` (revised at the user's request). Colors, also at the user's request: the company title light red, the user name bold blue, the branch red, the year bold in the text color (black in the light theme). A Logout button ends the session and returns to `/login`.
- **New backend module** `iErp.Admin` with a `Login` feature folder, plus the JWT bearer setup in the API host. The signing key, issuer and token lifetime come from configuration; no secret is committed.
- **Docs.** `kb/architecture/backend.md` and `kb/architecture/frontend.md` describe the authentication conventions. The platform PRDs that state "no authentication / no user menu / no guards" (`kb/platform/app-shell.md`, `kb/platform/frontend.md`, `kb/platform/backend.md`) are updated to point to this change.

### Assumptions (recorded because the BRS is silent)

- **Passwords are compared as text for now.** `USERM.USER_PASSWORD` turned out to hold encrypted values (task 1.1). At the user's request, the typed password is compared with the stored value directly (exact, case-sensitive, constant time) until the legacy algorithm and key are supplied. Until then real passwords do not work. Locked or deleted users cannot log in.
- The user code and company code are trimmed and matched ignoring letter case; the password is neither trimmed nor case-folded. `USERM.REC_COMPANY_CODE` is assumed to hold the company's `COMP_CODE`; the first task confirms this against the data.
- The company code must belong to an existing, not deleted company row (`COMP_TYPE='C'`). The default branch is the `COMPANYM` row whose `COMP_PKID` equals `USERM.USER_BRANCH_ID`. The latest financial year is the `YEARM` row for that company code with the latest `YEAR_START_DATE`. Rows marked deleted (`REC_DELETED_DATE`) are ignored wherever that column exists.
- If the credentials are right but the user has no valid default branch, or the company has no financial year, login is refused with a message that names the missing setup (403). Without a branch and a year the user could not work.
- Failed logins are not counted, users are not locked out, and failures are not rate-limited (not in the BRS). Failed attempts are logged without the password.
- The token lasts 8 hours (configurable) and is not refreshed. When it expires, the next API call returns 401 and the user logs in again.
- Logout only discards the session in the browser; the backend keeps no session list, so there is no logout endpoint.
- A refused login (401 or 403) shows the backend's message as a warning notification; the form keeps every typed value, including the password (revised at the user's request). All notifications of the application appear at the top right of the window.
- Remember me keeps the three values in the browser's `localStorage` on that PC, **including the password in plain text**. The user chose this after being told the risk; the browser's password manager was the alternative offered. The values are saved only after a successful login with the box ticked, and they are never sent anywhere except in a login request. Remember me does not keep the session: closing the tab still ends it. Logout, session expiry and Cancel do not forget the values.
- Only one company, branch and year per login; switching company, branch or year in the header is out of scope.

## Capabilities

### New Capabilities

- `user-login-api`: the login endpoint. It covers credential checking against `USERM`, `COMPANYM` and `YEARM`, the returned session details and token, the failure responses, and the read-only mapping of the legacy tables in the new `iErp.Admin` module.
- `user-login-page`: the login screen. It covers its fields, the mandatory validation, the password visibility toggle, the Login and Cancel actions, and the error and busy states.
- `user-session`: the logged-in state across the application. It covers token-protected APIs and the `ICurrentSession` accessor on the backend; on the frontend it covers the session store, the route guard, the token interceptor, handling a 401 after expiry, keeping the session on reload, the header session details and logout.

### Modified Capabilities

- `app-shell`: four requirements change.
  - "Shell layout on every page": the header now shows the session details and a Logout button, and the "No user menu" scenario is removed.
  - "Routing inside the shell": routes inside the shell are now guarded, and `/login` is displayed outside the shell.
  - "Navigation menu" and "Responsive sidebar": unchanged.
- `frontend-error-handling`: "User notifications" now fixes their place: the top right corner of the window, on every screen.
- `frontend-app-foundation`: "Small, focused HTTP interceptors" no longer forbids authentication; adding the token is its own interceptor. "Lazy-loaded features" no longer forbids route guards.

## Impact

- **Backend.**
  - New project `iErp.Admin`, added to `iErp.sln` and to the architecture-test module list. Its `Login/` folder holds the controller, service, repository, validator and DTOs.
  - New read-only entities and configurations (`User` → `USERM`, `FinancialYear` → `YEARM`). `Company` gains `ParentId` if the branch has to be checked against its company.
  - `iErp.Shared` gains `Auth/` (`JwtOptions`, claim names, `ICurrentSession`).
  - `iErp.Api` gains the authentication and authorization setup, a fallback policy that requires login, `[AllowAnonymous]` on login, and the Swagger bearer scheme.
  - New package `Microsoft.AspNetCore.Authentication.JwtBearer` 9.0.x.
  - Existing endpoint tests need a test token.
- **Frontend.**
  - New `core/auth` (session store, guard, token interceptor, 401 handling) and a new lazy feature `features/admin/login`.
  - Route changes: `/login` outside the Shell, and a guard on the Shell parent.
  - Shell header gains the session details and Logout; the `shell.spec.ts` assertion "no user menu" is replaced.
  - New lucide icons: `lucideEye`, `lucideEyeOff`, `lucideLogOut`.
  - New shared `shared/ui/checkbox` (the Spartan helm checkbox) for Remember me.
- **Database.** Reads `USERM`, `YEARM` and `COMPANYM` only. No DDL and no migration beyond the empty snapshot pattern.
- **Configuration.** A `Jwt:SigningKey` must be provided per environment (user secrets, local settings or environment variables). The API refuses to start without it, except in Testing, which uses a test key.
- **Order.** The `app-shell` delta builds on the still-open `reports-company-list` change, which must be archived first.
