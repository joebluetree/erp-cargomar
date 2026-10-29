# Spec Delta

## ADDED Requirements

### Requirement: Employee status filter
The filter row SHALL have a Status dropdown, below Branch and beside Name (see Employee List screen), as wide as Branch, with the options All, Active and Relieved, in that order. Active is the default.

The chosen status SHALL follow the other filters:
- it applies only when Search is pressed;
- paging uses the status last searched;
- it is kept with the list state while the application is open;
- a browser reload, a logout, another login or a branch switch sets it back to Active, chosen and searched; a branch switch keeps the other filters.

A searched status other than Active SHALL count as a filter for the empty-list message.

#### Scenario: Default status
- **WHEN** the Employee List is opened for the first time
- **THEN** the Status dropdown shows Active, offers All, Active and Relieved, and only current employees are listed

#### Scenario: Search relieved employees
- **WHEN** the user chooses Relieved and presses Search
- **THEN** page 1 of the relieved employees is shown; choosing alone changes nothing

#### Scenario: All employees
- **WHEN** the user chooses All and presses Search
- **THEN** page 1 of both current and relieved employees is shown

#### Scenario: Status kept
- **WHEN** the user searched Relieved, opens an employee's profile and comes back
- **THEN** the dropdown shows Relieved and the list is still the relieved result

#### Scenario: No match
- **WHEN** the user searched Relieved with no code or name and no employee is relieved
- **THEN** the table says no employees match the filters

#### Scenario: Keyboard and label
- **WHEN** the user focuses the Status dropdown by its label and opens it with the keyboard
- **THEN** the three options can be chosen with the keyboard, as in every dropdown of the application

#### Scenario: Profile of a relieved employee
- **WHEN** the user opens the profile of a relieved employee from the list
- **THEN** that employee's profile is shown, view only, as for a current employee

#### Scenario: Active again at login
- **WHEN** the user searched Relieved, logs out and logs in again
- **THEN** the Employee List opens with Active and lists the current employees

#### Scenario: Status back to Active after a branch switch
- **WHEN** a user searched Relieved, then switches branch and opens the Employee List again
- **THEN** the Status dropdown shows Active and only current employees of the new branch are listed

### Requirement: Branch filter
The filter row SHALL have a Branch dropdown beside Emp. No (see Employee List screen), wide enough to show a full branch name, defaulting to the session's branch. For a user with the admin right on the Employee List in the session branch, it SHALL be enabled, with the option All first and then the user's allowed branches (the session's branch and the branches assigned to them) by name, as the backend returns them. For any other user it SHALL be disabled on the session's branch, and the list is the session's branch.

The chosen branch SHALL follow the other filters:
- it applies only when Search is pressed;
- paging uses the branch last searched;
- it is kept with the list state while the application is open;
- a browser reload, a logout or another login sets it back to the session's branch;
- while it is on the session's branch, a branch switch moves it to the new session's branch; another branch or All chosen and searched stays when it is still allowed in the new session, and otherwise goes back to the session's branch, also on returning to the list.

A searched branch other than the session's SHALL count as a filter for the empty-list message. While the options load, or when they cannot be loaded, the dropdown is disabled on the session's branch and the list still loads.

#### Scenario: Not an admin
- **WHEN** a user whose row in the session branch has `RIGHTS_ADMIN` 'N' opens the Employee List
- **THEN** the Branch dropdown is shown disabled on the session's branch, and the employees of the session's branch are listed

#### Scenario: Admin assigned two other branches
- **WHEN** a user assigned Kochi, Chennai and Delhi, logged in to Kochi with the admin right there, opens the Employee List for the first time after login
- **THEN** the Branch dropdown is enabled, shows Kochi, offers All, Chennai, Delhi and Kochi, and the employees of Kochi are listed

#### Scenario: All branches
- **WHEN** that user chooses All and presses Search
- **THEN** page 1 of the employees of Kochi, Chennai and Delhi is shown, and none of a branch not assigned to them; choosing alone changes nothing

#### Scenario: Another branch's profile
- **WHEN** an admin searched another allowed branch and opens an employee's profile
- **THEN** that employee's profile is shown, view only

#### Scenario: Switch to a branch without the admin right
- **WHEN** an admin searched All, then switches to a branch where their row has `RIGHTS_ADMIN` 'N'
- **THEN** the list shows page 1 of the new branch's employees, with no error, and the Branch dropdown is disabled on that branch

#### Scenario: Branch kept
- **WHEN** an admin searched All, opens an employee's profile and comes back
- **THEN** the dropdown shows All and the list is still the result for all allowed branches

## MODIFIED Requirements

### Requirement: Employee List screen
The Employee List SHALL follow the common list screen (`kb/platform/list-screen.md`):
- a back button and the title "Employee List";
- the filter row as a two-column grid of label and field: Emp. No above Name on the left, Branch above Status (wide enough for a full branch name) on the right, then the Search button; Tab goes Emp. No, Name, Branch, Status, then Search; on a narrow screen the filters stack in that order;
- the Wrap text toggle above the table;
- sorting on the rows of the page shown;
- single row selection;
- the shared footer pager;
- state kept while the application is open.

The list is read-only, with no edit, save or delete actions.

#### Scenario: Layout
- **WHEN** the Employee List is opened
- **THEN** it shows the back button and title, the Emp. No, Name, Branch and Status filters (two per row) with Search, the Wrap text toggle, the table and the pager, in that order

#### Scenario: Search
- **WHEN** the user types "kum" in Name and presses Search
- **THEN** page 1 of the employees whose name contains "kum" is shown; typing alone changes nothing

#### Scenario: State kept
- **WHEN** the user opens an employee's profile and comes back to the list
- **THEN** the list shows the same filters, status, branch, page, page size, sort and selected row

#### Scenario: Empty, loading and error
- **WHEN** no employee matches, the rows are loading, or the request fails
- **THEN** the screen says no employees (or no match when filters were searched), shows a loading message, or shows an alert with Retry, as on the Company List

### Requirement: Employee List columns
The table SHALL show, in this order: Employee No, Employee Name, Father's Name, Date of Birth (`dd-MM-yyyy`), Address (current address lines 1–3), Mobile No, Personal Email and Branch (the employee's branch name). An empty value SHALL show a dash.

#### Scenario: Columns
- **WHEN** the list has rows
- **THEN** the header shows the eight columns in that order, Branch last, and each row shows that employee's values

#### Scenario: Date and empty values
- **WHEN** an employee's date of birth is 1990-03-05 and they have no email
- **THEN** the row shows "05-03-1990" and "—"

#### Scenario: Branch of each row
- **WHEN** an admin lists All branches
- **THEN** each row's Branch shows the name of that employee's branch
