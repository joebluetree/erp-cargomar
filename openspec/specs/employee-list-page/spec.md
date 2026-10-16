# employee-list-page Specification

## Purpose
Provides the Employee List screen: a read-only list of the session branch's current employees with a search by code and name, from which each employee's profile opens view only.

## Requirements

### Requirement: Employee List menu entry
The main navigation SHALL have an **Employee List** entry with its own icon and icon color that opens the Employee List at `/admin/employees` inside the shell. Like every menu entry, it SHALL also appear as a Dashboard quick link.

#### Scenario: Open from the menu
- **WHEN** a logged-in user chooses Employee List in the sidebar
- **THEN** the Employee List is shown and the entry is highlighted

#### Scenario: Quick link
- **WHEN** the Dashboard is shown
- **THEN** it has an Employee List quick link with the same icon and color as the menu entry

### Requirement: Employee List screen
The Employee List SHALL follow the common list screen (`kb/platform/list-screen.md`):
- a back button and the title "Employee List";
- the filter row (Code and Name, Search button);
- the Wrap text toggle above the table;
- sorting on the rows of the page shown;
- single row selection;
- the shared footer pager;
- state kept while the application is open.

The list is read-only, with no edit, save or delete actions.

#### Scenario: Layout
- **WHEN** the Employee List is opened
- **THEN** it shows the back button and title, the Code and Name filters with Search, the Wrap text toggle, the table and the pager, in that order

#### Scenario: Search
- **WHEN** the user types "kum" in Name and presses Search
- **THEN** page 1 of the employees whose name contains "kum" is shown; typing alone changes nothing

#### Scenario: State kept
- **WHEN** the user opens an employee's profile and comes back to the list
- **THEN** the list shows the same filters, page, page size, sort and selected row

#### Scenario: Empty, loading and error
- **WHEN** no employee matches, the rows are loading, or the request fails
- **THEN** the screen says no employees (or no match when filters were searched), shows a loading message, or shows an alert with Retry, as on the Company List

### Requirement: Employee List columns
The table SHALL show, in this order: Employee No, Employee Name, Father's Name, Date of Birth (`dd-MM-yyyy`), Address (current address lines 1–3), Mobile No and Personal Email. An empty value SHALL show a dash.

#### Scenario: Columns
- **WHEN** the list has rows
- **THEN** the header shows the seven columns in that order and each row shows that employee's values

#### Scenario: Date and empty values
- **WHEN** an employee's date of birth is 1990-03-05 and they have no email
- **THEN** the row shows "05-03-1990" and "—"

### Requirement: Open an employee's profile from the code
The employee code in each row SHALL be a link that opens that employee's profile at `/admin/employees/{id}`, inside the shell. The profile SHALL use the Profile screen's layout and content (photo or initials, the basic box, Address, Contact Details, Bank Details, ID and Documents), view only, for that employee, with a back button that returns to the list. An employee who cannot be shown (404) SHALL show a message that the employee was not found, without an error notification.

#### Scenario: Open by the code
- **WHEN** the user clicks an employee's code in the list
- **THEN** that employee's profile is shown, with their name, details and photo or initials

#### Scenario: Keyboard
- **WHEN** the user focuses the code link and presses Enter
- **THEN** that employee's profile opens

#### Scenario: Back to the list
- **WHEN** the user presses the back button on the employee's profile
- **THEN** the Employee List is shown as it was left

#### Scenario: Not found
- **WHEN** the profile of an employee outside the scope is opened, for example from an old link after a branch switch
- **THEN** the screen says the employee was not found, with no error notification

#### Scenario: Own profile unchanged
- **WHEN** the user opens Profile from the menu
- **THEN** their own profile is shown, as before
