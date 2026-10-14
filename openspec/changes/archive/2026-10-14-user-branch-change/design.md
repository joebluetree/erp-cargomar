# Design

## Context

- **Session today** (from `user-loginpage`):
  - The JWT carries `sub` (`USER_PKID`), `ierp:user_code`, `name`, `ierp:company_id`, `ierp:company_code`, `ierp:branch_id` and `ierp:year_id`. `MapInboundClaims = false`, so these names reach `ClaimsPrincipal` unchanged.
  - `ICurrentSession` (`iErp.Shared/Auth`) exposes all of them except the user id.
  - `LoginService` builds the token in a private `CreateToken`.
  - The frontend `AuthSession` keeps `{ token, expiresAt, …session }` in a signal and in sessionStorage (`ierp-session`); `start()` replaces it. The header reads `details()`.
- **Data** (checked read-only on ICARDATA2, 2026-10-13):
  - `USERD` has 1,000 rows for 428 users, up to 16 branches per user. Its columns are `USER_ID` and `USER_BRANCH_ID` (NVARCHAR2(40 chars)), plus `USER_RIGHTS_TOTAL`, `USER_DSC_SLNO`, `USER_ICEGATE_ID` and `USER_ICEGATE_PWD`.
  - There are no duplicate (user, branch) pairs and no orphan users or branches.
  - Every `USERM.USER_BRANCH_ID` appears in that user's `USERD` rows.
  - Every allotted branch's `COMP_PARENT_ID` is the user's own company.
  - `YEARM` has at most 9 years per company and a `YEAR_CLOSED` flag. `COMPANYM` has 26 branches, none deleted.
- **Constraints:**
  - The dev database is read-only for this work: no INSERT, UPDATE or DDL, and no migration applied.
  - The look guard forbids colors in `features/`.
  - Spartan `dialog` and `combobox` are in `@spartan-ng/brain` 1.6 but not yet generated into `shared/ui`.

## Goals / Non-Goals

**Goals:**
- One token-issuing path for login and for the switch, so both produce identical claims.
- The switch is validated on the server against the session, never trusted from the browser.
- The dialog uses shared, accessible Spartan pieces: focus trap, Escape, and focus return.

**Non-Goals:**
- Writing anything: the default branch in `USERM` is not updated.
- Per-branch menus, permissions or data scoping. No screen reads the branch or year yet.
- Token refresh or extending the login: the switch keeps the current expiry.
- Switching company.

## Decisions

### D1. Endpoints (`iErp.Admin/ChangeBranch`)
- `GET /api/admin/session/options` returns `{ branches: [{ id, name }], years: [{ id, code, name }] }`.
  - Branches come from `USERD` joined to `COMPANYM`, where `d.USER_ID = session.UserId`, `COMP_TYPE = 'B'`, `REC_DELETED_DATE IS NULL` and `COMP_PARENT_ID = session.CompanyId`, ordered by `COMP_NAME`.
  - Years come from `YEARM` where `REC_COMPANY_CODE = session.CompanyCode` and `YEAR_CLOSED = 'N'` (open years only, revised at the user's request), ordered by `YEAR_START_DATE DESC`.
- `POST /api/admin/session/change` with `{ branchId, yearId }` returns the login response shape: `{ token, expiresAt, session }`.
- Both endpoints are under the default `RequireAuthorization()`; neither is anonymous.
- *Alternative:* two LOV endpoints with server-side search. Rejected: the lists are tiny and fixed for the session, so one call when the dialog opens is simpler and avoids a request per keystroke. The list-screen rule (server filtering and paging) applies to data tables, not to short pick lists. Recorded in the proposal.

### D2. Checks and outcomes
- **Validator:** `branchId` and `yearId` are required, not blank, and at most 40 characters. Missing or too long gives 400 with field errors.
- **The service re-reads everything from the session claims and the database:**
  - The user (`sub`) must still exist and be neither locked nor deleted. Otherwise the result is 401 through the normal path, and the frontend's session-expiry handling logs the user out.
  - The branch must be in the user's allowed list (the same query as D1, filtered by id). Otherwise 403 "This branch is not available to you.".
  - The year must be an open year (`YEAR_CLOSED = 'N'`) of the session's company. Otherwise (another company's, or closed) 403 "This financial year is not available for your company.".
- Outcomes are a result type (`Success`, `UserGone`, `BranchNotAllowed`, `YearNotAllowed`) mapped by the controller, as in the login.
- *Alternative:* trust the ids because the dialog only offers allowed ones. Rejected: the endpoint is reachable directly with a valid token.

### D3. One token issuer
- Move `CreateToken` from `LoginService` into `ISessionTokenIssuer` / `SessionTokenIssuer` in `iErp.Admin` (a shared `Session/` folder). Its signature is `Issue(string userId, SessionDto session, DateTimeOffset expiresAt)`.
  - The login passes `now + LifetimeMinutes`.
  - The switch passes the current token's expiry, read from the `exp` claim.
- The claims are unchanged, so existing token tests keep passing.
- `SessionDto` and `LoginResponse` move with it, or stay in `Login/` and are referenced from `ChangeBranch/`. The choice is made during implementation; behavior is identical.
- *Alternative:* a fresh lifetime on each switch. Rejected: the switch would become a way to stay logged in forever.

### D4. Data mapping
- New entity `UserBranch` (`iErp.Entities`) with `UserId` and `BranchId`.
  - `UserBranchConfiguration` maps `USERD`, `USER_ID` and `USER_BRANCH_ID` (max length 40), with composite key `(UserId, BranchId)` and `ToTable("USERD", t => t.ExcludeFromMigrations())`.
  - The other `USERD` columns, including `USER_ICEGATE_PWD`, are **not mapped**, so EF never selects them.
- Add a snapshot-only migration (empty `Up`/`Down`) if EF reports model changes, as in `UserYearReadOnlyMapping`.
- All reads use `AsNoTracking()`. `FindLatestYearAsync` stays for the login. A new `ListYearsAsync(companyCode)` and `FindYearAsync(companyCode, yearId)` serve the switch.

### D4a. Open years
- Map `YEARM.YEAR_CLOSED` (CHAR(1), values `Y`/`N`, no nulls in the dev data) as `FinancialYear.Closed`, with a snapshot-only migration. The years list and the switch check filter `Closed == "N"`. The login keeps the latest year as before; in the dev data that year is open for every company.

### D5. Current session
- `ICurrentSession` gains `UserId` (`sub`). `HttpCurrentSession` implements it.
- The expiry is read in the controller from the `exp` claim (Unix seconds).
- `TestTokens` already sets `sub`, so tests can drive both endpoints.

### D6. Frontend: shared pieces
- Generate the Spartan `dialog` and `combobox` helm components into `shared/ui` with `ng g @spartan-ng/cli:ui`, keeping the existing `@spartan-ng/brain` 1.6.
- The combobox is the LOV. It shows the selected item's name, opens a list, filters it as the user types (contains, ignoring case), and has keyboard selection.
- Revised at the user's request: the shared combobox item separates the rows with `border-b border-border` and `last:border-b-0` (the neutral border color, so both themes follow), so every LOV in the application gets the lines. `last:` is the last item in the markup, so when a filter hides it the last visible row keeps its line (CSS cannot select the last visible item); accepted.
- If the generator's combobox needs an extra dependency or does not fit a reactive form control, the fallback is the Spartan `autocomplete` with a value-to-label mapping. This is recorded here so the task does not stall.
- **Revised at the user's request (plain dropdowns):** Branch and Year are Spartan `select` dropdowns, not comboboxes: click to open, pick a row; no typed text, no filtering, no clear icon. The Spartan select is used rather than the native `<select>` because a native list cannot draw lines between its rows. `select` is generated into `shared/ui`; its item gets the row lines (`border-b border-border`, `last:border-b-0`) and the hand pointer; the select is a reactive-form control holding the chosen option object (compared by id) and shows the option's name. `combobox` and the `input-group` and `textarea` it brought are removed, because nothing uses them any more. The combobox notes below are history.
- Outcome (implementation): the combobox works as a reactive-form control, so no fallback was needed. It brought `input-group` and `textarea` with it. jsdom lacks `ResizeObserver` and `scrollIntoView`, so `src/test-setup.ts` stubs them for tests. The item's `cursor-default` became `cursor-pointer` (the app-wide hand rule). With a value and the clear button shown, the combobox hides its chevron; clicking the field opens the list.

### D7. Frontend: feature `features/admin/change-branch`
- **`ChangeBranchService`** (provided by the dialog component) calls `GET admin/session/options` and `POST admin/session/change`, and has a `busy` signal.
  - On success it calls `AuthSession.start({ token, expiresAt, ...session })`, so the header updates through `details()` and sessionStorage is replaced (the switch survives a reload).
- **`ChangeBranchDialog` (standalone)** has a typed reactive form with `branchId` and `yearId`, both required.
  - It preselects `AuthSession.session().branchId` and `yearId` once the options arrive.
  - Its title "Change Branch" uses the dialog's title piece.
  - Select (primary, submit) comes first, then Cancel (outline), at the bottom right. This matches the login screen's order.
  - Field errors use `appFieldError` with "Branch is required." and "Year is required.".
  - Revised at the user's request: the fields are `hlm-select` dropdowns (trigger shows the chosen name; no clear button). Each field row is `flex flex-col gap-2 sm:grid sm:grid-cols-[6rem_1fr] sm:items-center sm:gap-x-4`; the label is in column 1, the combobox in column 2 and the message on its own row in column 2 (`sm:col-start-2`). Below `sm` the row stays stacked (label above field).
- **Failures:**
  - The options request uses the normal `httpErrorInterceptor` notification.
  - On the switch request, 403 is shown by the dialog as `notifications.warn(message)`, and the dialog stays open. It uses `SKIP_ERROR_NOTIFICATION`, as the login does.
  - 401 goes through the existing session-expiry path.
- **On success:** the dialog closes with no notification (revised at the user's request). The header's new branch and year confirm the switch.
- Outcome (implementation): no `hlmDialogDescription` (it registers `aria-describedby` after the first check and fails in dev mode); the shell opens the dialog with `contentClass: 'w-xl sm:max-w-xl'` (36rem, and the generated `sm:max-w-md` cap raised to match; revised at the user's request so the labels fit beside the fields, earlier `'w-md'`), because the overlay otherwise shrinks it to its content; the component host is `grid gap-6` for the header-to-form spacing.

### D8. Header (`shell`)
- **New button:** a ghost icon button with `lucideArrowLeftRight`, `aria-label` "Change branch" and a matching `title`, `shrink-0`. It sits between the session-details group and the theme button, and only while `auth.details()` exists.
- **Opening the dialog:**
  - On click, the shell dynamically imports `features/admin/change-branch/change-branch.dialog`, then opens it with the Spartan dialog service.
  - The dynamic import keeps the feature out of the main bundle, and `core`/`shared` still never import `features`.
  - Focus returns to the button on close (the dialog's default).
- **Tests:** `shell.spec.ts`'s "no user menu" assertion becomes exactly Open menu, Hide navigation bar, Change branch, Switch to … theme and Log out.

### D8a. Header colours (revised at the user's request)
- `--header-company: var(--primary)` in the light block; the dark block drops its own value, so the title always matches `appPageTitle` (`text-primary`), the Dashboard title's colour.
- `--header-branch`: dark yellow, about `oklch(0.55 0.12 85)` light and `oklch(0.82 0.15 88)` dark.
- The contrast targets are the same as before: 4.5:1 for the branch and 3:1 for the large title, on the header background in each theme.
- Only the tokens in `styles.css` change; `shell.html` keeps `text-header-company` and `text-header-branch`.

### D9. Docs
- `kb/architecture/backend.md`: the two endpoints, the checks, the shared token issuer, and that `USERD` maps two columns only.
- `kb/architecture/frontend.md`: `dialog` and `combobox` in the generated list, the change-branch feature, the header button, and how the shell opens a feature dialog lazily.

## Risks / Trade-offs

- **[A session year closed after login]** It is not in the Year list, so Year starts empty and Select asks for a year. → Expected; the user picks an open year.

- **[Oracle 10g has no boolean literals]** Found in the live check: sorting years with `OrderBy(y => y.StartDate == null)` made EF emit `CASE ... THEN TRUE ELSE FALSE`, which Oracle 10g rejects (ORA-00904 "FALSE"); the unit and endpoint tests use fakes and the Oracle tests do not run here, so none caught it. → Sort on a number (`? 1 : 0`), and `Unit/ChangeBranchQueryTests` checks the repository's SQL for `TRUE`/`FALSE` without a database.

- **[A switched token keeps the old expiry]** A user may be logged out soon after switching. → Acceptable: it is the same behavior as without the switch, and the session-expired message explains it.
- **[An old token stays valid until it expires]** The old token still names the old branch, and there is no server-side revocation. → The browser drops it immediately. No endpoint scopes data by branch yet, and a revocation list is out of scope.
- **[Generated combobox differs from expectations in brain 1.6]** → D6 fallback (`autocomplete`). Its API is checked when generating, before the dialog is built.
- **[Shell opens a feature component]** → A dynamic import from the shell only (not `core`/`shared`), documented in `frontend.md`.
- **[Archive order]** The `app-shell` delta's requirement text includes `user-loginpage`'s version. → Archive `reports-company-list`, then `user-loginpage`, then this change, and re-check this delta if that order changes.

## Migration Plan

- No database migration is applied. The EF snapshot-only migration records the read-only `USERD` mapping.
- The deploy is backend and frontend together. An old frontend simply has no button, and the new endpoints are additive.
- Rollback: revert the change. Nothing persistent was written.
