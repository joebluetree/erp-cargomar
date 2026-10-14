# Proposal

## Why

`kb/modules/admin/change-branch.md` (BRS v1.0, BR-001) asks for a way to switch the working branch and financial year without logging out. Today the session is fixed at login to the user's default branch and the company's latest year, so a user who works for several branches, or needs an earlier year, must log out and cannot reach any other branch or year at all.

## What Changes

- **Change Branch button in the header.** A ghost icon button named "Change branch" sits at the top right, directly after the session details (user, branch, year) and before the theme switch.
- **Change Branch dialog.** The button opens a modal titled "Change Branch" with two mandatory LOV fields, Branch and Year. Each is a plain dropdown list: click it and pick a row; there is no typing and no clear icon (BR-001.1; revised at the user's request). Select and Cancel sit at the bottom right. Both fields start at the current branch and year. Revised at the user's request: the labels sit beside their fields in a wider dialog, and the rows of the lists are separated by lines. Cancel, Escape or the close button leave everything unchanged.
- **Branches the user may choose** come from `USERD` (the branches allotted to the user). They are limited to not-deleted branches (`COMPANYM`, `COMP_TYPE='B'`) of the logged-in company, sorted by name. **Years** are the open financial years of the logged-in company (`YEARM`, `YEAR_CLOSED = 'N'`), newest first (revised at the user's request).
- **Select switches the session.** The backend re-checks the chosen branch and year against the same rules and issues a new access token for the same user and company with the new branch and year. The frontend replaces the stored session, so the header shows the new branch and year at once, and the user stays on the current page. A short success notification confirms the change.
- **Two new endpoints** in the Admin module, both requiring a login:
  - `GET /api/admin/session/options` lists the branches and years the user may choose.
  - `POST /api/admin/session/change` with `branchId` and `yearId` returns a new token and the session details (the same shape as login).
- **Quiet switch and header colours** (revised at the user's request).
  - A successful switch shows no notification; the dialog closes and the header shows the new branch and year.
  - The company title in the header takes the Dashboard title's colour, the brand green (`--primary`), instead of light red.
  - The branch name is shown in dark yellow instead of red.
- **Nothing is written to the database.** The user's default branch in `USERM` is not changed; the switch lives only in the session (token and browser tab).

### Assumptions (recorded because the BRS is silent)

- The new token keeps the **expiry of the current token**, so changing the branch does not extend the login.
- **Only open years are offered** (`YEAR_CLOSED = 'N'`, revised at the user's request; at first all years were). In the dev data each company has 3 open years of 9, and every company's latest year is open, so the login's year is always offered.
- **The current page stays open** after Select. No screen is scoped by branch or year yet, so nothing needs reloading.
- The BRS's "Relationships" note (menus and modules shown by branch and year) is **out of scope**. The application has no per-branch menus or permissions yet.
- The lists are short (at most 16 branches per user and 9 years per company in the dev data). Each list is therefore loaded once when the dialog opens. This is not a paged data table.

## Capabilities

### New Capabilities
- `user-branch-change`: switching the session's branch and financial year while logged in. It covers the header button, the dialog and its fields and actions, which branches and years are offered, the backend checks, and the re-issued session.

### Modified Capabilities
- `app-shell`: the header's right side gains the Change branch button between the session details and the theme switch, and the company title is shown in the brand green of the page titles. The "Shell layout on every page" requirement and its "No user menu" scenario list the header's right-side contents. The requirement text builds on the version in the still-open `user-loginpage` change.
- `user-session`: "Session details in the header" changes the branch colour from red to dark yellow. It builds on the version in the still-open `user-loginpage` change.

## Impact

- **Backend.**
  - New `iErp.Admin/ChangeBranch` feature folder: controller, service, repository, validator and DTOs.
  - Token creation moves out of `LoginService` into one shared session-token issuer, used by login and by the branch change.
  - `ICurrentSession` gains the user id (already in the token as `sub`).
  - New read-only entity `UserBranch` for `USERD`, mapping only `USER_ID` and `USER_BRANCH_ID` (never the ICEGATE credential columns), with `ExcludeFromMigrations` and a snapshot-only migration.
- **Frontend.**
  - Spartan `dialog` and `select` are generated into `shared/ui` (the `combobox` first used is removed again, revised at the user's request).
  - New `features/admin/change-branch`: dialog component and service.
  - The shell gets the header button, which loads the dialog on demand.
  - `AuthSession` replaces the session after a change.
- **Database.** Read-only: `USERD`, `COMPANYM` and `YEARM` are read, and nothing is inserted, updated or created.
- **Docs.** `kb/architecture/backend.md` and `kb/architecture/frontend.md` (the endpoints, the dialog and combobox, the header). The Change History entry of the BRS is updated when the change is archived.
- **Order.** This change depends on `user-loginpage`, which depends on `reports-company-list`. Archive them in that order before this one.
