# user-login-page Specification

## Purpose
Defines the login screen through which a user enters their user code (in the User field), password and company code to start working in the ERP.

## Requirements

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

### Requirement: Automatic login from the URL
When `/login` is opened with a non-blank `appid` query parameter, the application SHALL send the id to the backend's automatic login before the login screen is shown (BR-001.S1). The login screen SHALL NOT be shown at any point of a successful automatic login: while the request is in flight nothing of it is drawn, and on success the session SHALL be started and the Dashboard SHALL be shown directly, exactly as after a normal login. The address carrying the id SHALL be replaced, not kept in the history. The automatic login SHALL NOT read or change Remember me.

When the tab already has a session, an `appid` link SHALL end that session first and then run the automatic login as above, so the link always decides who is logged in. A refused link SHALL show the login screen, never the Dashboard of the earlier session.

#### Scenario: Logged in from the link
- **WHEN** the user opens `/login?appid=<id>` for a row that allows the login
- **THEN** the Dashboard is shown inside the shell with that row's user, branch and year in the header, and the login screen is never shown

#### Scenario: Id removed from the address
- **WHEN** `/login` is opened with an `appid` parameter
- **THEN** the address bar ends without the id (`/` on success, `/login` on failure), and going back does not return to the address with the id

#### Scenario: Remember me untouched
- **WHEN** an entry is remembered and an automatic login succeeds
- **THEN** the remembered entry is unchanged

#### Scenario: Session already open
- **WHEN** a tab with a session opens `/login?appid=<id>`
- **THEN** the tab's session is ended and the automatic login runs with the id

#### Scenario: Logged-out link in a logged-in tab
- **WHEN** a tab with a session opens `/login?appid=<id>` for a row with `USER_LOGGED_OUT` = 'Y'
- **THEN** the login screen is shown with the warning, and the Dashboard of the earlier session is not shown

#### Scenario: Blank id
- **WHEN** the login screen opens with `appid=` (empty)
- **THEN** the normal login screen is shown and nothing is sent

### Requirement: Automatic login failure
When the backend refuses the automatic login, or cannot be reached, the normal login screen SHALL be shown, with its fields enabled and filled as the screen fills them normally (from Remember me, or empty). Exactly one warning notification, "Automatic login failed. Please log in.", SHALL be shown at the top right of the window.

#### Scenario: Refused
- **WHEN** the backend answers the automatic login with 401
- **THEN** the login screen is shown with the warning "Automatic login failed. Please log in." and the user can log in by typing

#### Scenario: Server unreachable
- **WHEN** the backend cannot be reached during the automatic login
- **THEN** the login screen is shown with the same single warning, and no other notification

### Requirement: Automatic login opens the linked menu
When an automatic login from `/login?appid=<id>` succeeds and the URL also has a non-blank `menuid` parameter, the application SHALL open the screen of the user's menu whose code (`MENUM.MENU_CODE`) equals it, ignoring surrounding spaces and letter case, at its route (`MENUM.MENU_ROUTE1`), in place of the Dashboard (BR-002.1). Without `menuid`, or with a blank one, the Dashboard SHALL open as before (BR-002.2).

#### Scenario: Profile from the link
- **WHEN** a user with the view right on Profile opens `/login?appid=<id>&menuid=NS-EMPPROFILE` for a row that allows the login
- **THEN** the Profile screen is shown inside the shell, and neither the login screen nor the Dashboard is shown

#### Scenario: No menu id
- **WHEN** a user opens `/login?appid=<id>` for a row that allows the login
- **THEN** the Dashboard is shown, as before

#### Scenario: Blank menu id
- **WHEN** a user opens `/login?appid=<id>&menuid=` for a row that allows the login
- **THEN** the Dashboard is shown, with no warning

#### Scenario: Code in another case
- **WHEN** the link has `menuid= ns-empprofile ` and the user may open Profile
- **THEN** the Profile screen is shown

### Requirement: Linked menu address
When the linked menu opens, the address bar SHALL show that screen's normal address, `/<route>?menuId=<code>`, as when the screen is opened from the menu. The address with `appid` and `menuid` SHALL be replaced, not kept in the history.

#### Scenario: Address after opening the menu
- **WHEN** the automatic login opens Profile from `menuid=NS-EMPPROFILE`
- **THEN** the address bar shows `/admin/profile?menuId=NS-EMPPROFILE`, and going back does not return to the address with `appid`

### Requirement: Linked menu not available
When the `menuid` is not the code of a menu in the user's menu (an unknown code, or no view right in the session branch), or the user's menu cannot be loaded, the user SHALL stay logged in, the Dashboard SHALL open, and exactly one warning notification, "The requested screen is not available.", SHALL be shown.

#### Scenario: Unknown code
- **WHEN** the automatic login succeeds with `menuid=NO-SUCH-MENU`
- **THEN** the Dashboard is shown with the warning "The requested screen is not available." and the session is kept

#### Scenario: No view right
- **WHEN** the automatic login succeeds with `menuid=NS-EMPLIST` for a user without the view right on Employee List in the session branch
- **THEN** the Dashboard is shown with the same single warning, and the Employee List is not opened

#### Scenario: Menu cannot be loaded
- **WHEN** the automatic login succeeds with a `menuid` and the user's menu cannot be loaded
- **THEN** the Dashboard is shown with the same single warning

### Requirement: Menu id ignored when the automatic login fails
A failed automatic login SHALL behave as without `menuid`: the login screen is shown with the single warning "Automatic login failed. Please log in.", and no other notification is shown. A `menuid` without an `appid` SHALL be ignored, and the login screen opens as usual.

#### Scenario: Refused login with a menu id
- **WHEN** the backend refuses the automatic login for `/login?appid=<id>&menuid=NS-EMPPROFILE`
- **THEN** the login screen is shown with only the warning "Automatic login failed. Please log in."

#### Scenario: Menu id alone
- **WHEN** `/login?menuid=NS-EMPPROFILE` is opened
- **THEN** the normal login screen is shown and nothing is sent
