# user-branch-change Specification

## Purpose
Lets a logged-in user switch the session's working branch and financial year to another branch allotted to them and another year of their company, without logging out.

## Requirements

### Requirement: Change branch button
While a session exists, the header SHALL show an icon button named "Change branch" directly after the session details and before the theme switch. Activating it SHALL open the Change Branch dialog.

#### Scenario: Button placement
- **WHEN** a logged-in user views any page inside the shell
- **THEN** the header shows the "Change branch" button between the session details and the theme switch

#### Scenario: Opens the dialog
- **WHEN** the user activates "Change branch" with the mouse or the keyboard
- **THEN** the Change Branch dialog opens

#### Scenario: Not shown without a session
- **WHEN** no session exists
- **THEN** no "Change branch" button is shown

### Requirement: Change Branch dialog
The dialog SHALL be modal, titled "Change Branch", with the fields Branch and Year one below the other, each label on the same line as its field and to its left (on narrow screens the label is above its field), and the Select and Cancel buttons at the bottom right, Select first. Each field SHALL be a dropdown list: activating it shows the options and the user picks one; the field SHALL NOT accept typed text and SHALL have no clear button. The rows of each list SHALL be separated by a border line. When the dialog opens, Branch and Year SHALL show the session's current branch and year.

#### Scenario: Layout
- **WHEN** the dialog is open
- **THEN** it shows the title "Change Branch", the Branch and Year fields, and Select (primary) and Cancel at the bottom right

#### Scenario: Label beside field
- **WHEN** the dialog is open on a wide screen
- **THEN** each label is on the same line as its field, both fields start at the same position, and a required message appears under its field

#### Scenario: Rows separated
- **WHEN** a Branch or Year list is open
- **THEN** each row except the last has a border line below it

#### Scenario: Current values preselected
- **WHEN** a user working in branch "Kochi" and year "2025-2026" opens the dialog
- **THEN** Branch shows "Kochi" and Year shows "2025-2026"

#### Scenario: Pick from the list
- **WHEN** the user activates Branch and picks "Mumbai"
- **THEN** the list shows the offered branches, closes, and Branch shows "Mumbai"

#### Scenario: No typing or clearing
- **WHEN** the dialog is open
- **THEN** neither field has a text input or a clear button

#### Scenario: Keyboard and focus
- **WHEN** the dialog opens
- **THEN** focus moves into the dialog, stays inside it while it is open, and returns to the Change branch button when it closes

### Requirement: Branches and years offered
The Branch list SHALL contain exactly the branches allotted to the logged-in user (`USERD`) that are not-deleted branches of the logged-in company, sorted by name. The Year list SHALL contain every open financial year of the logged-in company (`YEAR_CLOSED` = 'N'), newest first; closed years SHALL NOT be offered. The lists SHALL come from the session, never from values the browser sends.

#### Scenario: Allotted branches only
- **WHEN** a user allotted the branches "Kochi" and "Mumbai" of their company opens the dialog
- **THEN** Branch offers "Kochi" and "Mumbai" and no other branch

#### Scenario: Open years of the company
- **WHEN** the logged-in company has the closed year "2023-2024" and the open years "2024-2025" and "2025-2026"
- **THEN** Year offers "2025-2026" then "2024-2025", and not "2023-2024"

#### Scenario: Lists cannot be loaded
- **WHEN** the lists cannot be loaded because the server fails or cannot be reached
- **THEN** the matching error notification is shown and the session is unchanged

### Requirement: Mandatory branch and year
Branch and Year SHALL both be required (BR-001.1). Select with either field empty SHALL show "Branch is required." or "Year is required." under that field and SHALL NOT change the session.

#### Scenario: Current year closed
- **WHEN** the session's year has been closed since login and the user opens the dialog and activates Select without picking a year
- **THEN** Year starts empty, "Year is required." is shown under Year and nothing is sent

### Requirement: Select switches the session
Select SHALL send the chosen branch and year to the backend. On success the session SHALL keep its user, employee id, company and expiry time, take the new branch and year, and the header SHALL show the new branch and year at once. The dialog SHALL close and the current page SHALL stay open, without a notification: the updated header is the confirmation. The change SHALL last for the browser tab, including reloads, until logout.

#### Scenario: Switch
- **WHEN** a user in "Kochi" / "2025-2026" selects "Mumbai" and "2024-2025"
- **THEN** the dialog closes, the header shows "Mumbai" and "2024-2025", the same page stays open, later API requests carry the new branch and year, and no notification is shown

#### Scenario: Reload keeps the switch
- **WHEN** the user reloads the page after switching
- **THEN** the header still shows the switched branch and year

#### Scenario: Busy
- **WHEN** Select has been activated and the answer has not arrived
- **THEN** Select is disabled and shows progress, and the request is sent only once

#### Scenario: Default branch unchanged
- **WHEN** the user switches the branch, logs out and logs in again
- **THEN** the session starts in the user's default branch and the latest year, as before

#### Scenario: Employee id kept
- **WHEN** a user with employee id "E-1" switches branch and year
- **THEN** the new session still carries employee id "E-1"

### Requirement: Backend checks the switch
The backend SHALL accept a switch only for a branch allotted to the logged-in user that is a not-deleted branch of the session's company, and an open year (`YEAR_CLOSED` = 'N') of the session's company. Any other branch or year SHALL be refused with 403 problem details and the session SHALL stay as it was. Missing values SHALL be refused with 400. No data SHALL be written.

#### Scenario: Branch not allotted
- **WHEN** a client asks to switch to a branch that is not allotted to the user
- **THEN** the response is 403 "This branch is not available to you." and no new token is issued

#### Scenario: Year of another company
- **WHEN** a client asks to switch to a year of another company
- **THEN** the response is 403 "This financial year is not available for your company."

#### Scenario: Closed year
- **WHEN** a client asks to switch to a closed year of the session's company
- **THEN** the response is 403 "This financial year is not available for your company." and no new token is issued

#### Scenario: Refusal shown
- **WHEN** the backend refuses the switch with 403
- **THEN** the dialog stays open with its values and shows the message as a warning notification

### Requirement: Cancel the dialog
Cancel, the Escape key and the dialog's close button SHALL close the dialog without changing the session or sending a switch request.

#### Scenario: Cancel
- **WHEN** the user changes Branch and then activates Cancel
- **THEN** the dialog closes and the header still shows the previous branch and year
