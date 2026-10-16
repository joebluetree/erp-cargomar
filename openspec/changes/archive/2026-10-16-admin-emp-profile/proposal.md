# Proposal

## Why

`kb/modules/admin/employee-profile.md` (BRS v1.0, change ref `admin-emp-profile`) asks for a **Profile** screen: a logged-in user opens it from the menu and sees their own employee details (basic information, bank details, date of birth, addresses, contact details and ID numbers), view only. The login now knows the user's employee (`USERM.USER_EMP_ID`, change `user-empid-add`), so the profile can be found without asking for it.

## What Changes

- **New API.** `GET /api/admin/profile` returns the logged-in user's employee profile from the existing Oracle table `EMPM`. The employee is the session's employee id from the token; the endpoint takes no id, so a user can never read another employee's profile.
  - Fields: the BRS data model (basic info, bank details, date of birth, current and permanent address, personal contact, ID and documents).
  - State and country are returned as names, read from the existing `PARAM` table (types `STATE` and `COUNTRY`), not as internal ids.
  - A user without an employee id, or whose employee row is missing, gets 404 problem details.
- **New page.** A **Profile** screen at `/admin/profile`, inside the shell:
  - A first box without a heading: a big round avatar (the employee's initials) in a left column, and the name and basic details as label–value rows on the right.
  - Boxes with headings for Address (Current on the left, Permanent on the right; Address 1–3 and P.O. under one label), Bank Details, Contact Details, and ID and Documents. Every field is a label–value row.
  - Box headings and field labels in the colours of the reference UI template (dark slate and blue); the page title stays the shared green.
  - Rows sized to their content, as in the reference `profile.JPG`, when they fit the window:
    - first row: the basic box, Contact Details and Bank Details, at the same height;
    - second row: Address (the basic box's width) and ID and Documents (as tall as Address).

    When the window is narrower than the boxes, all boxes stack one below the other. Every label is blue.

    The page keeps its own white background, and the boxes are tinted pale blue-grey, with rounded corners and a soft shadow; view only, no edit actions; every BRS field shown, with an empty value shown as a dash.
  - Loading, "no employee profile" and load-error states.
- **Menu entry.** A **Profile** item in the main navigation list (sidebar and slide-in menu). Because the Dashboard quick links come from the same list, it also appears there.

### Decisions and assumptions

- **Own profile only** (decided by the user). BR-001.1 ("see all employee data list") and the Scope's "search" contradict the Purpose, UI and Permissions sections. This change builds no employee list and no search; they are left for a later change.
- **ID numbers shown in full** (decided by the user): bank account, Aadhaar, PAN, PF, ESI and UAN are the user's own data.
- **Menu entry in the sidebar** (decided by the user), not a header button.
- **Photo from a configured folder** (decided by the user). The image area shows the file named by `EMPM.EMP_IMAGE_NAME`, from the folder set in `appsettings.json` (`EmployeeImages:Folder`, `D:\erp-cargomar\images\`), so the folder can change without a code change. It falls back to the initials when there is no photo.
- **`EMP_CODE` is `EMP_NO`.** `EMPM` has no `EMP_CODE` column. `EMP_NO` holds the employee's code (531 distinct values for 532 rows in the dev data) and is shown as "Employee Code".
- **`EMP_ESINO` is labelled "ESI No".** The BRS labels it "Email", which is a copy error: the column holds the ESI number.
- **A session from before `user-empid-add`** carries no employee id, so it shows "no employee profile" until the user logs in again.
- **Depends on `user-empid-add`**: the employee id in the token and `ICurrentSession.EmployeeId`. That change is complete but not yet archived.
- **Knowledge base:** at the user's request (2026-10-15), the BRS `kb/modules/admin/employee-profile.md` was updated with these decisions. Its v1.0 is marked Proposed until this change is implemented. Per `CLAUDE.md`, no other `kb/` file is updated by this change. The new `EMPM` and `PARAM` read-only mappings make the legacy-table notes in `kb/architecture/backend.md` incomplete; this is reported at the end for the user to decide.

## Capabilities

### New Capabilities

- `employee-profile-api`: the read-only endpoint that returns the logged-in user's own employee profile, scoped by the session's employee id.
- `employee-profile-page`: the Profile screen (menu entry, layout, fields, avatar and states).

### Modified Capabilities

None. The new menu entry uses the existing "Navigation menu", "Quick links" and "Navigation icons are colored" requirements as they stand.

## Impact

- **Backend.**
  - `iErp.Entities`: new read-only `Employee` (`EMPM`, only the columns the profile shows) and `Parameter` (`PARAM`: id, type, name).
  - `iErp.Data/Configurations`: their mappings, excluded from migrations, and one snapshot-only migration.
  - `iErp.Admin/EmployeeProfile`: controller, service, repository and DTO, registered in `AdminRegistration`.
  - Tests in `iErp.Tests`: mapping, service, query SQL (Oracle 10g), endpoint, and an Oracle-gated table test.
  - `iErp.Api/appsettings.json`: the `EmployeeImages:Folder` setting; `GET api/admin/profile/photo` reads the photo from it.
- **Frontend.**
  - New feature `features/admin/employee-profile` (model, service, page, routes, specs).
  - A route in `app.routes.ts` and a `NAV_ITEMS` entry with a new icon in `NAV_ICONS`.
- **API.** One new `GET` endpoint. Nothing existing changes.
- **Database.** Two more legacy tables read (`EMPM`, `PARAM`). No write and no DDL.
