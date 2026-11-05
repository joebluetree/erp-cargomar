# Proposal

## Why

The old system needs to open one menu screen of the new application from a link, without login credentials. Today, the automatic login (`/login?appid=…&menuid=…`) checks the APPDETAILS row's password and the user's allowed branch and year, and shows the full shell. The BRS `kb/modules/admin/common-endpoint.md` v1.0 (BR-001) asks for a common endpoint that:
- takes `appid` and `menuid`;
- reads the details from APPDETAILS, without checking login credentials;
- navigates to the menu's component by the normal routing, with the menu's own URL parameters;
- hides the navigation bar and header;
- keeps rights checking and everything else working as on the menu.

## What Changes

- **Common endpoint:** a new frontend address `/view?appid=<id>&menuid=<menu code>` (BR-001.1). Other parameters are ignored.
- **No login, no token: the appid on every request.**
  - A new backend endpoint `POST /api/admin/login/common-view` with the body `{ appId }` checks the row: one row, `USER_LOGGED_OUT` = 'N', and a user (not deleted), company, branch and year that exist. It does not check the password, a lock on the user, or the user's allowed branches and years. It returns the row's details, with no token.
  - The frontend keeps those details with the appid in place of any session the tab has, marked as the common view, and sends the appid (header `X-App-Id`) with every request instead of a token.
  - The backend accepts `X-App-Id` on every protected endpoint as a second way to authenticate. It checks the row again for each request and runs the request as the row's user, branch and year. If the old system logs the row out, the next request answers 401, and the page shows "This link is not valid."
- **Normal routing to the menu:** the common view finds `menuid` in the user's menu and opens `/<route>?menuId=<code>`, as a menu link does. Examples:
  - `NS-EMPPROFILE` → `/admin/profile?menuId=NS-EMPPROFILE` (BR-001.S1);
  - `NS-HOLIDAYLIST` → `/admin/holidays?menuId=NS-HOLIDAYLIST`.

  Any menu in the user's menu can be opened. The menu's own rights check, screen and buttons apply unchanged.
- **Header and navigation hidden:** in the common view, the Shell shows only the content area: no announcement bar, header or sidebar. A normal login shows the full shell again.
- **Back goes to the previous page:** the common view has no Dashboard. A screen's Back, which opens the Dashboard when there is no earlier page in the app, goes to the previous page in the browser history instead, such as the page that opened the link.
- **Failures:** an invalid link shows "This link is not valid.", and a menu that is missing or not in the user's menu shows "The requested screen is not available.", each alone on a bare page.
- **No change to the screens:** Profile, Holiday List, Upload and every other menu screen stay as they are.
- **Not in scope:**
  - choosing another user, branch or year on the link;
  - any change to the login, the automatic login or `/login?appid=` behaviour.

## Capabilities

### New Capabilities

- `common-view`: the `/view` address, the APPDETAILS details (`POST /api/admin/login/common-view`) and the `X-App-Id` authentication, the normal routing to the menu, the content-only display, Back and the failure messages.

### Modified Capabilities

- `app-shell`: the Shell shows only the content area for a common view session, and `/view` is displayed outside the shell.

## Impact

- **Backend:**
  - `LoginService` gains `ResolveCommonViewAsync`, which reads the row and its user, company, branch and year, and `ILoginRepository` a user lookup that includes locked users.
  - `LoginController` gains `POST common-view` (`[AllowAnonymous]`, as the other logins).
  - A second authentication scheme (`AppIdAuthenticationHandler`, header `X-App-Id`) gives a request the same claims a token carries. The default policy accepts either scheme.
  - No table or migration. Nothing is written.
- **Frontend:**
  - a `/view` route outside the shell, with a guard that reads the details and opens the menu, and a message page;
  - `Session` gains optional `commonView` and `appId` fields: the Shell hides its header, sidebar and announcement bar, and the interceptors send `X-App-Id` and turn a 401 into "This link is not valid.";
  - the Dashboard route sends the common view back a page, and the menu-access check lets a 401 end the navigation instead of showing "no access";
  - no change to the Profile, Holiday List or other screens.
- **Security:** while its row is not logged out, `appid` works like a password for the row's user. Logging the row out ends it at the next request. It is in the address bar of `/view`, the browser history and the server's request logs. The user's menu rights still apply to every screen and action. See design.md.
- **Depends on:** the APPDETAILS mapping (`user-auto-login`), the session (`user-session`) and the menu rights (`user-menu-access`). All are implemented.
- **Docs:** `kb/modules/admin/common-endpoint.md` says v1.0 is Proposed. Per CLAUDE.md, the kb is not edited here.
