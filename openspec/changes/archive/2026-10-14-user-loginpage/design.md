# Design

## Context

See proposal.md for the motivation and the recorded assumptions. The state of the code that shapes the approach:

**Backend**
- .NET 9 modular monolith using EF Core 9 with `Oracle.EntityFrameworkCore`, running against Oracle 10.2.
- Projects: `Api` (host) → modules (`Reports`, `ModuleTemplate`) → `Data` / `Entities` / `Shared`. Architecture tests in `iErp.Tests/Architecture/DependencyRuleTests.cs` enforce these dependencies, and the module list in them is hard-coded.
- Legacy tables are mapped read-only with `ExcludeFromMigrations()`, upper-case column names and string keys, as `CompanyConfiguration` does for `COMPANYM`. Repositories for such tables use `AppDbContext` directly; the Guid-keyed `Repository<T>` does not fit them.
- `Oracle10gCompatibilityInterceptor` already rewrites `FETCH FIRST n ROWS ONLY`, so `FirstOrDefaultAsync` and `Take(1)` are safe on 10g.
- There is no authentication, CORS or session anywhere. `Program.cs` runs `UseExceptionHandler` → Serilog → Swagger → `MapControllers`.
- Errors are RFC 7807 through `ApiProblem` and `GlobalExceptionHandler`. Validation goes through `ValidationFilter` with FluentValidation.
- Endpoint tests use `ApiFactory`, a `WebApplicationFactory` in the "Testing" environment, with NSubstitute fakes for repositories. Database tests are `[OracleFact]` and are skipped without `IERP_TEST_ORACLE`.

**Frontend**
- Angular 22: standalone, zoneless, Spartan helm components under `shared/ui`, lucide icons, Vitest.
- `app.routes.ts` has one `Shell` parent with lazy children and a `'**'` redirect to `''`.
- Interceptors: `apiBaseUrlInterceptor` and `httpErrorInterceptor`. The latter toasts a failure, using the problem `title` for 4xx other than 400/404, and skips 400s that carry field errors.
- The look-guard tests forbid color classes in `features/`. They do not cover `shell/`, so the header may use the named header color tokens (D10).
- `shell.spec.ts` asserts that the header contains exactly three buttons ("no user menu").

**Data** (from the BRS)
- `USERM`: `USER_PKID`, `USER_CODE`, `USER_NAME`, `USER_PASSWORD`, `REC_COMPANY_CODE`, `USER_BRANCH_ID`.
- `YEARM`: `YEAR_PKID`, `YEAR_CODE`, `YEAR_NAME`, `YEAR_START_DATE`, `YEAR_END_DATE`, `REC_COMPANY_CODE`.
- `COMPANYM` is already mapped; it holds companies (`C`) and branches (`B`).
- The column types and lengths, the soft-delete columns and the password format are not documented. Task 1.1 confirms them.

### Schema findings (task 1.1, dev schema ICARDATA on Oracle 10.2.0.1, read-only)

**`USERM`** (439 rows)
- Columns used:
  - `USER_PKID` NVARCHAR2(40 chars), not null;
  - `USER_CODE` (15);
  - `USER_NAME` (30);
  - `USER_PASSWORD` (50);
  - `REC_COMPANY_CODE` (10);
  - `USER_COMPANY_ID` (40);
  - `USER_BRANCH_ID` (40).
- Lengths are in characters; `user_tab_columns.data_length` reports bytes, two per NVARCHAR2 character.
- Login key (revised at the user's request, 2026-10-13, checked read-only on ICARDATA2): the User field is matched against `USER_CODE`, not `USER_NAME`. `USER_CODE` is set on all 440 rows, unique per company (`UPPER(TRIM(code))` + company), and 2–14 characters long. 37 codes repeat across companies, which is harmless because the company code is part of the match. `USER_NAME` is still read for display (header, token).
- Other relevant columns:
  - `USER_ISLOCKED` CHAR(1) and `REC_DELETED` CHAR(1): all `N` today;
  - `REC_DELETED_DATE` DATE: all null today;
  - `REC_BRANCH_CODE`;
  - `USER_OTP_ENABLED`.
- `REC_COMPANY_CODE` always equals the code of a live type-`C` company (AGA 11, CMR 8, CPL 381, SGT 39 users), and `USER_COMPANY_ID` always equals that company's `COMP_PKID`.
- `USER_BRANCH_ID`: 425 users have one, and each points at a type-`B` row whose `COMP_PARENT_ID` is the user's company. 14 users have none, so they would get the "No default branch" refusal.
- There are no duplicate (name, company) pairs, ignoring case and spaces.
- **Passwords are not plain text.**
  - Every value is valid base64: 305 values are 12 characters ending in `=` (8 bytes) and 134 are 24 characters ending in `==` (16 bytes).
  - Repeated values are common: 275 distinct among the 305.
  - This is the signature of an 8-byte block cipher (DES or Triple-DES, PKCS7 padding, no salt or IV) applied to the password and then base64-encoded. It is not a hash.
  - Comparing the input to the stored value as text cannot work. D3 is on hold until the key and algorithm are known.

**`YEARM`**
- Columns:
  - `YEAR_PKID` NVARCHAR2(40), nullable;
  - `YEAR_CODE` NUMBER;
  - `YEAR_NAME` (25), e.g. "2024-2025";
  - `YEAR_START_DATE` and `YEAR_END_DATE` DATE;
  - `YEAR_CLOSED` CHAR(1);
  - `REC_COMPANY_CODE` (15).
- There is no delete column.
- Each of the 4 companies has 9 years, the latest starting 2026-04-01; 6 of each company's 9 are closed.
- `REC_COMPANY_CODE` always matches a company's `COMP_CODE`.

**`COMPANYM`**
- `COMP_CODE` NVARCHAR2(10). `COMP_PARENT_ID` (40) links a branch to its company.

## Goals / Non-Goals

**Goals:**
- One stateless login that results in a signed token. The token is the only proof of identity and of the company, branch and year context.
- Protection by default: new endpoints and new routes are covered without opting in.
- Keep the existing module, layering, error and look-and-feel conventions; this is the first module in the Admin domain.

**Non-Goals:**
- User maintenance, password change or reset, hashing a password store that is plain today, lockout, rate limiting, refresh tokens, server-side session revocation, role or permission checks, switching company, branch or year after login, and data scoping of existing screens.

## Decisions

### D1. Module `iErp.Admin`, feature folder `Login/`
- The BRS domain is Admin, and the planned Company and User Masters belong there too, so the login sits in a new module `iErp.Admin`.
- It is built from `iErp.ModuleTemplate`'s csproj, with its registration in `AdminRegistration.AddAdmin()` and an application part in `Program.cs`. It is added to `DependencyRuleTests.Modules`.
- Route: `POST /api/admin/login`, following the `api/<area>/<resource>` convention.
- Files:
  - `LoginController`: `[AllowAnonymous]`, one service call.
  - `LoginRequest` and `LoginRequestValidator`.
  - `ILoginService` / `LoginService`: matching, comparison, building the token.
  - `ILoginRepository` / `LoginRepository`: three small read-only queries.
  - `LoginResponse` and `SessionDto`.
- *Alternative:* put the login in `iErp.Api`. Rejected: it is business logic over business tables, and the architecture rules keep `Api` as a thin host.

### D2. Mapping the legacy tables
- New entities in `iErp.Entities`:
  - `User` (`USERM`: `Id`, `Code`, `Name`, `Password`, `CompanyCode`, `BranchId`, plus `DeletedDate` if the column exists);
  - `FinancialYear` (`YEARM`: `Id`, `Code`, `Name`, `StartDate`, `EndDate`, `CompanyCode`, plus `DeletedDate` if it exists).
- Configurations follow `CompanyConfiguration`: `ToTable(..., t => t.ExcludeFromMigrations())`, explicit upper-case columns, string keys with `ValueGeneratedNever()`, and lengths taken from the real schema (task 1.1).
- A migration is added only if EF reports model changes, and then it is a snapshot-only migration with empty `Up`/`Down`, as in `CompanyReadOnlyMapping`.
- The repository reads with `AsNoTracking()` and makes three queries:
  1. the user by `UPPER(TRIM(USER_CODE))` and `UPPER(TRIM(company code))`;
  2. the company by code, with type `C` and not deleted;
  3. the branch by id, with type `B` and not deleted.
  
  The year is the company's row with `OrderByDescending(StartDate).FirstOrDefault()`.
- If the user code is not unique within a company (none is today), the query takes the rows and the service treats more than one match as a failed login. A duplicate is never silently picked; it is logged as a data error.
- Matching runs in SQL with `ToUpper()` and `Trim()`. EF translates these to `UPPER`/`TRIM`, which exist in 10g.

### D3. Password comparison
- **Interim decision (user, 2026-10-12): compare the typed password with `USER_PASSWORD` directly, as text.** Task 1.1 found that the stored values are encrypted (base64 of an 8-byte block cipher). Until the old system's algorithm and key are supplied, only the stored string itself logs in; users' real passwords do not.
- The comparison uses `CryptographicOperations.FixedTimeEquals` over the UTF-8 bytes, so it is exact and case-sensitive.
- Nothing about the password is ever logged.
- The check sits in one method (`PasswordMatches(stored, typed)`). Adding the legacy encryption later changes that method and its configuration only; the specs, the API and the frontend stay as they are.
- Users with `USER_ISLOCKED = 'Y'`, `REC_DELETED = 'Y'` or a `REC_DELETED_DATE` are treated as not found, so they get the generic 401.
- *Alternative:* compare in SQL (`WHERE USER_PASSWORD = :p`). Rejected: it ties the check to the storage format and sends the password into SQL logs if command logging is on.

### D4. Failure outcomes
- The service returns a result: `Success(session, token)`, `InvalidCredentials`, `NoBranch` or `NoYear`. The controller maps these to 200, 401 and 403.
- The fixed 401 message is "Invalid user code, password or company code.". Both 401 and 403 are `ApiProblem.Create` with the message as `title`, so the frontend's `toApiError` shows it.
- Unknown user, wrong password and unknown company share one code path that returns `InvalidCredentials`. When the user is not found, the service still runs a dummy fixed-time comparison, so the response time does not reveal whether the user code exists.
- *Alternative:* add exception types for `GlobalExceptionHandler`. Rejected: an expected outcome is not an exception, and the result type keeps the controller to one call and one switch.

### D5. Stateless JWT
- The token is HMAC-SHA256 signed and built with `JwtSecurityTokenHandler` (package `Microsoft.AspNetCore.Authentication.JwtBearer`, which brings `System.IdentityModel.Tokens.Jwt`).
- Claims:
  - `sub` = user id;
  - `ierp:user_code`, `name`;
  - `ierp:company_id`, `ierp:company_code`;
  - `ierp:branch_id`;
  - `ierp:year_id`.
- Display names stay out of the token: the login response carries them, and the frontend keeps them with the session.
- Options (`Jwt:Issuer`, `Jwt:Audience`, `Jwt:SigningKey` of at least 32 bytes, `Jwt:LifetimeMinutes` = 480) live in a `JwtOptions` class in `iErp.Shared/Auth`.
- The host binds the options with `ValidateOnStart`, so startup fails if the key is missing or short.
  - `appsettings.Testing.json` holds a fixed test key; it protects nothing.
  - Development reads the key from user secrets or the git-ignored local settings file.
- Token creation lives in `iErp.Admin`. Validation is configured in `iErp.Api` with the same options: `ValidateIssuer`, `ValidateAudience`, `ValidateLifetime` with a 1-minute clock skew, and `ValidateIssuerSigningKey`.
- *Alternatives:*
  - An HttpOnly cookie session: needs anti-forgery handling and is awkward with the dev proxy.
  - Server-side sessions: there is no session store, and they don't scale across instances.
  
  The user chose JWT.

### D6. Protect by default
- `Program.cs` adds:
  - `AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer()`, configured by `ConfigureJwtBearer` from `JwtOptions`;
  - `AddAuthorization()`;
  - `UseAuthentication()` and `UseAuthorization()`;
  - `app.MapControllers().RequireAuthorization()`.
- Applied during implementation: login is required on the controller endpoints instead of through an authorization fallback policy. A fallback policy also covered ASP.NET's built-in "method not allowed" endpoint, so `GET /api/admin/login` answered 401 instead of the specified 405. Every controller, including any added later, still requires a token without opting in.
- The login is the only endpoint marked `[AllowAnonymous]`.
- The 401 body: `JwtBearerEvents.OnChallenge` writes `ApiProblem.Create(401, "Authentication is required.")`, so it matches the RFC 7807 rule.
- Swagger gets a Bearer security scheme so developers can authorize in the UI. Swagger itself is not behind authentication; it is middleware, not an MVC endpoint.
- Tests: `ApiFactory` gains a helper `CreateAuthenticatedClient()` that signs a token with the Testing key. `CompaniesEndpointTests` and `PipelineTests` use it, and new tests check 401 without a token.
- `TestEndpointsController` is anonymous only if its pipeline tests need that; the default is protected.

### D7. `ICurrentSession`
- The interface lives in `iErp.Shared/Auth`: `UserCode`, `CompanyId`, `CompanyCode`, `BranchId`, `YearId`, and `IsAuthenticated`.
- The `HttpContext`-backed implementation reads the claims through `IHttpContextAccessor` and is registered in the host.
- Modules depend only on the interface, which keeps the dependency rules intact.
- Nothing uses it yet beyond a test. It exists so that the next screen can scope its data without touching authentication.

### D8. Frontend session (`core/auth`)
- **`AuthSession`** (root service).
  - Holds a `session` signal (token, `expiresAt`, user code and name, company id, code and name, branch id and name, year id, code and name), plus `isLoggedIn` and `displayText` computeds.
  - `start(session)`, `end()`.
  - Reads from and writes to `sessionStorage` under `ierp-session`, wrapped in try/catch. A stored session whose `expiresAt` has passed is dropped on load.
  - It is a `core` service and not a feature service, because the guard, the interceptor and the shell all need it.
- **`authGuard`**.
  - A `CanMatchFn` on the `Shell` parent route returns `true`, or a `UrlTree` to `/login`.
  - `canMatch`, not `canActivate`, so that lazy children are not downloaded for anonymous users. It also turns unknown paths, redirected to `''`, into `/login`.
  - `guestGuard` on `/login` sends a logged-in user to `/`.
- **`authTokenInterceptor`**: adds `Authorization: Bearer` to requests that go to the API base URL while a session exists. It runs after `apiBaseUrlInterceptor` and does not touch the login request.
- **`sessionExpiryInterceptor`**: on a 401 from any request except `admin/login`, it calls `end()`, navigates to `/login` and shows "Your session has expired. Please log in again.". It swallows the 401 toast so the generic error toast is not shown as well.
  - Implementation, as built: both mechanisms are needed. The expiry interceptor is registered after `httpErrorInterceptor`, so it sees the raw `HttpErrorResponse` first (responses run in reverse order). It sets the general `SKIP_ERROR_NOTIFICATION` `HttpContext` token (in `core/errors`), which `httpErrorInterceptor` checks.
  - The login request is marked with the `LOGIN_REQUEST` `HttpContext` token (in `core/auth`), set by the login feature service. Core therefore never needs the login URL.
  - Only the first 401 shows the message: the session is ended then, and later 401s find no session.
- Order in `app.config.ts`: `apiBaseUrl` → `authToken` → `httpError` → `sessionExpiry`.
- *Alternatives:*
  - localStorage: the session would survive closing the tab and be shared across tabs. The user chose the tab session.
  - Keeping the token in memory only: a reload would log the user out.

### D9. Login feature (`features/admin/login`)
- Route: `{ path: 'login', canMatch: [guestGuard], loadComponent: ... }` at the top level, before the `Shell` parent.
- `LoginService` is provided on the route. It posts to `admin/login`, has a `busy` signal, and calls `AuthSession.start` on success. This keeps the rule that only a feature service talks to the backend.
- `LoginPage` holds a typed, non-nullable reactive form with three controls and `Validators.required` plus a no-blank check. Messages show when a control is touched or after a submit attempt.
  - The password `type` is bound to a `showPassword` signal.
  - The toggle is a ghost icon button inside a `relative` wrapper on the right of the input. It shows `lucideEyeOff` (hidden) or `lucideEye` (shown), has `aria-label` "Show password" or "Hide password" and `aria-pressed`, and has `type="button"` so it never submits.
  - The `<form>` uses `(ngSubmit)`, so Enter submits.
  - Buttons are in a `flex justify-end gap-2` row: Login (default variant, `type="submit"`, disabled while busy, with a spinner icon or the text "Logging in…") and then Cancel (`variant="outline"`, `type="button"`) (order revised at the user's request).
  - Cancel calls `form.reset()`, clears the submitted flag and sets `showPassword` to false.
  - Revised at the user's request: on failure nothing is cleared, and the page reports the failure itself.
    - The login request carries `SKIP_ERROR_NOTIFICATION` as well as `LOGIN_REQUEST`, so `httpErrorInterceptor` stays silent for it.
    - The page maps the `ApiError`: 401 and 403 become `notifications.warn(message)`, the backend's text; network and server failures become `notifications.error(message)`; a 400 puts its messages under the fields.
    - This is the one sanctioned exception to "features do not report failures themselves". A refused login is an expected outcome, shown as a warning, not a fault.
    - The earlier workaround that reset the submitted flag after the password was cleared is removed with the clearing.
  - On success: `router.navigateByUrl('/')`.
  - Remember me (added at the user's request):
    - A `remember` boolean control sits in the form below Company. It uses the shared Spartan `hlm-checkbox` with `hlmLabel` "Remember me" and id `login-remember`, and it is not sent to the API.
    - `RememberedLogin` (`features/admin/login/remembered-login.ts`, root) offers `read()`, `save({ userCode, password, companyCode })` and `forget()`. It works on `localStorage` key `ierp-login-remembered` as JSON, inside try/catch. A value that is not three strings is ignored.
    - The page patches the form from `read()` when it is created and ticks the box if there was an entry.
    - On a successful login it calls `save` with the values sent if the box is ticked, and `forget` if not. A failure does neither.
    - Cancel resets only the three fields, the messages and the toggle; `remember` keeps its value.
    - `localStorage` rather than `sessionStorage`, because the values must outlive the tab. The session itself stays in `sessionStorage` (D8).
- Layout: a full-height centered column with a bordered, rounded panel (max width about 24rem) whose title is "Login" (revised at the user's request). The labels are User, Password and Company, and the messages "User is required.", "Password is required." and "Company is required.". The API fields are `userCode` (max 15, revised at the user's request: the code, not the name), `password` (max 50) and `companyCode` (max 10); the form control for User is `userCode`, the label stays "User" and `autocomplete` stays `username`.
  - Only layout and neutral classes are used (`border`, `rounded-lg`, `p-6`, `text-muted-foreground`). The title uses the shared `appPageTitle`, so the look guard passes.
  - The page has no `<main>` of its own beyond what the root provides. Since it is outside the shell, it supplies its own centering container, as the one sanctioned exception.
- The theme switch is not on the login page. The theme still applies from storage at startup.

### D10. Header (`shell`)
- The brand link shows the session's company name (`AuthSession.session().companyName`), and "Cargomar Pvt Ltd" without a session; it keeps its look and its link to the Dashboard (revised at the user's request).
- After the brand link, add a `ml-auto flex min-w-0 items-center gap-4` group:
  - a `span` with the user name, a `span` with the branch name and a `span` with the year;
  - `truncate`, the full text in `title`, and `text-sm text-muted-foreground`;
  - the branch and year spans are hidden below `sm`, so narrow screens show the user name only. The `title` still carries everything.
- Then the existing theme button, with `ml-auto` moved to the group.
- Then a new ghost icon button, `aria-label="Log out"` with `lucideLogOut`, which calls `AuthSession.end()` and `router.navigateByUrl('/login', { replaceUrl: true })`.
- Colors (revised at the user's request): four theme tokens in `styles.css`, `--header-company` (light red), `--header-user` (blue), `--header-branch` (red) and `--header-year` (= `--foreground`, so black in the light theme and still readable in the dark one), each with a light and a dark value and exposed to Tailwind as `--color-header-*`.
  - The brand link uses `text-header-company` and keeps its size and weight, with no hover color change.
  - The user span is `font-semibold text-header-user`, the branch span `text-header-branch`, and the year span `font-semibold text-header-year`; they replace `text-muted-foreground`.
  - Contrast targets against the header background: at least 4.5:1 for the details, at least 3:1 for the large title.
- `shell.spec.ts`'s "no user menu" assertion becomes: the buttons are exactly Open menu, Hide navigation bar, Switch to … theme and Log out.

### D11. Docs
- `kb/architecture/backend.md`: the `iErp.Admin` module, the protected-by-default rule with `[AllowAnonymous]` as the exception, `ICurrentSession`, the JWT settings, and test tokens.
- `kb/architecture/frontend.md`: `core/auth`, the guard, the interceptors and their order, the login page as the only page outside the shell, the header contents, and notifications at the top right (`hlm-toaster position="top-right"` in `app.ts`).
- In the platform PRDs, replace the "no authentication / no guard / no user menu" lines with a pointer to this change.
- The login BRS stays as it is, apart from the Change History lines listing what was added.

## Risks / Trade-offs

- **[Plain-text passwords in `USERM`]** Comparing them keeps the legacy store's weakness. Mitigation: never log or return them, compare in fixed time, and keep the check in one method; hashing the store is a separate change. Task 1.1 stops the work if the format is not plain text.
- **[Column names, types or delete flags differ from the BRS]** Mitigation: task 1.1 reads `USER_TAB_COLUMNS` and samples a non-sensitive count before mapping, and records the differences here.
- **[Breaking: existing API clients get 401]** Only the Angular app calls the API today, and it is updated in the same change. Swagger users authorize with a token from the login.
- **[Token theft through XSS]** `sessionStorage` is readable by script. Mitigation: no `innerHTML` and Angular's default sanitization; an 8-hour lifetime. An HttpOnly cookie would be the follow-up if needed.
- **[Remembered password in plain text]** With Remember me ticked, the password sits unencrypted in `localStorage` on that PC, readable by anyone who uses that PC and by any script that runs on the page. It stays there until a successful login with the box unticked. The user accepted this; the browser's password manager was the safer alternative offered.
  - Mitigations:
    - the box is unticked by default, so it is opt-in;
    - values are stored only after a successful login;
    - they are never logged or sent anywhere except in a login request;
    - the same XSS protections as the token apply (see the token theft risk).
  - Follow-up if needed: remember the user and company only.
- **[Back-forward cache after logout]** Found in the end-to-end check (task 6.1): after a reload and a logout, Back could restore an older page from the browser's back-forward cache, still holding the ended session in memory (and the token is still valid on the server). Mitigation: `AuthSession` listens for `pageshow` with `persisted` and reloads the page when its in-memory session differs from `sessionStorage`; the guard then shows the login screen. This was verified in headless Chrome: the restored page reloads into `/login`.
- **[No server-side logout]** A token stays valid until it expires even after logout. Accepted for an internal ERP; a short lifetime limits it.
- **[Missing signing key in deployment]** Startup fails loudly (`ValidateOnStart`) rather than running unprotected.
- **[Archive order]** The `app-shell` delta's "Shell layout on every page" block includes the text from the still-open `reports-company-list` change. Archive that change first; if it is archived later, re-check this delta.

## Migration Plan

1. Deploy the backend with `Jwt:SigningKey` (and the issuer and audience if they are not the defaults) set in the environment, together with the frontend build. They must go out together, because the old frontend sends no token.
2. No database changes.
3. Rollback: redeploy the previous backend and frontend together.

## Open Questions

- The exact year text in the header: the BRS says `YEAR_NAME` is shown, so it is shown as stored (for example "2025-2026"). If the business prefers the code, it is a one-line change.
