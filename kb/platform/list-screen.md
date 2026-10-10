# Business Requirement Specification
## ERP List Screen

| Field | Value |
|---|---|
| **Capability** | `list-screen` |
| **Current Version** | 1.0 |
| **Status** | Proposed |
| **Owner** | joyi john |
| **Last Updated** | 2026-10-09 |

## Document Use

This document is the business source of truth for **every screen that shows a table of records** (a "list screen"): the Company List now, and every future list such as customers, vendors, users and reports.

It defines what all list screens have in common: the layout, searching, paging, sorting, row selection, remembered state, text wrapping, the loading, empty and error states, the look and the accessibility. It builds on the Application Shell (`kb/platform/app-shell.md`) and the frontend and backend foundations (`kb/platform/frontend.md`, `kb/platform/backend.md`).

**How a list uses it.** Each list has its own BRS under `kb/modules/<domain>/<list>.md`. That BRS does **not** repeat this document. It states "Follows list-screen `LS` v<version>" with any exceptions, and then describes only what is specific to the list: its purpose, data, columns, filters, default order and any extra actions. Anyone building a new list reads this document and the list's BRS, and nothing else is needed for the common behaviour.

**How it is checked.** The "Tests that prove it" section at the end names the automated tests that check these rules. A rule without a test is marked *(no test yet)*. The technical *how* (named theme values, shared pieces, folders) is in `kb/architecture/frontend.md`, "Look and feel", and `kb/architecture/backend.md`, "Filtering and paging". This document is the *what*.

**Tracking changes:**

- Rules use `LS-<group>.<n> [v<version>]`, e.g. `LS-004.2 [v1.2]`.
- Scenarios use `LS-<group>.S<n> [v<version>]`, e.g. `LS-004.S2 [v1.2]`.
- A modified rule or scenario keeps its ID and shows both versions, e.g. `[v1.0 → v1.3]`.
- A removed rule or scenario is deleted here and recorded in Change History. Its ID is never reused.
- Every change is listed in Change History as ADDED, MODIFIED, or REMOVED.

---

## Change History

### v1.0 — Initial List Screen   [Status: Proposed]

- **Date:** 2026-10-09
- **Change Ref:** `reports-company-list`
- **Affects:** LS-001 – LS-012

**Changes:**

- ADDED the common requirements of a list screen, taken from the Company List (its BRS v1.1) and the OpenSpec capabilities `server-side-tables` and `common-look-and-feel`.

---

## Purpose

Give every list in the ERP the same layout, the same behaviour and the same look, so that a user who knows one list knows them all, and so that a new list is described only by what is specific to it.

## Scope

A list screen shall include:

1. The standard layout (title row, filter row, table, footer).
2. Filtering with a Search button.
3. Filtering and paging done by the system on the server.
4. The standard footer (rows shown, page buttons, rows per page).
5. Sorting the rows of the shown page.
6. Selection of one row.
7. Remembering the screen's state while the application stays open.
8. A Wrap text toggle.
9. Loading, empty and error states.
10. The common look, in the light and the dark theme.
11. Accessibility and keyboard use.
12. A menu entry, a Dashboard quick link and a Back button.

## Functional Requirements

### LS-001 [v1.0] — Layout

- **LS-001.1 [v1.0]** The title row shall hold a Back button and then the screen title, on one line. The title shall be in its normal case (not capitals) and shall use the common title style.
- **LS-001.2 [v1.0]** The filter row shall sit between two thin separator lines. Each filter shall be a label beside its input, and the Search button shall come after the last filter, all in one row that wraps only when the width is too small.
- **LS-001.3 [v1.0]** The Wrap text toggle shall be directly above the table, left-aligned (LS-008).
- **LS-001.4 [v1.0]** The footer shall sit below the table between two thin separator lines (LS-004).
- **LS-001.5 [v1.0]** The content shall start at the left of the content area and fill the width beside the sidebar; it shall not be centred or limited to a maximum width.
- **LS-001.6 [v1.0]** A list screen is read-only unless its own BRS adds actions. Selecting a row (LS-006) is not an action.

**Scenarios**

- **LS-001.S1 [v1.0]**
WHEN any list screen is displayed
THEN the Back button and the title are on the first row, the filters and the Search button are in one row between two separators, the Wrap text toggle is above the table, and the footer is below it between two separators.

### LS-002 [v1.0] — Search and filters

- **LS-002.1 [v1.0]** The filters shall be applied only when the user presses the Search button. Typing in a filter box shall not change the list. Pressing Enter in a filter box shall not search. There shall be no Clear button; the user empties the boxes and presses Search.
- **LS-002.2 [v1.0]** Pressing Search shall show page 1 of the result.
- **LS-002.3 [v1.0]** Paging and changing the page size shall use the filters that were last searched, not text typed since.
- **LS-002.4 [v1.0]** A text filter shall match when the value contains the text, ignoring letter case. A blank filter shall not restrict. Several filters shall all have to match. The characters `%` and `_` shall be ordinary characters.
- **LS-002.5 [v1.0]** A filter text longer than 60 characters shall be rejected.

**Scenarios**

- **LS-002.S1 [v1.0]**
WHEN the user types in a filter box and does not press Search
THEN the list is unchanged and nothing is requested.
- **LS-002.S2 [v1.0]**
WHEN the user searched for "ab", typed "xy" in another filter without searching, and moves to the next page
THEN the next page of the "ab" result is shown, not filtered by "xy".
- **LS-002.S3 [v1.0]**
WHEN the user is on page 3 and presses Search
THEN page 1 of the new result is shown.

### LS-003 [v1.0] — Filtering and paging on the server

- **LS-003.1 [v1.0]** Filtering and paging shall be done by the system on the server for every list, small or large. The screen shall receive only the rows of the page shown and the number of rows that match. The screen shall not download a whole list and filter or page it itself.
- **LS-003.2 [v1.0]** A list request shall carry the filters, a one-based `page` (default 1) and a `pageSize` (default 10). The answer shall carry `items`, `total` (the number of rows that match), `page` and `pageSize`.
- **LS-003.3 [v1.0]** The allowed page sizes shall be 2, 5, 10, 25, 50 and 100. A `page` below 1, a page size that is not allowed, or an overlong filter shall be rejected with an error that names the field.
- **LS-003.4 [v1.0]** A page after the last shall return no rows and the correct total. The rows shall be ordered so that no row is repeated or skipped between pages: the list's own order, then a unique identifier.
- **LS-003.5 [v1.0]** Paging shall work on Oracle Database 10.2.

**Scenarios**

- **LS-003.S1 [v1.0]**
WHEN 23 rows match and page 3 is requested with 10 per page
THEN 3 rows are returned and the total is 23.
- **LS-003.S2 [v1.0]**
WHEN a page size of 7 is requested
THEN the request is rejected and the error names the page size.

### LS-004 [v1.0] — Footer (pager)

- **LS-004.1 [v1.0]** The footer shall be one left-aligned row, in this order: the rows shown ("Showing x–y of n", or "No rows"); the page buttons First, Previous, Next, Last with the page number between Previous and Next ("Page n of m"); and "Rows per page". The parts shall have wide space between them and shall wrap only when the width is too small.
- **LS-004.2 [v1.0]** The default page size shall be 10 and the choices shall be those of LS-003.3.
- **LS-004.3 [v1.0]** A page move that is not possible shall be disabled (for example First and Previous on page 1).
- **LS-004.4 [v1.0]** Changing the page size shall show page 1.
- **LS-004.5 [v1.0]** When the page asked for is past the last page because rows were removed, the screen shall show the last page that has rows.

**Scenarios**

- **LS-004.S1 [v1.0]**
WHEN 23 rows match and page 3 is shown with 10 per page
THEN the footer reads "Showing 21–23 of 23" and "Page 3 of 3" and Next and Last are disabled.
- **LS-004.S2 [v1.0]**
WHEN nothing matches
THEN the footer reads "No rows" and "Page 1 of 1" and all four page buttons are disabled.

### LS-005 [v1.0] — Sorting

- **LS-005.1 [v1.0]** The user shall be able to sort by a column by choosing its header; choosing it again shall reverse the direction. The sorted column and direction shall be shown on the header and given to assistive technology.
- **LS-005.2 [v1.0]** Sorting shall ignore letter case and shall reorder only the rows of the page shown. Rows on other pages shall not be reordered.
- **LS-005.3 [v1.0]** Until the user chooses a sort, the rows shall be in the list's own order (as returned by the system).

**Scenarios**

- **LS-005.S1 [v1.0]**
WHEN the user sorts page 1 by a column and moves to page 2
THEN page 2 is the rows the system returned for page 2, sorted by that column within the page only.

### LS-006 [v1.0] — Row selection

- **LS-006.1 [v1.0]** The user shall be able to select one row by clicking it, or by focusing it and pressing Enter or Space. Only one row shall be selected at a time. Selecting another row shall move the selection; selecting the selected row shall clear it.
- **LS-006.2 [v1.0]** The selected row shall be shown in a colour that differs from the header and the alternating rows, and its state shall be given to assistive technology.
- **LS-006.3 [v1.0]** Selecting a row shall have no other effect: nothing is requested or changed.
- **LS-006.4 [v1.0]** The selection shall be kept when the user moves between pages, searches and sorts, and when the user leaves the screen and returns. A selected row that is not in the current result shall not be shown as selected. A browser reload shall clear it.

### LS-007 [v1.0] — Remembered state

- **LS-007.1 [v1.0]** While the application stays open, leaving a list screen and returning to it shall show it as the user left it: the text in the filter boxes, the searched filters, the page, the page size, the sort, the selected row and the Wrap text choice.
- **LS-007.2 [v1.0]** On return the rows shall be requested again from the system, so they are current. The rows themselves shall not be kept.
- **LS-007.3 [v1.0]** Each list shall keep its own state, separate from every other list.
- **LS-007.4 [v1.0]** A browser reload shall clear the remembered state: empty filters, page 1 with 10 rows, the list's own order, no selection, Wrap text on.

**Scenarios**

- **LS-007.S1 [v1.0]**
WHEN the user searched, chose 2 rows per page, moved to page 2, sorted, selected a row, opened the Dashboard and returned
THEN the same filters, page, page size, sort and selected row are shown.
- **LS-007.S2 [v1.0]**
WHEN the user typed in a filter box without searching, left and returned
THEN the text is shown in the box but the list is still the searched result.

### LS-008 [v1.0] — Wrap text

- **LS-008.1 [v1.0]** A "Wrap text" toggle shall be shown directly above the table. It shall be on by default: cells wrap to the width of the screen and the table needs no horizontal scrollbar; long values without spaces, such as an email address, break where needed.
- **LS-008.2 [v1.0]** With the toggle off, cells shall keep their text on one line and the table shall scroll horizontally when it is wider than the screen.
- **LS-008.3 [v1.0]** The toggle shall show its state in its label ("Wrap text: on" / "Wrap text: off") and to assistive technology, and shall change nothing else: no request, and the rows, page, sort and selection stay.

### LS-009 [v1.0] — Loading, empty and error states

- **LS-009.1 [v1.0]** While rows are being requested the screen shall show a loading indicator and no old rows.
- **LS-009.2 [v1.0]** When no row is returned the table shall show one row with a message. The message shall differ between "there are none" (no filters were searched) and "none match the filters" (filters were searched).
- **LS-009.3 [v1.0]** When a request fails the screen shall show an error message with a Retry button and the application's standard error notification, and shall not show technical error text. Retry shall repeat the same request.

### LS-010 [v1.0] — Look and feel

- **LS-010.1 [v1.0]** All list screens shall have the same look: the common title style, the primary (green) button for Search, a header row in the brand fill colour with light text, alternating row colours, thin column lines (none after the last column), a selected-row colour, and 12px table text. The look shall be the same in the light and the dark theme, with a dimmer fill in the dark theme.
- **LS-010.2 [v1.0]** The look shall come from the common building blocks and the named theme values. A list screen shall not set brand or table colours, sizes or literal colours itself.
- **LS-010.3 [v1.0]** Everything the user can click shall show the hand pointer; a disabled button shall not.
- **LS-010.4 [v1.0]** Changing the look shall be done in one place and shall change every list.

### LS-011 [v1.0] — Accessibility and keyboard

- **LS-011.1 [v1.0]** Filter inputs shall have visible labels, the table shall have an accessible name, and the buttons shall have accessible names (for example "Back", "First page", "Next page").
- **LS-011.2 [v1.0]** Everything shall be usable with the keyboard: filters, Search, sort headers, rows (Enter or Space to select), the Wrap text toggle and the page buttons.
- **LS-011.3 [v1.0]** The state of a control shall not be shown by colour alone (for example the Wrap text label and the sorted column indicator).

### LS-012 [v1.0] — Navigation

- **LS-012.1 [v1.0]** A list screen shall have a menu entry named after the list, with an icon and its own icon colour, and a Dashboard quick link with the same name and icon.
- **LS-012.2 [v1.0]** The Back button shall return the user to the page they came from. When the screen was opened directly, it shall open the Dashboard.
- **LS-012.3 [v1.0]** The screen shall load only when it is first visited.

## Out of Scope

- Creating, editing, deleting and exporting records (a list's own BRS adds these as actions).
- Sorting on the server across pages (a later version adds `sort` and `direction` to the request).
- Saving filters or the state between browser sessions.
- Row selection of several rows.
- Permissions and user-specific lists.

## How a New List Is Built

1. Write the list's BRS from `kb/template/brs-template.md`. Start it with "Follows list-screen LS v1.0" and list any exception; then describe only the list's own purpose, data, columns, filters, default order and extra actions.
2. Add the backend endpoint on the paging contract (LS-003) for the list's data.
3. Build the screen from the common building blocks (title, filter row, Wrap text toggle, table, footer) and a state key of its own (LS-007.3); add the menu entry with an icon and an icon colour (LS-012.1).
4. Run the tests. The look and the colour guard fail the build if the screen sets colours itself.
5. Check the screen against the acceptance checklist below.

## Acceptance Checklist for a New List

- [ ] Its BRS says it follows `LS` v1.0 and states its exceptions.
- [ ] Title row with Back and the title; filter row between separators with the Search button last; Wrap text toggle above the table; footer between separators.
- [ ] Filters apply only on Search; paging uses the searched filters; Search shows page 1.
- [ ] The system filters and pages; page sizes 2, 5, 10, 25, 50, 100; default 10.
- [ ] Sort works on the shown page; rows are selectable; the state is remembered under its own key; a reload resets it.
- [ ] Loading, empty ("none" vs "no match") and error with Retry are shown.
- [ ] No colours, sizes or hand-pointer styling in the screen's own template or code.
- [ ] Works in the light and the dark theme, with the keyboard, and on a narrow screen.
- [ ] Menu entry with icon colour and a Dashboard quick link.

## Tests That Prove It

| Rules | Tests (under `frontend/src/app` unless stated) |
|---|---|
| LS-001, LS-010, LS-011 | `shared/testing/look-and-feel.spec.ts`, `shared/ui/table-toolbar/table-toolbar.spec.ts`, `shared/ui/page-title/page-title.spec.ts`, `shared/testing/look-guard.spec.ts` (screens set no colours), the screen's page tests |
| LS-002, LS-003 | the screen's page tests ("Search button", "paging on the backend"); `backend/iErp.Tests`: `Unit/PagingTests.cs`, `Unit/Oracle10gCompatibilityInterceptorTests.cs`, `Reports/CompanyListQueryValidatorTests.cs`, `Integration/CompaniesEndpointTests.cs`, `Integration/CompanyTableTests.cs` (Oracle) |
| LS-004 | `shared/paging/table-pager.spec.ts`, `shared/paging/paged.spec.ts` |
| LS-005, LS-006, LS-009 | the screen's page tests; `features/reports/company-list/company-list.table.spec.ts` |
| LS-007 | `shared/paging/table-state.spec.ts`; the screen's page tests ("remembered state") |
| LS-008 | `shared/ui/table-wrap-toggle/table-wrap-toggle.spec.ts`; the screen's page tests ("wrap text toggle") |
| LS-010.3 | `shared/testing/clickable-cursor.spec.ts` |
| LS-012 | `core/navigation/nav-items.spec.ts`, `shell/app-nav.spec.ts`, `features/dashboard/dashboard.spec.ts`; the screen's page tests ("back button") |
| LS-002.5 *(no test yet at the screen level)*, LS-003.5 on a live database | the Oracle-gated integration tests, which run only when `IERP_TEST_ORACLE` is set |
