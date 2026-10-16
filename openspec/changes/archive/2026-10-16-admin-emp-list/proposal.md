# Proposal

## Why

`kb/modules/admin/employee-list.md` (BRS v1.0, change ref `admin-emp-list`) asks for an **Employee List** screen. It lists employees with a search by code and name, and opens each employee's profile, view only, from the code. Today a user can only see their own profile (change `admin-emp-profile`). This change adds the list and lets the profile screen show any listed employee.

## What Changes

- **New list API.** `GET /api/admin/employees` returns one page of employees, following the shared list contract (`server-side-tables`).
  - Optional `code` and `name` filters: case-insensitive "contains".
  - `page` and `pageSize` (10 by default).
  - Rows are ordered by name, then id.
  - Each row has the id, code (`EMP_NO`), name, father's name, date of birth, current address lines 1–3 (one text), mobile, and personal email.
- **Rows in scope.** The list holds only employees of the session's company and branch who are not relieved:
  - `EMPM.REC_COMPANY_CODE` equals the session's company code;
  - `EMPM.REC_BRANCH_CODE` equals the session branch's code (`COMPANYM.COMP_CODE`);
  - `EMP_IS_RELIEVED` = 'N'.
- **Any employee's profile.** `GET /api/admin/employees/{id}` returns the same profile as the user's own profile (`admin-emp-profile`), with every field in full. `GET /api/admin/employees/{id}/photo` returns their photo from the configured images folder. Both answer 404 for an employee outside the list's scope, so a user can open exactly the employees they can list.
- **New list screen.** **Employee List** at `/admin/employees`, following the common list screen (`kb/platform/list-screen.md`):
  - back button and title;
  - Code and Name filters with a Search button;
  - columns: Employee No, Employee Name, Father's Name, Date of Birth, Address, Mobile No, Personal Email;
  - sorting on the page shown, row selection, the shared pager, Wrap text, and state kept while the app is open.
  - The **code is a link** that opens that employee's profile.
- **Profile of a listed employee.** `/admin/employees/{id}` shows the existing Profile layout (photo or initials, basic box, Address, Contact, Bank, ID and Documents) for that employee, view only, with a back button to the list.
- **Menu entry.** **Employee List** in the main navigation (sidebar and slide-in menu), and so also a Dashboard quick link.

### Decisions and assumptions

- **All logged-in users may see the list** (decided by the user). The rules mention "a User with Rights", but the Permissions table says View: ALL, and the application has no rights system yet. A rights check can come with one.
- **Every profile field is shown in full** for other employees too (decided by the user), including bank account and ID numbers.
- **Scope: session company and branch, relieved = 'N'** (decided by the user). In the dev data every `EMPM` row has a company and a branch code that match `COMPANYM` (`COMP_CODE`), branch codes are unique within a company, and `EMP_IS_RELIEVED` is always 'Y' (262 rows) or 'N' (270).
- **Opening a profile needs the same scope.** An id outside it answers 404, as if it did not exist. The BRS line "the screen never takes an employee id from the user" is read as: the id comes from the row chosen in the list, never typed.
- **The BRS document has copy errors**, treated as follows:
  - its Change History repeats the profile's lines;
  - "BR-001" is used twice and the search is referred to as "BR-002";
  - "customer records" means employees.

  This proposal follows the screen and rule text.
- **Depends on `admin-emp-profile`**, which is complete but not archived: the `Employee` mapping, the profile DTO, the photo store and the Profile page.
- **Knowledge base:** per `CLAUDE.md`, `kb/` is not updated by this change; anything out of date is reported at the end.

## Capabilities

### New Capabilities

- `employee-list-api`: the employee list endpoint and the endpoints that return a listed employee's profile and photo, all limited to the session's company, branch and current employees.
- `employee-list-page`: the Employee List screen, its menu entry, and opening a listed employee's profile.

### Modified Capabilities

None. The list follows the existing `server-side-tables` and `common-look-and-feel` requirements as they stand. The profile capabilities from `admin-emp-profile` are reused without changing their requirements.

## Impact

- **Backend.**
  - `iErp.Entities/Employee.cs` gains `CompanyCode` (`REC_COMPANY_CODE`), `BranchCode` (`REC_BRANCH_CODE`) and `Relieved` (`EMP_IS_RELIEVED`), with a snapshot-only migration.
  - `iErp.Admin/EmployeeList`: query, validator, repository, service, controller and DTO.
  - `EmployeeProfileService` gets a "profile of employee X" path, reusing its mapping and photo lookup.
  - Tests: mapping, validator, service, query SQL for Oracle 10g, endpoints, and an Oracle-gated table test.
- **Frontend.**
  - `features/admin/employee-list`: model, service, page, table sort, selection and state.
  - The Profile page also takes an employee id, from the route `admin/employees/:id`.
  - A `NAV_ITEMS` entry and routes; specs.
- **API.** Three new `GET` endpoints. Nothing existing changes.
- **Database.** More `EMPM` columns read, and `COMPANYM` read for the branch code. No write and no DDL.
