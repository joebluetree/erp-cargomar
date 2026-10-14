# Tasks

## 1. Read-only USERD mapping

- [x] 1.1 Add the `UserBranch` entity and `UserBranchConfiguration` (`USERD`; `USER_ID`, `USER_BRANCH_ID` max 40; composite key; `ExcludeFromMigrations`; no other column mapped). Then run `dotnet ef migrations add` only if EF reports model changes, and make the migration snapshot-only (empty `Up`/`Down`); never run `database update`. Verify:
  - the solution builds;
  - a model test asserts the table, the two columns, the key, and that `USER_ICEGATE_PWD` is not mapped;
  - an `[OracleFact]` repository test against a throwaway schema (it does not run here: `IERP_TEST_ORACLE` is never pointed at the dev DB) covers the allotted-branch query.

## 2. Shared session token and current user

- [x] 2.1 Move token creation from `LoginService` into `ISessionTokenIssuer`/`SessionTokenIssuer`, with the expiry passed in, and register it in `AddAdmin`. Verify: the existing `LoginServiceTests` and `LoginEndpointTests` pass unchanged (same claims, same lifetime), plus a unit test that the issuer uses the expiry it is given.
- [x] 2.2 Add `UserId` (`sub`) to `ICurrentSession` and `HttpCurrentSession`. Verify with an `AuthenticationTests` case that reads it through the test `session` endpoint.

## 3. Backend: options and switch endpoints

- [x] 3.1 `ChangeBranchRepository` (D1): the allowed branches for (user id, company id), ordered by name; the company's years, newest first; one year by (company code, id); and the user's still-valid check. Verify with `[OracleFact]` tests on a throwaway schema (allotted, other company, deleted branch, years order) and the build.
- [x] 3.2 `ChangeBranchService`, request, validator and result (D2), with the 403 messages "This branch is not available to you." and "This financial year is not available for your company.". The new token keeps the current expiry (D3). Verify with unit tests: success with new branch and year and unchanged user, company and expiry; branch not allotted; year of another company; user gone; validator required and max length.
- [x] 3.3 `ChangeBranchController`: `GET /api/admin/session/options` and `POST /api/admin/session/change`, both protected. Verify with integration tests on a fake repository:
  - 401 without a token;
  - options shape and order;
  - 200 with token and session;
  - 403 problems for each refusal;
  - 400 field errors;
  - wrong method gives 405;
  - nothing is written, because the fake repository has no write methods.
- [x] 3.4 Docs: endpoints, checks, the shared token issuer, and the two-column `USERD` mapping in `kb/architecture/backend.md`. Verify the doc matches the code. Then run `dotnet test` (Oracle tests skipped).

## 4. Frontend: shared dialog and combobox

- [x] 4.1 Generate Spartan `dialog` and `combobox` into `shared/ui` with `ng g @spartan-ng/cli:ui` (brain 1.6). If the combobox cannot serve as a reactive-form LOV, use `autocomplete` instead and record that in `design.md` D6. Verify:
  - `npm run build` passes;
  - the look-and-feel test renders the new pieces once (title, focus trap, Escape closes, the combobox filters by "contains", ignoring case);
  - the generated list in `kb/architecture/frontend.md` is updated.

## 5. Frontend: Change Branch feature

- [x] 5.1 `features/admin/change-branch`: the model, `ChangeBranchService` (options, change, `busy`, `AuthSession.start` on success) and `change-branch.testing.ts`. Verify with service tests: the request URLs and body, `SKIP_ERROR_NOTIFICATION` on the change request, the session replaced and stored, and `busy`.
- [x] 5.2 `ChangeBranchDialog`:
  - title "Change Branch"; Branch and Year LOVs preselected with the current values;
  - required messages; Select (primary, submit, disabled and showing progress while busy) then Cancel at the bottom right;
  - 403 shown as a warning with the values kept;
  - on success, a notification "Branch changed to <branch>, <year>." and close;
  - Cancel and Escape close without a request.

  Verify with page tests for each of these, plus the look guard (no colors in the feature) and `clickable-cursor.spec.ts`.

## 6. Header button

- [x] 6.1 The shell gets a "Change branch" ghost icon button (`lucideArrowLeftRight`) between the session details and the theme switch, only with a session. It lazily imports and opens the dialog. Verify with shell tests:
  - the position and name;
  - no button without a session;
  - the dialog opens;
  - the buttons are exactly Open menu, Hide navigation bar, Change branch, Switch to … theme and Log out;
  - the header shows the new branch and year after a switch.

  Also check that `npm run build` shows the dialog in its own lazy chunk, and update the header and shell notes in `kb/architecture/frontend.md`.

## 7. Integration check

- [x] 7.1 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate user-branch-change --strict`. Then, with the API and dev server against the dev database (reads only):
  - log in as a user with at least two allotted branches;
  - open Change branch and check the offered branches against a read-only `USERD` count for that user;
  - switch to another branch and an earlier year, and check that the header updates and survives a reload;
  - log out and in again, and check that the default branch is back.

## 8. Dialog layout and list rows

- [x] 8.1 Shared combobox: separate the list rows with a border line (`border-b border-border`, `last:border-b-0` on the shared item). Verify in `dialog-and-combobox.spec.ts` that every row but the last has a bottom border, and update the LOV note in `kb/architecture/frontend.md`.
- [x] 8.2 Dialog: labels beside their fields on `sm` and wider (a `6rem` label column), stacked below `sm`, with the required message under the field; the shell opens the dialog with `contentClass: 'w-xl sm:max-w-xl'` (the generated dialog caps itself at `sm:max-w-md`). Verify with dialog tests (row grid classes, label before field in one row, message in the field column) and a shell test for the width.
- [x] 8.3 `npm test -- --no-watch`, `npm run build` and `openspec validate user-branch-change --strict` pass, and a browser check shows labels and fields on one line and lines between list rows at 1280px, and the stacked layout at 390px.

## 9. Plain dropdowns and open years

- [x] 9.1 Backend: map `YEAR_CLOSED` (`FinancialYear.Closed`, CHAR(1)) with a snapshot-only migration; the years list and the switch check use open years only (`Closed == "N"`). Verify with a model test, a service test (a closed year is refused with 403), an endpoint test, the Oracle-only test data (a closed year is not listed) and the SQL check (no TRUE/FALSE); update `kb/architecture/backend.md`.
- [x] 9.2 Shared select: generate Spartan `select` into `shared/ui`; its items get the row lines and the hand pointer; remove `combobox`, `input-group` and `textarea` and their paths. Rewrite the shared test as `dialog-and-select.spec.ts` (opens on click, picking sets the form control, no text input or clear button, lines between rows) and update the LOV note in `kb/architecture/frontend.md`.
- [x] 9.3 Dialog: Branch and Year use the select; the layout stays (label beside field, message under it). Update the dialog tests (pick from the list; no typing or clearing; the closed current year starts empty and asks for a year) and the hand-pointer test.
- [x] 9.4 `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate user-branch-change --strict` pass, and a browser check shows plain dropdowns with lines between rows and no typing or clear icon, the years equal to a read-only count of open years, and a working switch.

## 10. Quiet switch and header colours

- [x] 10.1 Dialog: remove the success notification. Verify with the dialog test: a switch closes the dialog, updates the session and calls no `notifications.success`; the 403 warning and error cases are unchanged.
- [x] 10.2 `styles.css`:
  - `--header-company: var(--primary)`, with the dark override removed;
  - `--header-branch` dark yellow in both themes, keeping at least 4.5:1;
  - update the contrast comments.

  Verify with the shell tests (classes unchanged) and a computed-colour check in the browser: the title's colour equals the Dashboard `h1`'s, and the branch is yellow-hued and passes contrast, in both themes.
- [x] 10.3 Docs: the header colour and branch-change notes in `kb/architecture/frontend.md`.
- [x] 10.4 `npm test -- --no-watch`, `npm run build` and `openspec validate user-branch-change --strict` pass, and a browser check in both themes shows the green title, the dark-yellow branch and no toast after a switch.
