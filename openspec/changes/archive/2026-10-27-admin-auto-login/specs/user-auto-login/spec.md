# Spec Delta

## Purpose
Provides the backend automatic login: from the id of an `APPDETAILS` row written by the old system, it logs that user in with the row's details and returns the same session details and access token as the normal login.

## ADDED Requirements

### Requirement: Auto-login endpoint
The system SHALL expose `POST /api/admin/login/auto`, which accepts a JSON body with `appId` and SHALL NOT require a token. `appId` SHALL be required and non-blank, and its length SHALL be limited to what the `USER_APPID` column holds. A missing, blank or too long `appId` SHALL be answered with 400 problem details naming `appId`, and no lookup SHALL be made. The endpoint SHALL NOT change any data.

#### Scenario: Endpoint open without a token
- **WHEN** a client posts an app id without an `Authorization` header
- **THEN** the request is processed and is not rejected with 401 for lacking a token

#### Scenario: Missing app id
- **WHEN** a client posts an empty body
- **THEN** the response is 400 and names `appId`

#### Scenario: Other methods
- **WHEN** a client sends GET, PUT, PATCH or DELETE to the endpoint
- **THEN** the response is 405 and no data changes

### Requirement: Login details from APPDETAILS
The system SHALL find the `APPDETAILS` row whose `USER_APPID` equals `appId`, ignoring surrounding spaces (BR-001.1). It SHALL log in only when exactly one such row exists and its `USER_LOGGED_OUT` is 'N', ignoring surrounding spaces and letter case.

#### Scenario: Not logged out
- **WHEN** a client posts the id of a row with `USER_LOGGED_OUT` = 'N' and correct login details
- **THEN** the response is 200 with the session details and a token

#### Scenario: Logged out
- **WHEN** a client posts the id of a row with `USER_LOGGED_OUT` = 'Y', or with the column empty
- **THEN** the login fails

#### Scenario: Unknown id
- **WHEN** a client posts an id that no row has
- **THEN** the login fails

### Requirement: Same credential check as the login
The row's `USER_CODE`, `USER_PASSWORD` and `USER_COMPANY_CODE` SHALL be checked against `USERM` and `COMPANYM` by the same rules as `POST /api/admin/login` (BR-001.2):
- a not-deleted, not-locked user of that code and company;
- a not-deleted company of that code;
- a password that matches the user's stored password.

`APPDETAILS` holds the password as typed in plain text. It SHALL be compared the way the login screen sends it: in upper case.

#### Scenario: Matching details
- **WHEN** the row holds the code, plain password and company code of an active user
- **THEN** the login succeeds

#### Scenario: Password in lower case
- **WHEN** the row holds the user's password in lower case and the user's stored password is its upper-case form
- **THEN** the login succeeds

#### Scenario: Wrong password
- **WHEN** the row holds a password that does not match the user's
- **THEN** the login fails

#### Scenario: Locked user
- **WHEN** the row names a user who is locked or deleted in `USERM`
- **THEN** the login fails

### Requirement: Branch and year from APPDETAILS
The session SHALL use the row's `USER_BRANCH_ID` as its branch and the row's `USER_YEAR_ID` as its year.
- The branch SHALL be one the user may switch to in that company, by the same rule as the branch switch.
- The year SHALL be one the user may switch to: an open year of that company, by the same rule as the branch switch.
- An empty `USER_BRANCH_ID` SHALL fall back to the user's default branch, as the normal login does. An empty `USER_YEAR_ID` SHALL fall back to the company's latest financial year.
- A branch or year that is set but not allowed SHALL make the login fail.

#### Scenario: Branch and year of the row
- **WHEN** the row names an allotted branch "Chennai" and a year of the company that is not the latest
- **THEN** the session's branch is "Chennai" and its year is the row's year

#### Scenario: Empty branch and year
- **WHEN** the row's branch and year are empty
- **THEN** the session has the user's default branch and the company's latest year, as after a normal login

#### Scenario: Branch not allotted
- **WHEN** the row names a branch the user may not switch to
- **THEN** the login fails and no token is issued

#### Scenario: Year of another company
- **WHEN** the row names a year that belongs to another company
- **THEN** the login fails and no token is issued

### Requirement: Same answer as the login
A successful automatic login SHALL return the same body as `POST /api/admin/login`: the token, its expiry and the session details. The token SHALL be issued and SHALL expire in the same way, and SHALL be accepted by every protected endpoint.

#### Scenario: Token works
- **WHEN** a client uses the token from an automatic login on a protected endpoint
- **THEN** the endpoint answers as for a token from a normal login

### Requirement: One failure answer
Every failed automatic login SHALL be answered with 401 problem details carrying the single message "Automatic login failed. Please log in.". This applies whatever the reason: an unknown id, a logged-out user, wrong details, a missing working context, or a branch or year that is not allowed. The response SHALL NOT reveal the reason.

The reason SHALL be logged. The log SHALL contain neither the password nor the app id.

#### Scenario: Same answer for every reason
- **WHEN** one client posts an unknown id and another posts the id of a logged-out user
- **THEN** both responses are 401 with the same message and shape

#### Scenario: Secrets never logged
- **WHEN** any automatic login is handled
- **THEN** no log entry contains the row's password or the posted app id

### Requirement: APPDETAILS read only
The automatic login SHALL only read `APPDETAILS`, `USERM`, `COMPANYM` and `YEARM`, and the branches allotted to the user. The application SHALL NOT create, alter or write `APPDETAILS`; in particular, logging out SHALL NOT change `USER_LOGGED_OUT`. Applying the application's migrations SHALL leave `APPDETAILS` unchanged. The queries SHALL run on Oracle 10.2.

#### Scenario: Migrations leave APPDETAILS alone
- **WHEN** the application's migrations are applied to a schema containing `APPDETAILS`
- **THEN** its structure and rows are unchanged

#### Scenario: Logout does not write
- **WHEN** a user who logged in automatically logs out
- **THEN** their `APPDETAILS` row is unchanged
