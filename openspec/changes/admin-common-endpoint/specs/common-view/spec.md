# Spec Delta

## Purpose

Lets another system open one menu screen of the application from a link, without a login or token. The link carries the user's APPDETAILS id and a menu code. Every request then sends the id, and the backend runs it as the APPDETAILS row's user, company, branch and financial year. The menu's own screen opens by the normal routing, with only the content area shown.

## ADDED Requirements

### Requirement: Common view address
The application SHALL accept the address `/view` with the query parameters `appid` and `menuid`. `menuId` SHALL also be accepted for `menuid`. Surrounding spaces in the values SHALL be ignored. Any other parameter, such as `userid`, `branchid` or `yearid`, SHALL be ignored and SHALL NOT change the user, branch, year or record shown.

#### Scenario: Holiday List link
- **WHEN** the browser opens `/view?appid=A1&menuid=NS-HOLIDAYLIST` and `A1` is a valid link whose user has the Holiday List in their menu
- **THEN** the address becomes `/admin/holidays?menuId=NS-HOLIDAYLIST` and the Holiday List is shown

#### Scenario: Profile link
- **WHEN** the browser opens `/view?appid=A1&menuId=ns-empprofile`
- **THEN** the address becomes `/admin/profile?menuId=NS-EMPPROFILE` and the Profile of A1's user is shown

#### Scenario: Other parameters ignored
- **WHEN** the link also has `userid`, `branchid` or `yearid`
- **THEN** the screen shows the same user, branch and year as without them

### Requirement: Details from APPDETAILS, without a login or token
The common view SHALL NOT log in and SHALL NOT issue or use a session token. An APPDETAILS link SHALL be valid only when:
- there is exactly one APPDETAILS row for the id (compared without surrounding spaces);
- its `USER_LOGGED_OUT` is 'N' (ignoring case and surrounding spaces);
- it names a user of its company that is not deleted, that company, a branch of that company and a financial year of that company, all of which exist.

The password, the user's lock and the branches or years the user may switch to SHALL NOT be checked. The reason for a refusal SHALL be logged without the app id. Nothing SHALL be written to the database.

- The backend SHALL expose `POST /api/admin/login/common-view`, without a token, with the body `{ "appId": "<id>" }`. For a valid link it SHALL answer 200 with the row's session details (user, company, branch and financial year, as `POST /api/admin/login` answers them under `session`), and no token. Any failure SHALL answer 401 problem details "This link is not valid.", the same for every cause.
- Every protected endpoint SHALL also accept a request with the header `X-App-Id: <id>` in place of a token. The backend SHALL check the link again for each such request, and run it as the row's user, company, branch and financial year, exactly as a token of that user would. For a link that is not valid, it SHALL answer 401.
- The frontend SHALL keep the row's details and the app id in place of any session the tab has, marked as the common view, and SHALL send `X-App-Id` instead of a token with every request. A 401 to any request SHALL then show only "This link is not valid.", with no login screen.
- A failure of the link SHALL show only "This link is not valid." on a bare page, and a link without `appid` SHALL show it without a request.

#### Scenario: No token
- **WHEN** the common view opens a screen
- **THEN** no token is issued, and every request of the screen sends `X-App-Id` and no `Authorization` header

#### Scenario: Logged out while the screen is open
- **WHEN** the screen is shown and the old system then sets the row's `USER_LOGGED_OUT` to 'Y'
- **THEN** the next request answers 401 and the page shows "This link is not valid."

#### Scenario: Valid row
- **WHEN** the row for `A1` has `USER_LOGGED_OUT` = 'N' and names user "RAVI" of "CPL", branch "BLRAF" and year "2026"
- **THEN** the screen is shown for RAVI, in BLRAF, for 2026

#### Scenario: Password not checked
- **WHEN** the row's password is not the user's password
- **THEN** the link still opens the screen

#### Scenario: Branch not in the user's allowed branches
- **WHEN** the row's branch is a branch of the company that the user may not switch to
- **THEN** the link still opens the screen in that branch

#### Scenario: Logged-out row
- **WHEN** the row for `A1` has `USER_LOGGED_OUT` = 'Y'
- **THEN** the page shows "This link is not valid." and nothing is kept

#### Scenario: Unknown app id
- **WHEN** no row, or more than one row, has the link's `appid`
- **THEN** the page shows "This link is not valid."

#### Scenario: Missing app id
- **WHEN** the browser opens `/view?menuid=NS-EMPPROFILE`
- **THEN** the page shows "This link is not valid." and sends no request

#### Scenario: Tab with another session
- **WHEN** the tab has a session of user "ANU" and opens a valid link of user "RAVI"
- **THEN** ANU's session is replaced, and the screen is RAVI's

### Requirement: Menu opened by normal routing
After the link's details have been read, the common view SHALL look up `menuid` (ignoring case and surrounding spaces) in the row user's menu. It SHALL open that menu's route with the menu's URL parameter, `/<menu route>?menuId=<menu code>`, as a menu link does, replacing the `/view` address in the history. From there the menu's own route, rights check, screen, buttons and actions SHALL apply unchanged. A missing or blank `menuid`, or one that is not in the user's menu, SHALL show only "The requested screen is not available." on a bare page.

#### Scenario: Rights as on the menu
- **WHEN** the link opens the Holiday List for a user with the Holiday List admin right in the row's branch
- **THEN** the Upload button is shown, as on the menu

#### Scenario: Menu not in the user's menu
- **WHEN** the link has `menuid=NS-EMPLIST` and the row's user has no view right on the Employee List in the row's branch
- **THEN** the page shows "The requested screen is not available."

#### Scenario: No menu
- **WHEN** the link has an `appid` and no `menuid`
- **THEN** the page shows "The requested screen is not available."

#### Scenario: Reload
- **WHEN** the user reloads the tab after the screen has been shown
- **THEN** the same screen is shown again, for the same row and with only the content area

### Requirement: Only the content area
While the tab is in the common view, the application SHALL show only the content area of the shell: no announcement bar, header, sidebar or menu button. It SHALL have no Dashboard: a screen's Back, or any other way to the Dashboard, SHALL go to the previous page in the browser history, such as the page that opened the link. A normal login SHALL end the common view and show the full shell again.

#### Scenario: Back goes to the previous page
- **WHEN** the Holiday List was opened from the common view and the user chooses Back
- **THEN** the browser goes to the previous page, and the Dashboard is never shown

#### Scenario: No header or sidebar
- **WHEN** the Profile is shown from the common view
- **THEN** the page has no header, no sidebar, no menu button, no session details, no Change branch, theme or Log out button, and no announcement bar

#### Scenario: Narrow window
- **WHEN** the link is opened in a narrow window, such as inside the old system's frame
- **THEN** the screen uses the full width of the window, with no space reserved for a sidebar
