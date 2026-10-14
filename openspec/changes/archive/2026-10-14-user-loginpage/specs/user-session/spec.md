# Spec Delta

## Purpose

Defines the logged-in state of the application: which APIs and screens require a login, how the session is kept and ended, and how the logged-in user, company, branch and financial year are shown and made available.

## ADDED Requirements

### Requirement: Protected API
Every API endpoint except login SHALL require a valid access token in the `Authorization: Bearer` header. A request without a token, or with an invalid or expired one, SHALL be answered with 401 problem details and SHALL NOT be processed. A new endpoint SHALL be protected without having to opt in.

#### Scenario: No token
- **WHEN** a client requests `GET /api/reports/companies` without a token
- **THEN** the response is 401 problem details and no data is read

#### Scenario: Valid token
- **WHEN** a client requests `GET /api/reports/companies` with a valid token
- **THEN** the response is the same as before this change

#### Scenario: New endpoint
- **WHEN** a developer adds an endpoint without any authentication attribute
- **THEN** calling it without a token returns 401

### Requirement: Session context on the backend
For an authenticated request, the backend SHALL make the logged-in user code, company id and code, branch id and year id available to services through one shared accessor, taken from the token and not from request parameters. This change SHALL NOT alter which data existing endpoints return.

#### Scenario: Context from the token
- **WHEN** a service handling an authenticated request asks for the current company, branch and year
- **THEN** it receives the values carried by the request's token

#### Scenario: Company List unchanged
- **WHEN** a logged-in user opens the Company List
- **THEN** it lists the same companies as before this change

### Requirement: Login required for every screen
Every screen inside the shell SHALL require a session. Opening any such screen without a session SHALL show the login screen instead. Opening the login screen while a session exists SHALL show the Dashboard.

#### Scenario: Not logged in
- **WHEN** a user without a session opens the Dashboard or `/reports/companies`
- **THEN** the login screen is shown and no API request for that screen is sent

#### Scenario: Already logged in
- **WHEN** a logged-in user opens `/login`
- **THEN** the Dashboard is shown

### Requirement: Token sent with requests
While a session exists, every API request SHALL carry the session's token. The login request SHALL be sent without a token.

#### Scenario: Token on requests
- **WHEN** a logged-in user opens the Company List
- **THEN** the request to the API carries the bearer token

### Requirement: Session kept for the browser tab
The session SHALL survive a reload of the page in the same browser tab and SHALL end when the tab is closed. If the browser does not allow storing it, the session SHALL still work until the page is reloaded. A stored session whose token has expired SHALL NOT be used.

#### Scenario: Reload
- **WHEN** a logged-in user reloads the page
- **THEN** the same screen is shown with the same session details, without logging in again

#### Scenario: Expired on reload
- **WHEN** the stored token has passed its expiry time and the user reloads
- **THEN** the login screen is shown

### Requirement: Session expiry during use
When any API request other than login is answered with 401, the application SHALL end the session, show the login screen and show the message "Your session has expired. Please log in again." once.

#### Scenario: Token expires while working
- **WHEN** the user's token has expired and the user opens the Company List
- **THEN** the login screen is shown with the session-expired message, and the session details are gone from the header

### Requirement: Session details in the header
While a session exists, the header SHALL show, at its right, before the theme switch: the user name, then the branch name, then the financial year name, for example `ADMIN   Kochi   2025-2026` (the company is the header's main title, see `app-shell`). The user name SHALL be shown in bold blue, the branch name in red, and the financial year in bold in the theme's text color (black in the light theme); each color SHALL stay readable in both the light and the dark theme. On narrow screens the text SHALL shorten without pushing the header buttons out of view, and the full text SHALL remain available on hover and to screen readers.

#### Scenario: Details shown
- **WHEN** user "ADMIN" of company "Cargomar Pvt Ltd" with branch "Kochi" and year "2025-2026" is logged in
- **THEN** the header shows `ADMIN` (bold blue), `Kochi` (red) and `2025-2026` (bold, the text color) in that order, before the theme switch, and "Cargomar Pvt Ltd" as its main title at the top left

#### Scenario: Narrow screen
- **WHEN** the window is 360 pixels wide
- **THEN** the theme switch and the Logout button stay visible and the details are shortened

### Requirement: Logout
While a session exists, the header SHALL show a Logout icon button named "Log out" after the theme switch. Activating it SHALL end the session in the browser and show the login screen. Afterwards no screen inside the shell SHALL open until the user logs in again.

#### Scenario: Log out
- **WHEN** the logged-in user activates Log out
- **THEN** the login screen is shown and the session details are gone

#### Scenario: Back after logout
- **WHEN** the user logs out and then uses the browser's Back button
- **THEN** the login screen is still shown
