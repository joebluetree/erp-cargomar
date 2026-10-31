# Tasks

## 1. Backend

- [x] 1.1 Mapping (D1): add `iErp.Entities/Notification.cs` (`Id` `decimal?`, `Heading`, `Content`, `CreatedDate` `DateTime?`) and `iErp.Data/Configurations/NotificationConfiguration.cs`. The configuration maps `GENINFO` keyless (`HasNoKey()`), with the columns `ID`, `HEADING` (1000), `CONTENT` (2000) and `REC_CREATED_DATE`. Verify with `Unit/NotificationMappingTests`, like `EmployeeMappingTests`:
  - the table and column names;
  - the entity has no key;
  - the model builds.
- [x] 1.2 Latest-row query (D2): add `INotificationRepository.FindLatestAsync`/`NotificationRepository`. Verify with `Unit/NotificationQueryTests`, using `ToQueryString()`:
  - the SQL reads `GENINFO`;
  - it filters out empty headings;
  - it orders by created date descending, then id descending, with nulls last through the `IS NULL` flags;
  - it holds no `TRUE`/`FALSE`.
- [x] 1.3 Service (D2): add `INotificationService.GetLatestAsync`/`NotificationService` and the `NotificationDto(Id, Heading, Content, CreatedDate)`. Verify with `Admin/NotificationServiceTests`, using a substitute repository:
  - the heading and content are trimmed;
  - an empty content gives null;
  - line breaks inside the content are kept;
  - no row gives null.
- [x] 1.4 Endpoint (D2): add `NotificationController` (`GET api/admin/notification`, no `[RequiresMenu]`) with `NotFoundMessage` "Notification not found.". Register the repository and service in `AdminRegistration`. Verify with `Integration/NotificationEndpointTests`, using a substitute repository:
  - 200 returns `{ id, heading, content, createdDate }` in camel case;
  - 404 has the message "Notification not found.";
  - no token gives 401;
  - a token without any menu rights still gets 200.
- [x] 1.5 Oracle-gated table test: add `Integration/NotificationTablesTests`, run only with `IERP_TEST_ORACLE`, in the pattern of `EmployeeListTablesTests`.
  - When the test schema has no `GENINFO`, it creates a shaped one and fills it with rows with dates, without dates, without ids and with blank headings. The query must return the row the spec names in "Newest date wins", "Same date, highest id" and "Empty heading skipped". It then drops the table.
  - When the schema has `GENINFO`, as the dev database does, the test only reads it: the query's answer must equal a plain `SELECT` in the same order. That is no row while the table is empty.
  - `IERP_TEST_ORACLE` is never pointed at the dev database by this change.

  Verify that the test is skipped without `IERP_TEST_ORACLE` and that `dotnet test -c Release` passes.

## 2. Frontend: the bar

- [x] 2.1 Model and store (D3): add `core/announcement/announcement.model.ts` and `core/announcement/announcement.store.ts`. The store is a root service that loads `admin/notification` with `SKIP_LOADING` and `SKIP_ERROR_NOTIFICATION`. Verify with `announcement.store.spec.ts`:
  - it loads once when a session starts and once when the app opens with a kept session;
  - a branch or year switch does not load again;
  - another user's login loads again;
  - logout clears the announcement;
  - 404 and other failures give no announcement and no error notification;
  - an older answer is dropped;
  - the request does not turn on the loading spinner.
- [x] 2.2 Theme values (D4): add `--announcement-bg`/`--announcement-fg` and `--animate-announcement` with its keyframes to `styles.css`, for the light and the dark theme. Verify that the text on the bar's color is at least 4.5:1 in both themes, and that the common-look test still passes (no color literals outside the theme).
- [x] 2.3 Bar component (D4): add `shell/announcement-bar.ts` and place it before the header in `shell.html`, shown only with an announcement. Verify with `announcement-bar.spec.ts` and `shell.spec.ts`:
  - the bar is the first element of the content column, above the header, only with an announcement;
  - it shows the heading;
  - a click anywhere on it, and Enter, open `/admin/notification`;
  - it has the accessible name "Notification: <heading>. Open the notification", with the moving text `aria-hidden`;
  - it has the hand pointer and the pause on hover and focus;
  - the heading moves inside a lane inset from both ends of the bar, entering at its right end;
  - its reduced-motion classes stop the animation and truncate the heading;
  - with no announcement the header is the first element;
  - the login screen has no bar.
- [x] 2.4 Lazy loading: verify with `npx ng build` that the bar adds no feature chunk to the initial download, and that the existing shell lazy-loading test still passes.
- [x] 2.5 Look of the ICEGATE ticker (D4, the user's request; `kb/ui-templates/admin/scrolling-notify-bar1.JPG`): white with navy text (black with white text in the dark theme, the user's later choice), normal weight, the latest notification shown once at a time. Verify with `announcement-bar.spec.ts`:
  - one flat color, no gradient, fading or bold;
  - the text is shown once, with no repeats or dividers, entering at the lane's right end;
  - a longer text gets more time;
  - reduced motion shows it still at the left of the lane, cut;
  - the theme values (`#ffffff`/`#183473` light, `#000000`/`#ffffff` dark), the line below the bar, and the `-100%` keyframe.

## 3. Frontend: the Notification screen

- [x] 3.1 Service (D3): add `features/admin/notification/notification.service.ts` for the feature routes. It has `load()` with the spinner, 404 as `notFound` with no notification, and other failures as `error` with the one error notification. Verify with `notification.service.spec.ts`:
  - success, 404 and failure states;
  - an older answer is dropped.
- [x] 3.2 Screen and route (D5): add `notification.routes.ts`, `notification.page.ts` and `notification.page.html`, and route `admin/notification` in `app.routes.ts` with no menu guard. Verify with `notification.page.spec.ts`:
  - the Back button, then the title "Notification" (`appPageTitle`), then the box, in that order;
  - the heading heads the box, and the content below it keeps its line breaks;
  - the box has the Holiday List box's look and fits its text (`w-fit h-fit max-w-full`), with no fixed width or height;
  - with no content, only the heading shows;
  - "There is no notification." shows with no error notification on 404;
  - a failure shows the alert, and Retry asks again;
  - there are no inputs or edit actions;
  - the screen opens without menu rights;
  - Back goes to the previous screen, or to the Dashboard when the screen was opened directly.
- [x] 3.3 Run `npm test -- --no-watch` and `npx ng build`: all tests pass and the build has no warnings.

## 3a. Banner text and exact text (the user's request)

- [x] 3a.1 Backend: map `BANNER`, keep rows with a banner or a heading, and return `banner`, `heading` and `content` exactly as entered, never trimmed. Verify with:
  - `NotificationMappingTests`: the `BANNER` column;
  - `NotificationQueryTests`: the banner-or-heading filter, with no `TRUE`/`FALSE`;
  - `NotificationServiceTests`: spaces and line breaks are kept, a banner alone or a heading alone is a notification, and neither is none;
  - `NotificationEndpointTests`: `banner` in the answer;
  - `NotificationTablesTests`: the shaped table has `BANNER`, and a banner alone comes back exactly.
- [x] 3a.2 Bar: shows the banner, or the heading without one, exactly as entered, with each line break as a wide gap. Verify with `announcement.store.spec.ts` (`barText`) and `announcement-bar.spec.ts`: spaces kept, gaps, one line, and a readable accessible name.
- [x] 3a.3 Notification screen: the heading (or the banner without one) and the content, exactly as entered, with `whitespace-pre` (no line wrapped) in a box that fits the text and scrolls a too-wide line sideways. Verify with `notification.page.spec.ts`: leading, inner and trailing spaces, blank lines, and the banner fallback.
- [x] 3a.4 Visible rows only (the user's request): map `VISIBLE` (CHAR(1), fixed length) and keep only rows with 'Y' (either case) before taking the latest; with every row 'N' there is no notification (404, no bar). Verify with `NotificationMappingTests` (the column), `NotificationQueryTests` (the `VISIBLE` = 'Y'/'y' filter, no `TRUE`/`FALSE`) and the Oracle-gated `NotificationTablesTests` (newer 'N' and empty rows skipped, 'y' kept, all 'N' gives none).
- [x] 3a.5 More details prompt (the user's request): the bar adds "Click here for more Details" after the text, apart and underlined, moving with it, and only in the bar. Verify with `announcement-bar.spec.ts` (the phrase, its place after the text inside the moving copy, its look, and the text itself unchanged) and `shell.spec.ts`.

## 4. Specs and hand check

- [x] 4.1 Validate the change with `openspec validate admin-notify-bar --strict`.
- [ ] 4.2 Check the running app by hand. This needs a test row in `GENINFO`, added by the user or an administrator; this change does not write it:
  - the white (or, in the dark theme, black) bar scrolls above the header, the text once at a time, a little inside both ends, on the Dashboard and on another screen;
  - it pauses on hover;
  - a click opens the Notification screen with the heading and content in the box;
  - with the row removed and the app reloaded, the bar is gone;
  - after a branch switch the bar stays, and no second request is made.
- [x] 4.3 Leave `kb/modules/admin/notification-bar.md` unchanged; per CLAUDE.md the knowledge base is updated only on request. Tell the user that its Change History still says Proposed, so they can ask for the update.
