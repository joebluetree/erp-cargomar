# reports-branch-list-page Specification

## Purpose
Provides the Branch List report screen: a read-only list of the logged-in company's branches with a search by code and name, from which each branch's holiday list opens on its own page.

## Requirements

### Requirement: Branch List menu entry
The main navigation SHALL have a **Branch List** entry, with its own icon and icon color, that opens the Branch List at `/reports/branches` inside the shell. Like every menu entry, it SHALL also appear as a Dashboard quick link.

#### Scenario: Open from the menu
- **WHEN** a logged-in user chooses Branch List in the sidebar
- **THEN** the Branch List is shown and the entry is highlighted

#### Scenario: Quick link
- **WHEN** the Dashboard is shown
- **THEN** it has a Branch List quick link with the same icon and color as the menu entry

### Requirement: Branch List screen
The Branch List SHALL follow the common list screen (`kb/platform/list-screen.md` v1.0) as the Company List does:
- a back button and the title "Branch List";
- the filter row (Code and Name, Search button);
- the Wrap text toggle above the table;
- sorting on the rows of the page shown, with the backend's order (name) until a sort is chosen;
- single row selection;
- the shared footer pager;
- state kept while the application is open;
- the loading, empty ("There are no branches.", or "No branches match the filters.") and error (alert with Retry) states.

The list SHALL be read-only, with no create, edit or delete actions.

#### Scenario: Layout
- **WHEN** the Branch List is opened
- **THEN** it shows the back button and title, the Code and Name filters with Search, the Wrap text toggle, the table and the pager, in that order

#### Scenario: Search
- **WHEN** the user types "cok" in Code and presses Search
- **THEN** page 1 of the branches whose code contains "cok" is shown; typing alone changes nothing

#### Scenario: State kept
- **WHEN** the user opens a branch's holidays and comes back to the list
- **THEN** the list shows the same filters, page, page size, sort and selected row

### Requirement: Branch List columns
The table SHALL show, in this order: Code, Name, Address-1, Address-2, Address-3, Tel, Email, Web and Holiday List. The first eight SHALL be sortable. The Holiday List column SHALL hold, in each row, a button named "Holidays of <branch name>" that opens that branch's holiday page without changing the row selection.

#### Scenario: Columns
- **WHEN** the list has rows
- **THEN** the header shows the nine columns in that order, and each row shows the branch's values and a Holiday button

#### Scenario: Open a branch's holidays
- **WHEN** the user presses the Holiday button of branch "BLRAF"
- **THEN** `/reports/branches/{id of BLRAF}/holidays` opens, and the row selection is unchanged

#### Scenario: Keyboard
- **WHEN** the user focuses a Holiday button and presses Enter or Space
- **THEN** that branch's holiday page opens and the row is not selected or cleared

### Requirement: Branch holiday page
The page at `/reports/branches/{id}/holidays` SHALL show:
- a back button and the title "Holiday List";
- that branch's holidays for the session's financial year, in the Holiday List's box: the branch's name as a header inside the box at its top, then the columns Holiday, Day and Date, each exactly as the file writes it.

The Back button SHALL return to the Branch List as it was left. When there is no holiday list for the branch (404), the page SHALL show "Holiday List Not Found" with no error notification. The page SHALL be view only.

#### Scenario: Holidays of the branch
- **WHEN** the page of branch "BLRAF" is opened and its file lists "Republic Day,Monday,26-01-2026"
- **THEN** the box shows the branch's name at its top, then the row "Republic Day", "Monday", "26-01-2026"

#### Scenario: Back to the list
- **WHEN** the user presses Back on a branch's holiday page
- **THEN** the Branch List is shown as it was left

#### Scenario: Not found
- **WHEN** the branch has no holiday file, or the link names a branch outside the company
- **THEN** the page shows "Holiday List Not Found" and no error notification

#### Scenario: Own Holiday List unchanged
- **WHEN** the user opens Holiday List from the menu
- **THEN** their own branch's holiday list is shown, as before
