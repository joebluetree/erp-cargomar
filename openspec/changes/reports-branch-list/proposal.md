# Proposal

## Why

Users can list companies (Company List) but not the branches of their own company. The BRS `kb/modules/reports/branch-list.md` v1.0 asks for two things:
- a read-only Branch List of the logged-in company's branches (BR-001);
- from each branch row, that branch's holiday list (BR-002).

The holiday files and their reading already exist in the Holiday List (`admin-holiday-list`). That screen shows only the session's own branch.

## What Changes

- New **Branch List** report at `/reports/branches`, with a menu entry and a Dashboard quick link. It follows the common list screen (`kb/platform/list-screen.md` v1.0) like the Company List.
  - It lists only the branches (`COMP_TYPE` 'B', not deleted) of the logged-in company (BR-001.2).
  - The columns are Code, Name, Address-1, Address-2, Address-3, Tel, Email and Web (BR-001).
  - Code and Name filters are applied with Search (contains, ignoring case, `%` and `_` literal). The backend pages and orders by name then id.
  - Sorting reorders the shown page, and the state is kept while the user is elsewhere.
- A ninth column, **Holiday**, has a button in each row. It opens `/reports/branches/{id}/holidays` (BR-002).
  - That page shows that branch's holiday list for the session's financial year, in the Holiday List's box and columns (Holiday, Day, Date).
  - The branch's name is above the box, and a Back button returns to the Branch List as it was left.
  - With no file, the page shows "Holiday List Not Found".
- New read-only endpoints:
  - `GET /api/reports/branches` (paged, filtered);
  - `GET /api/reports/branches/{id}/holidays`. A branch outside the logged-in company answers 404, like a missing file.

## Capabilities

### New Capabilities
- `reports-branch-list-api`: the branch list endpoint and the endpoint that returns a listed branch's holiday list.
- `reports-branch-list-page`: the Branch List menu entry and screen, its Holiday column, and the branch holiday page.

### Modified Capabilities
None. The Holiday List's own screen and endpoint are unchanged; the branch holiday page reuses them.

## Impact

- **Dependency:** this change reuses the holiday file reading and the Holiday List page of `admin-holiday-list`. That change is complete but not yet archived; archive it first, or archive the two in that order.
- **Backend:** new `iErp.Reports/BranchList` (query, validator, repository, service, controller). The holiday service of `iErp.Admin/HolidayList` gains a way to read the list of a given branch. `COMPANYM` is only read; no mapping changes and no migration.
- **Frontend:**
  - new `features/reports/branch-list` (model, service, table sort, selection, page, routes);
  - the Holiday List page takes an optional branch;
  - a route in `app.routes.ts` and a `NAV_ITEMS` entry with its icon;
  - the specs that count menu entries change: nav-items, app-nav, Dashboard and clickable-cursor.
- **Docs:** `kb/architecture/backend.md` and `kb/architecture/frontend.md` would need the new endpoints, routes and menu entry. Per CLAUDE.md they are not edited in this change.
