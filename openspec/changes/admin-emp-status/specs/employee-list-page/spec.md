# Spec Delta

## ADDED Requirements

### Requirement: Employee status filter
The filter row SHALL have a Status dropdown, after Name and before Search, with the options Active, Relieved and All, in that order. Active is the default.

The chosen status SHALL follow the other filters:
- it applies only when Search is pressed;
- paging uses the status last searched;
- it is kept with the list state while the application is open;
- a browser reload sets it back to Active.

A searched status other than Active SHALL count as a filter for the empty-list message.

#### Scenario: Default status
- **WHEN** the Employee List is opened for the first time
- **THEN** the Status dropdown shows Active and only current employees are listed

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

## MODIFIED Requirements

### Requirement: Employee List screen
The Employee List SHALL follow the common list screen (`kb/platform/list-screen.md`):
- a back button and the title "Employee List";
- the filter row (Emp. No, Name and Status, Search button);
- the Wrap text toggle above the table;
- sorting on the rows of the page shown;
- single row selection;
- the shared footer pager;
- state kept while the application is open.

The list is read-only, with no edit, save or delete actions.

#### Scenario: Layout
- **WHEN** the Employee List is opened
- **THEN** it shows the back button and title, the Emp. No, Name and Status filters with Search, the Wrap text toggle, the table and the pager, in that order

#### Scenario: Search
- **WHEN** the user types "kum" in Name and presses Search
- **THEN** page 1 of the employees whose name contains "kum" is shown; typing alone changes nothing

#### Scenario: State kept
- **WHEN** the user opens an employee's profile and comes back to the list
- **THEN** the list shows the same filters, status, page, page size, sort and selected row

#### Scenario: Empty, loading and error
- **WHEN** no employee matches, the rows are loading, or the request fails
- **THEN** the screen says no employees (or no match when filters were searched), shows a loading message, or shows an alert with Retry, as on the Company List
