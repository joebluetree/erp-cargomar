# Spec Delta

## ADDED Requirements

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
