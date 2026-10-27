# Proposal

## Why

Each branch keeps its holiday list as a text file (BRS `kb/modules/admin/holiday-list.md` v1.0, and BR-002 of `kb/modules/admin/branch.md`). Users cannot see it in the application today. They need to open their own branch's holiday list from the menu, view only. The employee photos have also moved, from `D:\erp-cargomar\images\` to `D:\erp-cargomar\resources\images\`, so the Profile photo no longer shows with the default setting.

## What Changes

- New **Holiday List** menu entry (sidebar, and a Dashboard quick link) that opens `/admin/holidays`, the logged-in user's own holiday list. There is no list or search step (BR-001.1, BR-001.2).
- New read-only endpoint `GET /api/admin/holidays`. It reads the text file of the session's company, branch and financial year from a configured folder and returns its holidays in file order.
  - The file is named `<company code>-<branch code>-<year code>.txt`, for example `CPL-COKSF-2026.txt`. The year code is the `YEAR_CODE` of the session's financial year (2026 for 2026-2027).
  - Each line is `holiday,day,date` (`Republic Day,Monday,26-01-2026`); a `Holiday,Day,Date` heading line is skipped.
  - When the file is missing, the endpoint answers 404 and the screen shows "Holiday List Not Found" (BR-001.S3).
- The screen shows the title "Holiday List" and one box like the Profile's boxes, with the branch's name as a header inside the box, then three left-aligned columns Holiday, Day and Date, each exactly as the file writes it. A missing value shows "—" (BR-001.3, BR-001.4). It follows a branch or year switch.
- New setting `HolidayLists:Folder`, by default `D:\erp-cargomar\resources\Holiday List\`.
- `EmployeeImages:Folder` defaults to `D:\erp-cargomar\resources\images\`, the photos' new place.

## Capabilities

### New Capabilities
- `holiday-list-api`: the endpoint that finds the session branch's holiday file in the configured folder and returns its holidays.
- `holiday-list-page`: the Holiday List menu entry and screen.

### Modified Capabilities
- `employee-profile-api`: the "Own photo" requirement's default photo folder changes to `D:\erp-cargomar\resources\images\`.

## Impact

- **Backend:** new `iErp.Admin/HolidayList` feature (options, file store, repository for the branch and year codes, service, controller), registered in `AdminRegistration`, with its options bound in `Program.cs`. `appsettings.json` gains `HolidayLists:Folder` and changes `EmployeeImages:Folder`. The database is only read (`COMPANYM`, `YEARM`); there is no migration.
- **Frontend:** new `features/admin/holiday-list` (model, service, page, routes), a route in `app.routes.ts`, and a `NAV_ITEMS` entry with its icon. The specs that count menu entries change: nav-items, app-nav, Dashboard and clickable-cursor.
- **Files:** the holiday text files are maintained outside the application. The application never writes them.
- **Docs:** `kb/architecture/backend.md` and `kb/architecture/frontend.md` would need the new endpoint, route and menu entry, and `kb/modules/admin/holiday-list.md` its status. Per CLAUDE.md these are not edited in this change.
