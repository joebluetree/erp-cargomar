# Spec Delta

## Purpose

Defines the Company List report screen: a read-only table of companies that users filter with a Search button, sort within the shown page and page through, reachable from the Company List entry in the main menu. Filtering and paging are done by the backend.

## ADDED Requirements

### Requirement: Company List page and menu entry
The application SHALL provide a Company List page, shown inside the application shell, with a heading "Company List". A menu entry labelled "Company List", with an icon, SHALL be added to the main menu and SHALL open the page. The page SHALL be loaded on demand, and the Dashboard quick links SHALL include the entry.

#### Scenario: Open from menu
- **WHEN** the user chooses Company List in the menu
- **THEN** the Company List page is shown in the content area and the Company List entry is highlighted

#### Scenario: Menu label
- **WHEN** the main menu is displayed
- **THEN** its second entry is labelled "Company List" (not "Reports"), and the Dashboard quick link carries the same label

#### Scenario: Dashboard quick link
- **WHEN** the user opens the Dashboard
- **THEN** a quick link to the Company List is shown, and choosing it opens the page

#### Scenario: Loaded on demand
- **WHEN** the application first loads
- **THEN** the Company List code is not part of the initial download

### Requirement: Back to previous page
The page SHALL show a back icon button immediately before the "Company List" heading, on the same row. Choosing it SHALL return the user to the page they came from. When there is no earlier page in the application, it SHALL open the Dashboard. The button SHALL have the accessible name "Back" and SHALL be usable by keyboard.

#### Scenario: Position
- **WHEN** the page is displayed
- **THEN** the back icon button and the heading are on one row, with the button first

#### Scenario: Return to the page it came from
- **WHEN** the user opened the Company List from the Dashboard quick link and chooses the back button
- **THEN** the Dashboard is shown

#### Scenario: Returns to any earlier page
- **WHEN** the user opened the Company List from another page of the application and chooses the back button
- **THEN** that page is shown

#### Scenario: No earlier page
- **WHEN** the user opened the Company List address directly and chooses the back button
- **THEN** the Dashboard is shown

#### Scenario: Keyboard
- **WHEN** the user focuses the back button and presses Enter or Space
- **THEN** it returns as described above

### Requirement: Page layout and table appearance
The filter row SHALL have a thin horizontal separator above it and one below it. In the filter row each label SHALL sit beside its text box on the same line, and the Code pair and the Name pair SHALL share one row, wrapping to a new row only when the width is too narrow. The "Company List" heading SHALL be shown as written, "Company List" (not in capitals), in the application's green main color, the Search button SHALL be a primary (green) button, and the table header row SHALL have the green main color as its background with white text, which sets it apart from the body. Body rows SHALL alternate between two background colors. A thin vertical separator SHALL be drawn between neighbouring columns, in the header row and in every body row, but not after the last column; it SHALL be light on the colored header and the theme's border color in the body. The text in the table header and body cells SHALL be 12px. All colors SHALL come from the application theme and keep the text readable in both the light and the dark theme.

#### Scenario: Separators
- **WHEN** the page is displayed
- **THEN** a separator line is shown directly above and directly below the filter row

#### Scenario: Inline filters
- **WHEN** the page is displayed on a wide screen
- **THEN** the Code label and text box, the Name label and text box, and the Search button are all on one row with each label beside its text box

#### Scenario: Narrow screen filters
- **WHEN** the viewport is too narrow for both pairs on one row
- **THEN** the Name pair and the Search button wrap below the Code pair and each label stays beside its text box

#### Scenario: Header background
- **WHEN** the table is displayed
- **THEN** the header row has the green main color as its background with white text, different from the body rows

#### Scenario: Title in normal case
- **WHEN** the page is displayed
- **THEN** the heading is shown as "Company List", not in capitals

#### Scenario: Dimmer fills in both themes
- **WHEN** either theme is active
- **THEN** the table header and the Search button are a darker, less bright green than the "Company List" heading, with white text on them, darker still in the dark theme, and the heading keeps the green main color

#### Scenario: Title and Search button colors
- **WHEN** the page is displayed
- **THEN** the "Company List" heading is in the green main color and the Search button has the green main color as its background with white text

#### Scenario: Header, stripes and selection stay distinguishable
- **WHEN** a row is selected
- **THEN** the header, the alternating rows and the selected row each have a different background color

#### Scenario: Column separators
- **WHEN** the table shows rows
- **THEN** a thin vertical line separates each column from the next in the header and in every body row, and no line is drawn at the right edge of the last column

#### Scenario: Alternating rows
- **WHEN** the table shows several rows
- **THEN** consecutive rows have alternating background colors

#### Scenario: Both themes
- **WHEN** the user switches between the light and the dark theme
- **THEN** the header, alternating rows and text remain readable in each

#### Scenario: Table text size
- **WHEN** the table is displayed
- **THEN** the text in its header and body cells is 12px

#### Scenario: Uses the available width
- **WHEN** the page is displayed on a wide screen
- **THEN** the page starts at the left of the content area and the table spans the full width of the content area

### Requirement: Row selection
The user SHALL be able to select one company row by clicking it, or by focusing it and pressing Enter or Space. The selected row SHALL be shown with a background color that differs from the header and from both alternating row colors, and its selected state SHALL be available to assistive technology. Only one row SHALL be selected at a time: selecting another row moves the selection, and selecting the selected row again clears it. The selection SHALL be kept when the user moves between table pages and when the user leaves the Company List screen and returns to it, and SHALL be cleared when the page is reloaded in the browser. Selecting a row SHALL have no effect other than showing it selected.

#### Scenario: Select a row
- **WHEN** the user clicks a row
- **THEN** that row is shown selected and no other row is

#### Scenario: Move the selection
- **WHEN** a row is selected and the user clicks another row
- **THEN** only the other row is selected

#### Scenario: Clear the selection
- **WHEN** the user clicks the selected row
- **THEN** no row is selected

#### Scenario: Keyboard
- **WHEN** the user focuses a row with the keyboard and presses Enter or Space
- **THEN** the row is selected, or cleared if it was already selected

#### Scenario: Kept across table pages
- **WHEN** the user selects a row on page 1, moves to page 2 and returns to page 1
- **THEN** the same row is still shown selected

#### Scenario: Kept after leaving the screen
- **WHEN** the user selects a row, leaves the Company List screen and returns to it
- **THEN** the same row is shown selected once the companies have loaded

#### Scenario: Not in the current result
- **WHEN** the selected row is not in the result of a search, and the user clears the filters and searches again
- **THEN** the row is shown again and is still selected

#### Scenario: Company no longer listed
- **WHEN** the selected company is no longer in the list returned after the user returns to the screen
- **THEN** no row is shown selected

#### Scenario: Cleared on reload
- **WHEN** the user reloads the page in the browser
- **THEN** no row is selected

#### Scenario: No other effect
- **WHEN** the user selects a row
- **THEN** nothing else on the page changes and no request is sent

### Requirement: Page state is kept
The Company List SHALL remember its state as described by the `server-side-tables` capability: the text in the Code and Name boxes, the filters last searched, the current page, the page size, the sort column and direction (and whether the user chose a sort), and the selected row. When the user leaves the screen and returns, the page SHALL show them restored and SHALL request the remembered page from the backend again with the remembered searched filters. Reloading the browser page SHALL clear all of it.

#### Scenario: Restored after leaving
- **WHEN** the user searched for "cargo", chose page size 2, moved to page 2, sorted by Code descending and selected a row, opened the Dashboard and returned
- **THEN** the Code and Name boxes show the typed text, the table shows page 2 of the "cargo" result with page size 2, the Code header shows descending, and the same row is selected

#### Scenario: One request on return
- **WHEN** the user returns to the Company List
- **THEN** one request is sent for the remembered page with the remembered searched filters and page size

#### Scenario: Unsearched text is shown but not applied
- **WHEN** the user typed "xy" in Name without pressing Search, left and returned, and then moves to the next page
- **THEN** the Name box shows "xy" and the requests carry the filters that were last searched, not "xy"

#### Scenario: Defaults when nothing was kept
- **WHEN** the user opens the Company List for the first time, or after reloading the browser page
- **THEN** the boxes are empty, page 1 of 10 rows is requested and the sort is the default

### Requirement: Wrap text toggle
The Company List SHALL show the shared "Wrap text" toggle directly above its table, defaulting to on. With it on, the table cells wrap to the available width and the table needs no horizontal scrollbar; turning it off SHALL make the cells single-line, with a horizontal scrollbar when the table is wider than the screen. The choice SHALL be part of the page state that is remembered when the user leaves the screen and returns, and SHALL start on after a browser reload. The toggle SHALL NOT send a request, change the page, the sort, the selected row or the rows shown.

#### Scenario: Toggle above the table, on
- **WHEN** the page has loaded companies
- **THEN** a "Wrap text: on" toggle is shown directly above the table and the cells wrap to the available width

#### Scenario: Turn wrapping off
- **WHEN** the user turns the toggle off
- **THEN** the label reads "Wrap text: off", the cells keep their text on one line, the table scrolls horizontally when it is wider than the screen, and the same rows are shown with no request sent

#### Scenario: Remembered
- **WHEN** the user turns wrapping off, opens another screen and returns
- **THEN** the toggle is still off and the table still scrolls

#### Scenario: Reload starts on
- **WHEN** the user reloads the browser page
- **THEN** the toggle is on

#### Scenario: Other state untouched
- **WHEN** the user turns the toggle off while a row is selected on page 2 with a sort chosen
- **THEN** the page, the sort and the selected row are unchanged

### Requirement: Company List columns
The page SHALL show a table with the columns Code, Name, Address-1, Address-2, Address-3, Tel, Email and Web, in that order, one row per company (BR-001.1). The page SHALL offer no create, edit, delete or export action.

#### Scenario: Rows shown
- **WHEN** the page has loaded companies
- **THEN** each company appears as one row with its eight values

#### Scenario: Empty values
- **WHEN** a company has no value for a column
- **THEN** the cell is blank

#### Scenario: Read-only
- **WHEN** the page is displayed
- **THEN** it has no create, edit or delete control

### Requirement: Filter by code and name with a Search button
The page SHALL provide a Code text box, a Name text box and a Search button in the filter row, following the `server-side-tables` capability. The filters SHALL be applied only when the user presses the Search button: typing does not change the table and does not send a request, and pressing Enter in a text box does not search. The page SHALL have no Clear button. The backend SHALL do the filtering: the table shows only companies whose code contains the Code text and whose name contains the Name text, ignoring letter case, and a blank box SHALL not restrict the result. Pressing Search SHALL show page 1 of the result.

#### Scenario: Filter by code
- **WHEN** the user types "ab" in Code and presses Search
- **THEN** one request carrying `code=ab` is sent and only companies whose code contains "ab" in any letter case are listed

#### Scenario: Filter by name
- **WHEN** the user types "trad" in Name and presses Search
- **THEN** only companies whose name contains "trad" in any letter case are listed

#### Scenario: Both filters
- **WHEN** the user fills both boxes and presses Search
- **THEN** only companies matching both are listed

#### Scenario: Typing does not search
- **WHEN** the user types in a filter box and does not press Search
- **THEN** the table is unchanged and no request is sent

#### Scenario: Enter does not search
- **WHEN** the user presses Enter in a filter box
- **THEN** no request is sent

#### Scenario: Show all again
- **WHEN** the user empties both boxes and presses Search
- **THEN** all companies are listed again, from page 1

#### Scenario: Back to first page
- **WHEN** the user is on page 3 and presses Search
- **THEN** the table shows page 1 of the new result

#### Scenario: Paging keeps the searched filters
- **WHEN** the user searched for "ab", then typed "xy" without pressing Search, and moves to the next page
- **THEN** the request for the next page carries `code=ab`, not "xy"

### Requirement: Sorting
The user SHALL be able to sort the rows shown on the current page by any of the eight columns by choosing its header; choosing the same header again SHALL reverse the direction. Sorting is done in the browser on the rows of the current page only: it SHALL NOT send a request, and rows on other pages are not reordered. The sorted column and direction SHALL be shown on the header and made available to assistive technology. Sorting SHALL ignore letter case. The order in which the backend returns the rows (company name ascending) SHALL be shown when the user has not chosen a sort, and the Name header SHALL show ascending then.

#### Scenario: Default order
- **WHEN** the page first shows companies
- **THEN** they are in the order the backend returned (Name ascending) and the Name header shows ascending

#### Scenario: Sort the shown page by another column
- **WHEN** the user chooses the Code header
- **THEN** the rows of the current page are ordered by Code ascending, the Code header shows ascending, and no request is sent

#### Scenario: Reverse
- **WHEN** the user chooses the header of the column that is already sorted ascending
- **THEN** the order of the current page becomes descending

#### Scenario: Other pages are not re-sorted
- **WHEN** the user sorts page 1 by Code and moves to page 2
- **THEN** page 2 contains the rows the backend returned for page 2 and is sorted by the same column within that page only

#### Scenario: Search keeps the sort choice
- **WHEN** the user has chosen a sort and presses Search
- **THEN** the chosen column and direction are applied to the rows of the new page

### Requirement: Paging
The table SHALL show 10 rows per page by default and let the user choose 2, 5, 10, 25, 50 or 100, using the common table pager of the `server-side-tables` capability. The backend SHALL do the paging: moving to another page or changing the page size sends a request and shows what the backend returns. The pager SHALL let the user move to the first, previous, next and last page with icon buttons named "First page", "Previous page", "Next page" and "Last page", SHALL disable a move that is not possible, and SHALL show which rows are displayed out of how many match, using the total returned by the backend. Changing the page size SHALL return the table to page 1.

#### Scenario: Default page size
- **WHEN** the page first loads and 23 companies exist
- **THEN** a request for page 1 with page size 10 is sent, 10 rows are shown, the page size reads 10, and the pager reports rows 1 to 10 of 23

#### Scenario: Next page
- **WHEN** the user chooses the next-page control
- **THEN** a request for page 2 is sent with the searched filters and page 2 is shown

#### Scenario: Change page size
- **WHEN** the user chooses 25 while on page 2
- **THEN** a request for page 1 with page size 25 is sent and page 1 is shown

#### Scenario: First page
- **WHEN** the user is on the first page
- **THEN** the first-page and previous-page controls are disabled and the next-page and last-page controls are enabled if there is a later page

#### Scenario: Last page
- **WHEN** the user is on the last page
- **THEN** the next-page and last-page controls are disabled and the first-page and previous-page controls are enabled if there is an earlier page

#### Scenario: Jump to the ends
- **WHEN** 23 companies match, 10 per page, and the user chooses the last-page control and then the first-page control
- **THEN** a request for page 3 is sent and rows 21 to 23 are shown, then a request for page 1 is sent and rows 1 to 10 are shown

#### Scenario: Row range
- **WHEN** 23 companies match and page 3 is shown with 10 per page
- **THEN** the pager reports rows 21 to 23 of 23

#### Scenario: Footer separators
- **WHEN** the Company List footer is displayed
- **THEN** a separator line is shown directly above and directly below it, below the table

#### Scenario: Footer alignment
- **WHEN** the Company List footer is displayed on a wide screen
- **THEN** its range text, page buttons and "Rows per page" choice (last) start at the left edge of the table, in one row with wide spacing between them, and none is pushed to the right

#### Scenario: Page number
- **WHEN** 23 companies match and the user moves from page 1 to page 2 with 10 per page
- **THEN** the pager shows "Page 1 of 3" and then "Page 2 of 3"

#### Scenario: Page past the end
- **WHEN** the backend returns no rows for the requested page but reports a total that has rows
- **THEN** the page requests the last page that has rows

### Requirement: Loading, empty and error states
While a request is pending the page SHALL show a loading indicator and no stale rows. When the result has no company, the table SHALL show an empty-state row; the message SHALL differ between "no companies exist" (no filters were applied) and "no companies match the filters" (filters were applied). When a request fails, the page SHALL show one error notification through the application's standard error handling and an error state with a retry control, and SHALL NOT show backend exception text. Retry SHALL repeat the same request.

#### Scenario: Loading
- **WHEN** the page has requested companies and the response has not arrived
- **THEN** a loading indicator is shown

#### Scenario: No companies at all
- **WHEN** no filters were applied and the backend returns no companies
- **THEN** the table shows an empty-state row saying there are no companies

#### Scenario: No match
- **WHEN** filters were applied and the backend returns no company
- **THEN** the table shows an empty-state row saying no companies match, and searching again with empty boxes restores the list

#### Scenario: Load failure and retry
- **WHEN** a request fails
- **THEN** one error notification and an error state with a retry control are shown, and choosing retry sends the same request again

### Requirement: Accessible and responsive table
Filter boxes SHALL have visible labels, the table SHALL have a caption or accessible name, and all controls SHALL be usable by keyboard. On narrow screens the table SHALL scroll horizontally inside the content area instead of making the whole page scroll.

#### Scenario: Keyboard use
- **WHEN** the user operates the filters, headers and paging controls with the keyboard only
- **THEN** every one can be reached and activated

#### Scenario: Narrow screen
- **WHEN** the viewport is narrower than the table
- **THEN** the table scrolls horizontally within the content area and the page itself does not
