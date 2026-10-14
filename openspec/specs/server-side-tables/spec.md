# server-side-tables Specification

## Purpose
Defines how every data table in the application gets its rows: the backend filters and pages them, the user applies filters with a Search button, all tables share one request and response shape and one pager, and a table keeps its state while the user is away from it, whether the table is small or large.

## Requirements

### Requirement: Backend filtering and paging for every table
Every data table in the application SHALL receive its rows from the backend one page at a time. Filtering and paging SHALL be done by the backend, and the browser SHALL NOT download a full list and filter or page it itself. This applies to every table, small or large.

#### Scenario: Only the shown page is fetched
- **WHEN** a table shows page 2 of a result that has 40 matching rows with 10 rows per page
- **THEN** the request asked for page 2 and the response carried only that page's rows together with the total of 40

#### Scenario: Paging asks the backend
- **WHEN** the user moves to another page or changes the page size
- **THEN** a new request is sent to the backend for that page

#### Scenario: No filtering in the browser
- **WHEN** the user applies a filter
- **THEN** the filter values are sent to the backend and the table shows what the backend returned

### Requirement: Search button
Every table that has filters SHALL show a Search button in its filter row. Changing a filter value SHALL NOT change the table and SHALL NOT send a request. Pressing the Search button SHALL send the filter values to the backend and show the first page of the result. Paging and changing the page size SHALL use the filter values that were last searched, not text that has been typed since.

#### Scenario: Typing does not search
- **WHEN** the user types in a filter box and does not press Search
- **THEN** the table is unchanged and no request is sent

#### Scenario: Search applies the filters
- **WHEN** the user has typed filter values and presses Search
- **THEN** one request carrying those values is sent and page 1 of the result is shown

#### Scenario: Paging uses the searched filters
- **WHEN** the user searched for "ab", then typed "xy" without pressing Search, and moves to the next page
- **THEN** the request for the next page carries the filter "ab", not "xy"

#### Scenario: Empty filters
- **WHEN** the user presses Search with all filter boxes empty
- **THEN** the first page of the unfiltered result is shown

### Requirement: Common paging request and response
A table endpoint SHALL accept the table's filter values, a one-based `page` (default 1) and a `pageSize` (default 10) as query parameters, and SHALL return `items`, `total` (the number of rows matching the filters), `page` and `pageSize`. The allowed page sizes SHALL be 2, 5, 10, 25, 50 and 100. A `page` below 1, a `pageSize` that is not allowed, or a filter value that is too long SHALL be rejected with a 400 problem response that names the field. A `page` after the last page SHALL return an empty `items` array with the correct `total`.

#### Scenario: Defaults
- **WHEN** a client sends no `page` and no `pageSize`
- **THEN** page 1 with 10 rows is returned, and the response states `page` 1 and `pageSize` 10

#### Scenario: Total counts all matches
- **WHEN** 23 rows match the filters and page 3 is requested with 10 per page
- **THEN** 3 items are returned and `total` is 23

#### Scenario: Page size not allowed
- **WHEN** a client requests `pageSize` 7 or 500
- **THEN** the response is 400 and names `pageSize`

#### Scenario: Page below 1
- **WHEN** a client requests `page` 0
- **THEN** the response is 400 and names `page`

#### Scenario: Page after the last
- **WHEN** 23 rows match and page 9 is requested with 10 per page
- **THEN** the response is 200 with no items and `total` 23

### Requirement: Paging works on Oracle 10g
Paging SHALL work against Oracle Database 10.2: any page of a table query SHALL return the right rows in a stable order, without a SQL syntax error.

#### Scenario: Second page on 10.2
- **WHEN** page 2 of a table query with 5 rows per page is requested against an Oracle 10.2 database
- **THEN** rows 6 to 10 of the ordered result are returned

#### Scenario: Stable across pages
- **WHEN** all pages of a result are requested in turn
- **THEN** every matching row appears exactly once

### Requirement: Common table pager
Every table SHALL use the same footer, in this order: the range of rows shown out of the total; First, Previous, Next and Last page icon buttons with those accessible names, with the current page number out of the number of pages (for example "Page 2 of 3") shown between Previous and Next; and, last, a "Rows per page" choice (2, 5, 10, 25, 50, 100). A thin horizontal separator SHALL be drawn directly above and directly below the footer row. A move that is not possible SHALL be disabled, and changing the page size SHALL return to page 1.

#### Scenario: Same controls on every table
- **WHEN** any table with more than one page is displayed
- **THEN** its footer shows the range, the page size choice and the four page buttons

#### Scenario: Separators around the footer
- **WHEN** any table's footer is displayed
- **THEN** a thin horizontal separator is drawn directly above the footer row and another directly below it

#### Scenario: Left-aligned footer with generous spacing
- **WHEN** any table's footer is displayed
- **THEN** the range text, the page buttons with the page number, and the "Rows per page" choice last, are in one row, left-aligned in that order, with wide space between those three parts, and wrap to the next line only when the width is too narrow

#### Scenario: Page number
- **WHEN** a table shows page 2 of 3
- **THEN** its footer shows "Page 2 of 3" between the Previous and Next buttons, and shows "Page 1 of 1" when nothing matches or everything fits on one page

#### Scenario: Disabled moves
- **WHEN** the table shows the first page
- **THEN** First and Previous are disabled, and Next and Last are enabled if there is a later page

### Requirement: Table state is remembered
Every table SHALL keep its state while the application stays open: when the user leaves the table's screen and returns to it, the text in the filter boxes, the filters that were last searched, the current page, the page size, the sort and the selected row SHALL be as the user left them. On return the table SHALL ask the backend for the remembered page again and show the rows it returns; rows SHALL NOT be kept from before. The remembered state SHALL be cleared when the browser page is reloaded. Each table SHALL keep its own state, separate from every other table.

#### Scenario: Everything is as it was
- **WHEN** the user searches, moves to page 2, changes the page size, sorts and selects a row, opens another screen and returns
- **THEN** the filter boxes, page, page size, sort and selected row are as they were left

#### Scenario: Fresh rows on return
- **WHEN** the user returns to the table
- **THEN** one request carrying the remembered filters, page and page size is sent and the rows shown come from its response

#### Scenario: Typed text that was not searched
- **WHEN** the user typed text in a filter box without pressing Search, left and returned
- **THEN** the text is shown in the box, and the remembered page was requested with the filters that were last searched, not with that text

#### Scenario: Remembered page no longer exists
- **WHEN** the remembered page is past the last page because rows were removed meanwhile
- **THEN** the table shows the last page that has rows

#### Scenario: Reload starts fresh
- **WHEN** the user reloads the browser page
- **THEN** the table starts with empty filters, page 1, the default page size and the default sort

#### Scenario: Tables do not share state
- **WHEN** two different tables each have remembered state
- **THEN** returning to one shows its own state and not the other's
