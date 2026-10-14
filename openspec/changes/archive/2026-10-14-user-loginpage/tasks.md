# Tasks

## 1. Legacy tables and mapping

- [x] 1.1 Inspect the dev Oracle schema (ICARDATA) for `USERM` and `YEARM`, read-only:
  - Read their columns, types, lengths and nullability from `USER_TAB_COLUMNS`, and check whether they have `REC_DELETED_DATE` or another delete or active flag.
  - Confirm that `USERM.REC_COMPANY_CODE` and `YEARM.REC_COMPANY_CODE` hold `COMPANYM.COMP_CODE` (a join count against companies, not values) and that `USER_BRANCH_ID` holds a branch `COMP_PKID`.
  - Check the password format without printing any value: run `SELECT MIN(LENGTH(USER_PASSWORD)), MAX(LENGTH(USER_PASSWORD)), COUNT(DISTINCT LENGTH(USER_PASSWORD))`, and use a `REGEXP_LIKE` count for hex or base64-only values.
  - Check whether `USER_NAME` is unique per company.
  - Record the findings in `design.md` (Context / D2 / D3).
  - **Stop and ask the user** if the passwords look hashed or encrypted, or if the company-code link differs from the assumption.
  - Verify: the findings section exists in `design.md` and states each point.
- [x] 1.2 Add the `User` (`USERM`) and `FinancialYear` (`YEARM`) entities to `iErp.Entities`, and `UserConfiguration` / `FinancialYearConfiguration` to `iErp.Data/Configurations`. Use `ExcludeFromMigrations`, explicit upper-case columns, string keys with `ValueGeneratedNever`, and the lengths from 1.1. Add `ParentId` (`COMP_PARENT_ID`) to `Company` only if 1.1 shows the branch must be checked against the company. Verify with `dotnet build backend/iErp.sln`.
- [x] 1.3 Run `dotnet ef migrations add UserYearReadOnlyMapping -p iErp.Data -s iErp.Api`. Keep it only if it is snapshot-only with empty `Up`/`Down`; delete it if EF reports no change. Verify that `dotnet ef migrations script` contains no `USERM`, `YEARM` or `COMPANYM` statement.
- [x] 1.4 Add Oracle-gated `[OracleFact]` integration tests, following `CompanyTableTests`. If the tables are absent, create `USERM`/`YEARM`-shaped tables in the test schema; otherwise read only. Read a user, a branch and the latest year through `AppDbContext`, check that applying migrations leaves the tables unchanged, and check that the `UPPER`/`TRIM` match and the `ORDER BY ... FETCH FIRST` query run on 10.2. Verify with `dotnet test` both with and without `IERP_TEST_ORACLE`.

## 2. Backend login module

- [x] 2.1 Create `iErp.Admin` from `iErp.ModuleTemplate`'s csproj, add it to `iErp.sln`, and add `AdminRegistration.AddAdmin()` (validators assembly scan, scoped service and repository). Reference it from `iErp.Api`, call `AddAdmin()`, add the application part, and add the assembly to `DependencyRuleTests.Modules`. Verify that `dotnet build` and the architecture tests pass.
- [x] 2.2 Add `Microsoft.AspNetCore.Authentication.JwtBearer` 9.0.x to `Directory.Packages.props` and reference it from `iErp.Admin` and `iErp.Api`. Add `iErp.Shared/Auth`: `JwtOptions` (Issuer, Audience, SigningKey of at least 32 bytes, LifetimeMinutes = 480), `SessionClaims` (claim names) and `ICurrentSession`. Verify with `dotnet build` and with the architecture test that Shared references no project.
- [x] 2.3 Implement `Login/` in `iErp.Admin`:
  - `LoginRequest` and `LoginRequestValidator`: required, not blank, and max lengths from 1.1.
  - `ILoginRepository`/`LoginRepository`: `AsNoTracking` queries that match the user by `UPPER(TRIM())` name and company code, the company by code with type `C` and not deleted, the branch by id with type `B` and not deleted, and the latest year by `YEAR_START_DATE` descending.
  - `ILoginService`/`LoginService`:
    - fixed-time password comparison, with a dummy compare when the user is not found;
    - a duplicate match is treated as failure and logged;
    - result outcomes `Success`, `InvalidCredentials`, `NoBranch` and `NoYear`;
    - builds the JWT with the D5 claims and the expiry.
  - `LoginResponse`/`SessionDto`.
  - `LoginController` (`POST /api/admin/login`, `[AllowAnonymous]`): returns 200, a 401 problem with "Invalid user name, password or company code.", or a 403 problem with the branch or year message.
  - Log failures without the password.
  
  Verify with the unit tests in 2.5.
- [x] 2.4 Wire authentication in `iErp.Api/Program.cs`:
  - bind `JwtOptions` with `ValidateOnStart` and the length check;
  - `AddAuthentication().AddJwtBearer(...)` validating the issuer, audience, lifetime (1-minute skew) and signing key, with an `OnChallenge` that writes `ApiProblem` 401 "Authentication is required.";
  - a fallback policy that requires authenticated users;
  - `UseAuthentication`/`UseAuthorization` before `MapControllers`;
  - `IHttpContextAccessor` and the claims-backed `ICurrentSession`;
  - the Swagger Bearer scheme.
  
  Add `Jwt` settings without a key to `appsettings.json`, and a fixed test key to `appsettings.Testing.json`. Put the dev key in the git-ignored local file or user secrets, and document that. Verify that the API refuses to start in Development without the key, with a message naming `Jwt:SigningKey`, and that it starts with the key.
- [x] 2.5 Add tests in `iErp.Tests/Admin` and `Integration`:
  - Validator tests: each field required, blank, too long.
  - Service tests with a fake repository:
    - success maps every session field and the token's claims and expiry;
    - case and space handling;
    - an exact password match is required;
    - unknown user, wrong password and unknown company give the same outcome;
    - duplicate users fail;
    - no branch and no year are reported as such.
  - Endpoint tests through `ApiFactory`:
    - 200 shape;
    - 401 problem with the fixed message, identical for each failure kind;
    - 403 messages;
    - 400 field errors;
    - 405 for GET;
    - no token needed;
    - a log sink check that the password never appears.
  
  Verify with `dotnet test backend/iErp.sln`.
- [x] 2.6 Add protection tests and update the existing ones:
  - `ApiFactory.CreateAuthenticatedClient()` signs a token with the Testing key.
  - `CompaniesEndpointTests` and `PipelineTests` use it, and new tests cover these companies-endpoint cases:
    - no token → 401 problem;
    - expired token → 401;
    - wrong-signature token → 401;
    - valid token → unchanged 200.
  - An `ICurrentSession` test reads the claims of the request's token.
  
  Verify with `dotnet test backend/iErp.sln` (all green).
- [x] 2.7 Run the API against the dev database:
  - log in through Swagger with a real user and get 200 with the session and the token;
  - `GET /api/reports/companies` without the token gives 401, and with it gives 200;
  - a wrong password gives the 401 message.
  
  Then update `kb/architecture/backend.md`: the `iErp.Admin` module, protected by default with `[AllowAnonymous]` for login only, `ICurrentSession`, the `Jwt` settings and where the key lives, test tokens, and the `USERM`/`YEARM` read-only mappings. Verify the doc against the code.

## 3. Frontend session core

- [x] 3.1 Add `core/auth/auth-session.ts` (root `AuthSession`):
  - a `session` signal with `isLoggedIn` and `displayText`;
  - `start`/`end`;
  - persisted in `sessionStorage` under `ierp-session` inside try/catch;
  - an expired stored session is dropped on load.
  
  Verify with unit tests:
  - nothing stored → logged out;
  - start → stored and restored by a new instance;
  - expired → dropped;
  - storage throwing → still works in memory;
  - end → cleared.
- [x] 3.2 Add `core/auth/auth.guards.ts`: `authGuard` (`CanMatchFn`, a `UrlTree` to `/login`) and `guestGuard` (a `UrlTree` to `/`). Update `app.routes.ts`:
  - `login` at the top level with `guestGuard` and `loadComponent`;
  - the `Shell` parent with `canMatch: [authGuard]`;
  - `'**'` still redirects to `''`.
  
  Verify with router tests:
  - logged out, `/` and `/reports/companies` show `/login` and the company-list chunk is not loaded;
  - logged out, an unknown path goes to `/login`;
  - logged in, `/login` goes to `/`, and an unknown path goes to the Dashboard.
- [x] 3.3 Add `core/auth/auth-token.interceptor.ts` (Bearer on API-base requests while logged in, none on `admin/login`) and `core/auth/session-expiry.interceptor.ts`:
  - on a 401 from anything except `admin/login`, call `end()`, navigate to `/login` and show "Your session has expired. Please log in again." once;
  - mark the error with an `HttpContext` token so `httpErrorInterceptor` skips its toast.
  
  Register the order `apiBaseUrl → authToken → sessionExpiry → httpError` in `app.config.ts`. Verify with `HttpTestingController` tests:
  - the header is present or absent as expected;
  - a 401 ends the session, navigates and shows one message for two parallel failures;
  - a login 401 does not end anything and is toasted with its title;
  - other errors are unchanged.
- [x] 3.4 Update `kb/architecture/frontend.md`: `core/auth` (store, guards, interceptors and their order), the rule that the login page is the only route outside the shell, and the removal of "Not implemented on purpose: authentication, user menu, route guards". Update the "no authentication / no guards / no user menu" lines in `kb/platform/frontend.md`, `kb/platform/app-shell.md` and `kb/platform/backend.md` to point to this change. Verify that no doc still says authentication or guards are absent.

## 4. Login page

- [x] 4.1 Create `features/admin/login/`:
  - `login.service.ts`, route-provided: `login(request)` posts `admin/login`, has a `busy` signal, and calls `AuthSession.start` on success.
  - `login.page.ts/html`:
    - the centered panel with the application name via `appPageTitle`;
    - labelled User Name, Password and Company Code stacked vertically, using `hlmInput`/`hlmLabel`;
    - the password eye toggle inside the field on the right: `lucideEyeOff` when hidden, `lucideEye` when shown, `aria-label` "Show password"/"Hide password", `aria-pressed`, `type="button"`;
    - the Cancel (outline) and Login (primary, submit) row aligned right.
  - The typed reactive form: required plus a not-blank check, messages after touch or submit, Enter submits, Login disabled while busy, trimmed name and code sent, password cleared on failure, `/` on success. Cancel resets the fields, the messages and the toggle. (Superseded by 7.2: the password is no longer cleared and the page reports refused logins as warnings.)
  
  Verify with page tests for every scenario in the `user-login-page` spec:
  - order and labels, button position, no shell;
  - required messages, spaces only, no request when invalid;
  - hidden by default, toggle and its names, keyboard;
  - success navigation, Enter submits, no double submit, failure keeps values and clears the password;
  - Cancel reset.
- [x] 4.2 Add the login page to `clickable-cursor.spec.ts`. Check that `look-guard.spec.ts` passes (no color classes in the feature), then run `npm test -- --no-watch` and `npm run build`; the build should show the login page as its own lazy chunk.

## 5. Header session details and logout

- [x] 5.1 Update `shell.ts/html`:
  - after the brand link, a `ml-auto min-w-0` group showing the user name, `Company (Branch)` and the year, with `truncate`, the full text in `title`, and company and year hidden below `sm`;
  - then the theme button (its `ml-auto` removed);
  - then a ghost `lucideLogOut` button named "Log out" that calls `AuthSession.end()` and navigates to `/login` with `replaceUrl`.
  
  Replace the "has no user menu" test with the four-button assertion. Verify with shell tests:
  - text and order of the details before the theme switch;
  - the `title` holds the full text;
  - logout ends the session and shows `/login`;
  - Back after logout stays on login;
  - buttons still visible at 360px (class check).
  
  Then `npm test -- --no-watch` and `npm run build`.
- [x] 5.2 Note the header contents and the Logout button in the shell section of `kb/architecture/frontend.md`. Verify the doc matches `shell.html`.

## 6. End-to-end check

- [x] 6.1 Start the API (with the dev key) and `npm start`, then walk through this, recording any difference in the change:
  - open `/` logged out → login;
  - empty Login → three messages;
  - toggle the eye;
  - wrong password → message, password cleared;
  - correct login → Dashboard with `User   Company (Branch)   Year` before the theme switch;
  - Company List loads;
  - reload keeps the session;
  - log out → login, and Back stays on login;
  - corrupt the stored token or wait for expiry → the session-expired message;
  - both themes.
  
  Finally, `dotnet test backend/iErp.sln`, `npm test -- --no-watch`, `npm run build` and `openspec validate user-loginpage --strict` must all pass.

## 7. Login failure feedback

- [x] 7.1 Show every notification at the top right: `position="top-right"` on the `hlm-toaster` in `app.ts`. Verify with an `App` test (the toaster's position is top-right) and update the notifications section of `kb/architecture/frontend.md`.
- [x] 7.2 Login failures:
  - The login request also carries `SKIP_ERROR_NOTIFICATION`.
  - The page shows 401 and 403 as `notifications.warn` with the backend's message, and network and server failures as `notifications.error`; a 400 puts its messages under the fields.
  - No field is cleared; remove the password reset and the submitted-flag reset.

  Verify with the service test (both context tokens) and page tests:
  - one warning and no error for 401 and 403;
  - all three values kept, including the password;
  - error for network and 5xx;
  - field errors without a notification.

  Update the Forms and notification notes in `kb/architecture/frontend.md` (the exception for a refused login).
- [x] 7.3 In the browser (API and dev server against the dev database), a wrong password shows one warning at the top right and keeps all three values, and the session-expired message also appears at the top right. Then `npm test -- --no-watch`, `npm run build` and `openspec validate user-loginpage --strict` must all pass.

## 8. Login and header wording

- [x] 8.1 Login screen: the title "Login" (via `appPageTitle`); the labels User, Password and Company; the messages "User is required." and "Company is required." (the API fields stay `userName` and `companyCode`). Verify with the page tests for the title, labels and messages, `npm test -- --no-watch`, and the look guard.
- [x] 8.2 Header:
  - The brand link shows the logged-in company's name, falling back to "Cargomar Pvt Ltd" without a session.
  - The right-hand group shows user, branch and year, with `title` and the screen-reader text in the same order; the branch and year are hidden below `sm`.
  - `AuthSession.details()` returns `{ user, branch, year }` plus the company for the title.

  Verify with the `AuthSession`, shell and clickable-cursor tests: the company title, the fallback, the link still opening the Dashboard with the same look, and the order user, branch, year.
- [x] 8.3 Docs: the shell and login notes in `kb/architecture/frontend.md`, and the User Interface line of `kb/modules/admin/login-screen.md` that describes the header (only that line: the company name as the main title at the top left; user, branch and FY at the right). Verify the docs match the screens.
- [x] 8.4 `npm test -- --no-watch`, `npm run build` and `openspec validate user-loginpage --strict` pass, and a browser check against the running API shows the login title and labels and, after a login, the company title and user, branch and FY.

## 9. Button order and header colors

- [x] 9.1 Login screen: Login before Cancel in the button row (Login stays the primary submit button). Verify with a page test that Login comes before Cancel.
- [x] 9.2 Header colors: add `--header-company`, `--header-user`, `--header-branch` and `--header-year` (light and dark values, year = `--foreground`) and their `--color-header-*` Tailwind entries in `styles.css`; apply them in `shell.html` (title light red; user bold blue; branch red; year bold). Verify with shell tests for the classes on the title, user, branch and year, and that the title keeps its weight with no hover color change.
- [x] 9.3 Docs: the header and login notes in `kb/architecture/frontend.md`.
- [x] 9.4 `npm test -- --no-watch`, `npm run build` and `openspec validate user-loginpage --strict` pass, and a browser check in both themes shows the button order and the header colors.

## 10. Log in with the user code

- [x] 10.1 Backend: `LoginRequest.UserCode` (validator: required, not blank, max 15), the repository matches `UPPER(TRIM(USER_CODE))` with the company code, the service and its logs use the code, and the 401 message is "Invalid user code, password or company code.". Verify with `LoginRequestValidatorTests`, `LoginServiceTests` and `LoginEndpointTests` (`dotnet test`, Oracle tests off).
- [x] 10.2 Frontend: the login model, service and page use `userCode` (form control, request body, field errors); the label stays "User", the message "User is required." and `autocomplete="username"`. Verify with the service and page tests, `npm test -- --no-watch` and `npm run build`.
- [x] 10.3 Docs: the login notes in `kb/architecture/backend.md` and `kb/architecture/frontend.md`.
- [x] 10.4 `openspec validate user-loginpage --strict` passes, and a read-only login through the running API with a user code succeeds (and the same user's name no longer logs in).

## 11. Remember me

- [x] 11.1 Generate the Spartan checkbox into `shared/ui/checkbox` (as for dialog and select) with its `@spartan-ng/helm/checkbox` path in `tsconfig.json`. Verify with `shared/testing/checkbox.spec.ts`: it binds to a reactive form control, toggles on click, on its label and on Space, and exposes `role="checkbox"` and `aria-checked`.
- [x] 11.2 Add `features/admin/login/remembered-login.ts` (`read`/`save`/`forget` on `ierp-login-remembered`, try/catch, shape check). Verify with unit tests:
  - nothing stored → null;
  - save → read back;
  - forget → null;
  - malformed JSON or a wrong shape → null;
  - storage throwing → null and no exception.
- [x] 11.3 Login page: the Remember me checkbox below Company, filled from `read()` on open, `save`/`forget` after a successful login, nothing on a failure, and Cancel leaving it as is. Verify with page tests for every Remember me scenario and the updated layout and Cancel scenarios. Add the checkbox and its label to `clickable-cursor.spec.ts`. Check that the look guard passes.
- [x] 11.4 Docs:
  - Add the Remember me note and the `ierp-login-remembered` key, with the plain-text-password warning, to the login notes in `kb/architecture/frontend.md`.
  - Add a Change History line to `kb/modules/admin/login-screen.md`.
- [x] 11.5 `npm test -- --no-watch`, `npm run build` and `openspec validate user-loginpage --strict` pass. A browser check against the running API (a read-only login with the test user) shows:
  - ticking the box, logging in and logging out → the login screen is pre-filled;
  - unticking it and logging in → the entry is gone from localStorage;
  - a wrong password → nothing stored.
