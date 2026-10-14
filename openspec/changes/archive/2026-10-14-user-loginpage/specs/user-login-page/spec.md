# Spec Delta

## Purpose

Defines the login screen through which a user enters their user code (in the User field), password and company code to start working in the ERP.

## ADDED Requirements

### Requirement: Login screen layout
The application SHALL show a login screen at `/login`, outside the application shell (no sidebar or navigation menu). It SHALL show the title "Login", then the labelled text fields User, Password and Company stacked vertically in that order, then a "Remember me" checkbox, then the Login and Cancel buttons aligned at the bottom right of the form, Login first.

#### Scenario: Title
- **WHEN** the login screen is displayed
- **THEN** its title reads "Login"

#### Scenario: Fields in order
- **WHEN** the login screen is displayed
- **THEN** User, Password and Company are shown one below the other, each with a visible label

#### Scenario: Buttons at the bottom right
- **WHEN** the login screen is displayed
- **THEN** Login and Cancel are below the fields, aligned to the right, in that order, with Login as the primary button

#### Scenario: Remember me below the fields
- **WHEN** the login screen is displayed
- **THEN** a checkbox labelled "Remember me" is shown below Company and above the buttons, and activating the label toggles it

#### Scenario: No shell
- **WHEN** the login screen is displayed
- **THEN** no sidebar, navigation menu or session details are shown

#### Scenario: Both themes
- **WHEN** the user's theme is dark
- **THEN** the login screen is shown in the dark theme

### Requirement: Mandatory fields
User, Password and Company SHALL be required (BR-001.1). A field's message SHALL appear once the field has been touched or a login was attempted. Login with any field empty SHALL show the messages and SHALL NOT call the backend.

#### Scenario: Login with empty fields
- **WHEN** the user activates Login with all fields empty
- **THEN** the fields show "User is required.", "Password is required." and "Company is required." and no request is sent

#### Scenario: Only spaces
- **WHEN** the user enters only spaces in User and activates Login
- **THEN** User shows the "required" message and no request is sent

### Requirement: Password visibility toggle
The Password field SHALL have an eye icon button on its right inside the field (BR-001.2). The password SHALL be hidden when the screen opens. When the eye is shown closed, the password SHALL be hidden; when it is shown open, the password SHALL be shown as plain text (BR-001.S1). Activating the button SHALL switch between the two. The button SHALL be keyboard operable and named "Show password" or "Hide password" for what it will do.

#### Scenario: Hidden by default
- **WHEN** the login screen opens and the user types a password
- **THEN** the characters are masked and the eye icon is closed

#### Scenario: Show password
- **WHEN** the eye icon is closed and the user activates it
- **THEN** the password is shown as plain text and the eye icon is open

#### Scenario: Hide again
- **WHEN** the eye icon is open and the user activates it
- **THEN** the password is masked and the eye icon is closed

#### Scenario: Accessible name
- **WHEN** a screen reader reads the toggle while the password is hidden
- **THEN** it announces "Show password"

### Requirement: Login action
Activating Login, or pressing Enter in any field, SHALL send the trimmed user code and company code and the unchanged password to the backend. While the request is in flight Login SHALL be disabled and SHALL indicate progress. On success the session SHALL be started and the Dashboard SHALL be shown.

#### Scenario: Successful login
- **WHEN** the user enters valid credentials and activates Login
- **THEN** the Dashboard is shown inside the shell with the session details in the header

#### Scenario: Enter submits
- **WHEN** the user fills all fields and presses Enter in Company
- **THEN** the login is attempted as if Login was activated

#### Scenario: No double submit
- **WHEN** a login request is in flight
- **THEN** Login is disabled and activating it again sends nothing

### Requirement: Login failure
When the backend refuses the login (401 or 403), the screen SHALL stay open, SHALL show the backend's message as a warning notification at the top right of the window, SHALL keep all three fields as typed (including the password), and SHALL re-enable Login. When the backend cannot be reached or fails, the matching error notification SHALL be shown instead.

#### Scenario: Wrong credentials
- **WHEN** the backend answers 401 "Invalid user code, password or company code."
- **THEN** that message is shown as a warning at the top right, User, Password and Company keep their values, and Login is enabled

#### Scenario: Missing working context
- **WHEN** the backend answers 403 "No financial year is set up for this company."
- **THEN** that message is shown as a warning at the top right and the user stays on the login screen with the fields as typed

#### Scenario: Only one message
- **WHEN** the backend refuses the login
- **THEN** exactly one notification is shown: the warning, and no generic error notification

#### Scenario: Server unreachable
- **WHEN** the backend cannot be reached
- **THEN** the network error notification is shown and Login is enabled again

### Requirement: Remember me
The login screen SHALL have a "Remember me" checkbox. When a login succeeds with the box ticked, the application SHALL store the user code and company code as sent (trimmed) and the password unchanged in the browser's local storage. When a login succeeds with the box unticked, it SHALL delete any stored entry. A failed login SHALL NOT change the stored entry. When the login screen opens and an entry is stored, it SHALL fill User, Password and Company with it and tick the box, with the password still hidden. Otherwise the fields are empty and the box is unticked. If the storage is unavailable or holds something unreadable, the screen SHALL behave as if nothing were stored. Remember me SHALL NOT keep the session after the tab is closed.

#### Scenario: Remembered after a successful login
- **WHEN** the user ticks Remember me and logs in successfully, then logs out
- **THEN** the login screen shows the same user code, password (masked) and company code, with Remember me ticked

#### Scenario: Not remembered when unticked
- **WHEN** an entry is stored and the user logs in successfully with Remember me unticked
- **THEN** the stored entry is deleted and the next login screen shows empty fields

#### Scenario: Failed login stores nothing
- **WHEN** Remember me is ticked and the backend refuses the login
- **THEN** the stored entry is unchanged

#### Scenario: Storage unavailable
- **WHEN** the browser blocks local storage
- **THEN** the login screen opens with empty fields and logging in still works

#### Scenario: Not a persistent session
- **WHEN** the user logged in with Remember me ticked and opens the application in a new tab
- **THEN** the login screen is shown, pre-filled

### Requirement: Cancel action
Activating Cancel SHALL reset the login screen: all three fields empty, no validation messages shown, and the password hidden again (BR "Cancel"). Remember me and the stored entry SHALL stay as they are.

#### Scenario: Reset
- **WHEN** the user has typed values, shown the password and seen validation messages, then activates Cancel
- **THEN** all fields are empty, no messages are shown and the password is hidden; Remember me keeps its state
