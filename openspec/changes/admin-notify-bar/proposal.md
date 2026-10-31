## Why

The company wants to show announcements to every user of the new iErp screens. The legacy table `GENINFO` already stores them as a short heading and a longer content. Nothing in iErp shows them yet. BRS: `kb/modules/admin/notification-bar.md` v1.0 (BR-001).

## What Changes

- **Scrolling notification bar.** A bar like the ICEGATE portal's "latest news" ticker (`kb/ui-templates/admin/scrolling-notify-bar1.JPG`), white with navy text (black with white text in the dark theme), sits in the shell, just above the header. It shows the banner text (`GENINFO.BANNER`, or the heading when there is no banner) of the latest notification, exactly as entered, shown once at a time, moving from right to left inside a lane inset a little from both ends. Decided by the user: it is on every screen after login, not only on the Dashboard.
- **Latest notification.** Only rows with `VISIBLE` 'Y' count (the user's request; `VISIBLE` CHAR(1) was added to the table during this change). The latest is the visible row with the newest `REC_CREATED_DATE`, then the highest `ID` (BR-001.3, BR-001.S2). When every row is 'N', there is no notification and no bar. Only that one notification scrolls.
- **No notification, no bar.** When `GENINFO` has no row with a banner or a heading, the bar is not shown and the header stays where it is today. The dev table is empty.
- **Notification screen.** A click anywhere on the bar, or Enter on it, opens a **Notification** screen in the content area (BR-001.2, BR-001.S1):
  - the screen title is "Notification";
  - below the title is one box like the Holiday List's that fits its text: as wide as the longest line and as high as the lines (decided by the user);
  - the box shows the heading and, below it, the content (BR-001.S3), both exactly as entered, with every space and line break;
  - the screen is view only.
- **Access.** Every logged-in user sees the bar and can open the screen. No menu right is needed, as for the Dashboard (decided by the user). `GENINFO` has no company or branch column, so everyone sees the same notification.
- **Read-only API.** `GET /api/admin/notification` returns the latest notification's banner, heading, content and created date, exactly as entered,, or 404 when there is none. The legacy table is read only; it is never written or migrated.

## Capabilities

### New Capabilities

- `notification-api`: the read-only backend endpoint that returns the latest `GENINFO` notification.
- `notification-bar`: the scrolling bar above the header and the Notification screen it opens.

### Modified Capabilities

- `app-shell`: a new layout requirement places the notification bar above the header, shown only when there is a notification. The existing requirements are unchanged.

## Impact

- **Backend:**
  - new `Notification` entity and its `GENINFO` mapping (`iErp.Entities`, `iErp.Data`), read-only and excluded from migrations;
  - new `iErp.Admin/Notification` with a repository, service and `NotificationController`, registered in `AdminRegistration`;
  - backend tests:
    - a unit test of the mapping;
    - a service test of the latest-row rule;
    - an endpoint test of 200, 404 and 401;
    - an Oracle-gated table test against the real `GENINFO`, read only.
- **Frontend:**
  - the shell gains the bar component (in the initial download);
  - a new lazy route `/admin/notification` holds the Notification screen and its service;
  - new theme values for the bar's colors, defined once like the other colors;
  - vitest specs for the bar, the screen and the service.
- **Data:** `GENINFO` (`ID` NUMBER, `HEADING` NVARCHAR2(1000), `CONTENT` NVARCHAR2(2000), `REC_CREATED_DATE` DATE, and `BANNER` NVARCHAR2(1000), added later by the user) has no primary key, no company or branch columns, and no rows in the dev database.
- **Knowledge base:** `kb/` is not changed by this change.
