# holiday-list-page Specification

## Purpose
Provides the Holiday List screen: the logged-in user's own branch holiday list for the session's financial year, opened directly from the menu and view only.

## Requirements

### Requirement: Holiday List menu entry
The main navigation SHALL have a **Holiday List** entry, with its own icon and icon color, that opens the Holiday List at `/admin/holidays` inside the shell. Like every menu entry, it SHALL also appear as a Dashboard quick link.

#### Scenario: Open from the menu
- **WHEN** a logged-in user chooses Holiday List in the sidebar
- **THEN** their own branch's holiday list is shown directly, with no list or search step, and the entry is highlighted

#### Scenario: Quick link
- **WHEN** the Dashboard is shown
- **THEN** it has a Holiday List quick link with the same icon and color as the menu entry

### Requirement: Holiday List screen
The screen SHALL show the title "Holiday List" and, below it, one box in the style of the Profile's boxes. Inside the box, at the top, a header SHALL show the branch's name. Below it the box SHALL show three columns under the headings **Holiday**, **Day** and **Date**, with one row per holiday in file order, all columns left-aligned. Each column SHALL show the file's text exactly as written. A missing value SHALL show "—". The screen SHALL be view only, with no inputs and no edit, save or delete actions.

#### Scenario: Holidays shown
- **WHEN** the user's branch is "CARGOMAR (P) LTD (HO)" and its file is "Republic Day,Monday,26-01-2026" and "Vishu,Thursday,14-May-2026"
- **THEN** the box shows "CARGOMAR (P) LTD (HO)" at its top, then the headings Holiday, Day and Date, then "Republic Day", "Monday", "26-01-2026", then "Vishu", "Thursday", "14-May-2026"

#### Scenario: Exactly as written
- **WHEN** the file has "Labour Day,Tuesday,01-May-2026"
- **THEN** the row shows "Labour Day", "Tuesday" and "01-May-2026", exactly as the file writes them

#### Scenario: Missing values
- **WHEN** a holiday has no day or no date
- **THEN** its row shows "—" in that place

#### Scenario: View only
- **WHEN** the Holiday List is shown
- **THEN** it has no inputs and no edit, save or delete buttons

### Requirement: Holiday List states
While the list loads, the screen SHALL show a loading message. When the backend answers that there is no holiday list (404), it SHALL show "Holiday List Not Found" with no error notification. When the list exists but has no holidays, it SHALL say there are no holidays. Any other failure SHALL show an alert with Retry, as other screens do.

#### Scenario: Not found
- **WHEN** there is no holiday file for the user's company, branch and year
- **THEN** the screen shows "Holiday List Not Found" and no error notification

#### Scenario: No holidays
- **WHEN** the holiday file has no holidays
- **THEN** the screen says "There are no holidays in the list."

#### Scenario: Failure
- **WHEN** the request fails for another reason
- **THEN** the screen shows an alert with Retry, and Retry asks again

### Requirement: Follow the working context
The Holiday List SHALL follow the session: after a branch or financial year switch, it SHALL show the list of the new branch and year without the user leaving the screen.

#### Scenario: Branch switched on the screen
- **WHEN** the user switches the branch while the Holiday List is open
- **THEN** the list of the new branch is shown, or "Holiday List Not Found" when it has none
