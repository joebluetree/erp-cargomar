# Proposal

## Why

`kb/modules/reports/company-list.md` (BRS v1.0, Approved) asks for a Company List report: a read-only, searchable, sortable, paged list of the companies held in the ERP. The platform now has a backend host, a frontend shell and documented conventions but no business feature, so this is the first one. It proves the module, repository, API and data-table conventions end to end.

## What Changes

- Add a read-only API endpoint (`GET /api/reports/companies`) that returns one filtered page of the companies from the existing Oracle table `COMPANYM` (code, name, three address lines, telephone, email, web) with the total count, following a shared paging contract.
- Add a Company List page under the shell with the BRS columns, Code and Name text filters with a **Search button** (filters apply only when it is pressed), sorting on every column of the shown page (default: Name ascending) and backend paging (default 10; sizes 2, 5, 10, 25, 50, 100).
- Make backend filtering, backend paging and the Search button the rule for **every table**, small or large: a shared request/response contract, a shared table pager, Oracle 10.2 paging support, and updated architecture docs.
- Add a back icon button before the page heading, on the same row, that returns to the page the user came from (Dashboard when there is none).
- Style the page: separators above and below the filter row, inline label-and-input filters, a header background and alternating row colors, and First/Last page buttons in the footer.
- Let the user select one row (highlighted in its own color); the selection is kept across table pages and when the user leaves and returns to the screen.
- Keep the whole state of a table when the user leaves the screen and comes back: the text in the filter boxes, the filters last searched, the table page, the page size, the sort and the selected row. This is the rule for every table, through one shared in-memory store.
- Make the app shell's content area left-aligned and as wide as the space beside the sidebar (it is currently centered and capped at about 1024px). This applies to every page, including the Dashboard.
- Make green the application's main color through the theme (primary buttons such as Search, page titles, the table header and the selected-row tint follow it), readable in both light and dark mode.
- Give the application one common look and feel: the colors and sizes become named theme values, and the page title, buttons, table header, table rows, filter row and footer come from shared building blocks (the generated Spartan table and button files, a shared page-title style and a shared filter toolbar), so the Company List has no styling of its own and every new screen gets the same look. An automated check keeps screens from setting brand or table colors themselves. No visible change.
- Add a shared "Wrap text" toggle above every table: on (the default) wraps the cells to the available width, off keeps cells on one line with a horizontal scrollbar when the table is wider than the screen. The Company List remembers the choice with the rest of its state.
- Color the navigation icons: each menu entry gets its own icon color (Dashboard blue, Company List green) from named theme colors for the light and dark themes, in the sidebar, the slide-in menu and the Dashboard quick links.
- Change the header caption to "Cargomar Pvt Ltd" and make the header hamburger button work at every width: it hides and shows the left navigation bar on wide screens (the content then uses the full width) and keeps opening the slide-in menu on narrow screens.
- Color the header hamburger icons in the brand green (the same green as the page titles) in both themes.
- Show the hand pointer on everything clickable (buttons, links, the dropdown, selectable rows), through one global rule, and not on disabled buttons.
- Make the header caption "Cargomar Pvt Ltd" a link to the Dashboard.
- Add a **Company List** menu entry (first labelled "Reports") that opens the page, so the Dashboard shows a quick link to it.
- Add a new backend module `iErp.Reports` (first real module, built from `iErp.ModuleTemplate`) and a frontend feature `features/reports/company-list`.
- Generate the Spartan components the page needs (`table`, `input`, `select`, `label`, ...).
- No create, edit, delete or export. The BRS defines no page or record actions.
- No schema migration: `COMPANYM` already exists and is only read. It is mapped as an externally owned, read-only table.

### Assumptions (recorded because the BRS is silent)

- Filtering is case-insensitive "contains" on Code and Name; both filters combine with AND.
- Filtering and paging run on the backend for every table (decided with the user; this replaces the earlier plan to filter, sort and page in the browser as `kb/architecture/frontend.md` used to prescribe). Oracle 10.2 has no `OFFSET`, so the compatibility interceptor learns to rewrite EF's paging into the older `ROWNUM` form, verified against the dev database.
- Sorting stays in the browser and reorders only the rows of the shown page (decided with the user). Across pages the order is the backend's: name ascending, then id. Server-side sorting would be a follow-up.
- Page size 2 is offered next to 5, 10, 25, 50 and 100 (added at the user's request) so that multi-page behavior can be tried with the few companies in the dev database. The BRS (`kb/modules/reports/company-list.md`) still lists 5 to 100; it has not been changed.
- The Search button is the only way to apply filters: no Enter key and no Clear button (decided with the user). Paging and page-size changes use the filters that were last searched.
- Filter matching on the backend is case-insensitive "contains" using `INSTR`, so `%` and `_` are ordinary characters.
- The state of a table (filter text, searched filters, page, page size, sort and the selected row id) is remembered in memory when the user leaves the screen and restored on return; a browser reload clears it (decided with the user). Rows are never cached: on return the page asks the backend for the restored page again.
- `COMP_PKID` (NVARCHAR(40)) is an opaque string key used for row identity only and is not shown. It is not a GUID, so this table is an exception to the "GUID primary keys" rule, which governs tables this system creates.
- The BRS Change History cites `Customer Master` and the change ref `reports-company_list`; these are treated as copy-paste leftovers and the change is named `reports-company-list`.
- `COMPANYM` and the Admin module's planned `MAST_COMPANY` (`kb/modules/admin/company.md`) are different tables. This report reads `COMPANYM` as the BRS states. If Company Master later replaces `COMPANYM`, the report's data source will need a follow-up change.

## Capabilities

### New Capabilities

- `common-look-and-feel`: named theme values for the look, and shared title, button, table, filter-row and footer pieces that every screen uses, with a check that screens do not bypass them.
- `server-side-tables`: the rule for every table: backend filtering and paging, a Search button, one request/response shape and page-size set, Oracle 10g paging, one common pager, and remembering the table state while the app stays open.
- `reports-company-list-api`: the backend contract for one filtered page of companies (read-only mapping of `COMPANYM`, filters, name order, validation, Oracle 10g-safe query) and the `iErp.Reports` module registration.
- `reports-company-list-page`: the Company List screen: columns, filters, sorting, paging, loading, empty and error states, the Company List menu entry and the route.

### Modified Capabilities

- `app-shell`: "Shell layout on every page" now requires the content area to fill the available width and the page content to start at its left edge instead of being centered or capped; a new "Brand color" requirement makes green the main color of primary buttons, page titles and table headers.
- `backend-solution-structure`: "Backend solution layout" and "Flat project layout" hard-code seven projects; they now allow one project per business module (currently Reports). The shell menu, quick-links and "Adding a module" requirements already cover the rest unchanged.

## Impact

- Backend: `iErp.Shared` gains the paging types, `iErp.Data` gains `ToPageAsync` and the interceptor gains the `OFFSET`/`FETCH` rewrite; new project `iErp.Reports` added to `iErp.sln`; `Entities` gets a `Company` entity; `Data` gets its configuration (no migration); `Api` references the module and calls its registration; `iErp.Tests` gains unit, architecture and (Oracle-gated) integration tests.
- Frontend: new `shared/paging` (paged type, `TablePager` and the in-memory `TableStateStore`), new shared look pieces (`shared/ui` table, button, page title and table toolbar defaults), new lazy feature `features/reports/company-list`, a route in `app.routes.ts`, a `NAV_ITEMS` entry and icon, and generated Spartan components in `shared/ui`.
- Docs: `kb/architecture/backend.md` and `kb/architecture/frontend.md` stop saying "no business feature yet" and record the conventions the feature confirms or revises; the common list requirements are written once in `kb/platform/list-screen.md` and the Company List BRS (`kb/modules/reports/company-list.md`, now version 1.2) follows them and states only what is specific to the list (tasks 3.53 and 3.55).
- Database: requires `COMPANYM` to exist with the BRS columns. The app only reads it; no DDL.
