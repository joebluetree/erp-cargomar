# Design

## Context

See proposal.md for the motivation. The current state:

- **`GENINFO` table** (read from the dev database with SELECTs only):
  - its columns are `ID` NUMBER, `HEADING` NVARCHAR2(1000), `CONTENT` NVARCHAR2(2000) and `REC_CREATED_DATE` DATE, all nullable;
  - it has no primary key, no index and no trigger;
  - it has no rows in dev.
- **Legacy table mappings:** read-only tables such as `PARAM` (`ParameterConfiguration`) are mapped in `iErp.Data/Configurations`, one configuration per entity, discovered by `AppDbContext`. They are never migrated.
- **Single-row queries on 10g:** `FirstOrDefaultAsync` gives `FETCH FIRST 1 ROWS ONLY`. `Oracle10gCompatibilityInterceptor` rewrites that into a ROWNUM wrapper around the ordered query, so the order is applied before the row is taken.
- **404 as a normal answer:** `HolidaysController` answers 404 with `ApiProblem.Create(...)`. `HolidayListService` (frontend) sends `SKIP_ERROR_NOTIFICATION`, treats 404 as a state, and notifies other failures itself.
- **Requests without the spinner:** `SKIP_LOADING` (`core/loading/loading.interceptor.ts`) keeps a request from freezing the screen.
- **Shell:** `shell/shell.html` is a column. The `<header>` comes first, then the sidebar and `<main>`. The shell must not import feature code statically (`app-shell`: "Shell stays out of feature lazy loading"). The Change Branch dialog is loaded with `import()` for that reason.
- **Session start versus branch switch:** `AuthSession.session()` changes on both. `TableStateStore` tells them apart by `userCode`; a branch switch keeps the user.
- **Name clash:** `core/notifications/NotificationService` is the toast service. The new feature needs other names in the code.

## Goals / Non-Goals

**Goals:**
- One small request per session for the bar, never blocking or freezing the screen, and silent when it fails.
- A Notification screen built like the Holiday List: the same box, states and Back button.

**Non-Goals:**
- Writing, adding or editing notifications. They are entered in the legacy system.
- More than one notification in the bar, or a list of past notifications.
- Showing a notification per company or branch. `GENINFO` has no such columns.
- Live updates while the app is open (polling or push). A reload or a new login shows a new notification.
- A menu entry or menu right for the screen.
- Rich text. The content is plain text with line breaks.

## Decisions

### D1. Backend: a keyless, read-only `GENINFO` mapping
- `iErp.Entities/Notification.cs` has the properties `Id` (`decimal?`), `Banner`, `Heading`, `Content` and `CreatedDate` (`DateTime?`). `BANNER` (NVARCHAR2(1000)) was added to the table by the user during this change; it holds the bar's text.
- `iErp.Data/Configurations/NotificationConfiguration.cs` maps `GENINFO` with `HasNoKey()`, because the table has no key and `ID` may be null or repeated. Keyless queries are never tracked, so EF cannot write the table.
  - `ID` is a `decimal?` because `NUMBER` has no scale, so a fractional id would still read.
  - The column lengths are mapped: 1000 and 2000.
- **Alternative:** `HasKey(Id)` would be simpler, but EF would then assume a unique, non-null id, which the table does not promise.

### D2. Backend feature `iErp.Admin/Notification`
- **`INotificationRepository.FindLatestAsync`.** It keeps the visible rows, `Visible == "Y" || Visible == "y"` (`VISIBLE` CHAR(1), mapped fixed-length like the other Y/N flags, so the SQL compares strings and holds no `TRUE`/`FALSE`), with a banner or a heading: `(Banner != null && Banner.Trim() != "") || (Heading != null && Heading.Trim() != "")`. It then orders by:
  - `CreatedDate == null`, then `CreatedDate` descending;
  - `Id == null`, then `Id` descending.

  It takes the first row with `FirstOrDefaultAsync`. Ordering on the `== null` flags puts nulls last in a way that works on every provider; it does not depend on Oracle's `NULLS LAST`. A `ToQueryString()` test checks that the SQL has no `TRUE`/`FALSE`, as the 10g rule requires.
- **`INotificationService.GetLatestAsync`.** It returns every text exactly as entered, never trimmed (the user's request), as `NotificationDto(decimal? Id, string? Banner, string? Heading, string? Content, DateTime? CreatedDate)`, or null when the row has neither a banner nor a heading. Oracle stores an empty string as NULL, so an empty text has no value.
- **`NotificationController`** at `api/admin/notification`, with a single `[HttpGet]`:
  - it has no `[RequiresMenu]`; the default policy still needs a valid token;
  - it answers 200 with the DTO, or 404 with `ApiProblem` and `NotFoundMessage = "Notification not found."`.
- The repository and the service are registered in `AdminRegistration`.
- **Alternative:** a ROWNUM query in raw SQL. Not needed, because the interceptor already makes `FirstOrDefaultAsync` work on 10g.

### D3. Frontend: one model, two loaders
- `core/announcement/announcement.model.ts` holds the `Announcement` type: `id`, `banner`, `heading`, `content` and `createdDate`, as the API returns them, and the API path. It also holds `bannerText()` (the banner, or the heading without one: the bar's text) and `headingText()` (the heading, or the banner without one: the screen's heading); a text of only spaces counts as none. The store exposes `barText`. It lives in `core` because the shell and the feature both use it. The name avoids the toast service's.
- **The bar's loader.** `core/announcement/announcement.store.ts` is a root service. It loads the latest notification with `SKIP_LOADING` and `SKIP_ERROR_NOTIFICATION`, and keeps it in a signal: the announcement, or null when there is none, it failed or there is no session.
  - It loads when the session's `userCode` changes to a user: a login, or the app opening with a kept session. A branch or year switch keeps the user, so it does not load again.
  - It clears the announcement when the session ends.
  - An answer to an older request is dropped, as in the other services.
- **The screen's loader.** `features/admin/notification/notification.service.ts` is provided by the feature routes, like `HolidayListService`. It loads the notification each time the screen opens, with the usual spinner. It treats 404 as a "not found" state with no error notification, and notifies other failures.
- **Alternative:** the screen could reuse the store's value. But then the screen could not show its own loading, not-found and Retry states (spec: Notification screen states), and a stale value would stay after a reload of the screen.

### D4. Frontend: the bar in the shell
- `shell/announcement-bar.ts` (selector `app-announcement-bar`) is part of the shell and in the initial download. It is small and imports only `core`.
- `shell.html` places it before the `<header>`, inside the `app-content` column. It renders only when the store holds an announcement.
- **Markup.** The whole bar is one `<a routerLink="/admin/notification">`, so a click anywhere on it, or Enter, opens the screen, and it gets the hand pointer.
  - Its `aria-label` is "Notification: <banner text>. Open the notification", with the text's runs of spaces and line breaks read as single spaces.
  - The text is shown exactly as entered (`whitespace-pre`), so its spaces are kept. Each line break (CR LF, LF or CR) is replaced by three em spaces, a wide gap, so the whole text stays on the one-line bar (decided by the user). With reduced motion, `overflow-hidden text-ellipsis` cuts it, instead of `truncate`, which would collapse the spaces.
  - The moving text inside is `aria-hidden`, so screen readers do not read a moving copy.
- **Movement.**
  - The bar has `px-6` and holds a text lane (`flex-1 overflow-hidden`), so the text shows only inside the lane, a little away from both ends of the window.
  - **More details prompt** (the user's request). The moving copy holds two spans: the text, then `MORE_DETAILS_TEXT`, "Click here for more Details", with `ms-10 text-sm underline` (14 px, smaller than the 16 px text, as the user asked). The prompt is added by the bar only, so the text in `GENINFO` and the Notification screen stay exactly as entered. The pass's duration counts both.
  - **Once at a time** (the user's request, instead of the picture's repeating stream). The text sits in a `span` in the lane with a left padding of the lane's width (`pl-[100%]`). `--animate-announcement` moves it from `translateX(0)` to `translateX(-100%)`, linear and infinite: it enters at the lane's right end, has left the lane on the left when the pass ends, and starts again. The pass's duration (`--announcement-duration`) grows with the text's length, so every text moves at about the same speed.
  - With reduced motion, the text does not move and its padding is removed: it stands at the left of the lane, cut with an ellipsis.
  - `hover:` and `focus-visible:` set `animation-play-state: paused`.
  - `motion-reduce:` turns the animation off and shows the heading still, at the left, with `truncate`.
- **Colors** (the user's choice). The bar is one flat color: white with ICEGATE's navbar navy for the text (`#menu-main { background: #183473 }`, icegate.gov.in `header-footer.css`) in the light theme, 11.8:1, and black with white text in the dark theme, 21:1. The theme values are `--announcement-bg` and `--announcement-fg`, used as `bg-announcement` and `text-announcement-foreground`, in normal-weight `text-base` (16 px, larger than the 14 px of the Notification screen, as the user asked). A `border-b` in the theme's border color sets the bar off from the header, which has the same background. The layout and movement follow the ICEGATE ticker in `kb/ui-templates/admin/scrolling-notify-bar1.JPG`. No color literal appears in the component, as the common-look test checks.
- **Height.** The bar is one line (`h-9`). The header and the rest of the shell move down by it, and nothing overlaps.

### D5. Frontend: the Notification screen
- `features/admin/notification/` holds `notification.routes.ts`, `notification.page.ts`, `notification.page.html` and `notification.service.ts`.
- It is routed in `app.routes.ts` as `admin/notification`, lazy, with no `menuAccessGuard` and no menu code, like the Dashboard.
- **Template:**
  - the Back button and `appPageTitle` "Notification" come first, then `app-page-rule`, as on the Holiday List;
  - then one `hlmCard` with the Holiday List box's classes, but its height follows the content instead of being fixed (`h-fit`, no two-thirds height), `w-fit max-w-full`, so the box is as wide as the text's longest line (the user's request) and never wider than the screen;
  - the heading (or the banner without one) is the box's header (`h2`, `font-semibold text-profile-heading`);
  - the content is below it;
  - both use `whitespace-pre`, so every space and line break is kept exactly as entered and no line is wrapped; the box's body is `overflow-x-auto`, so a line wider than the screen scrolls sideways instead of breaking;
  - with no content, the box shows only the heading.
- Back goes to the previous screen, or to the Dashboard when the screen was opened directly. It uses the same pattern as the Holiday List.

## Risks / Trade-offs

- **[Risk]** The dev table is empty, so the bar cannot be seen in dev. → **Mitigation:** the backend and frontend tests cover a notification and no notification. The manual check needs a test row added to `GENINFO` by the user or an administrator; this change does not write it, and the dev database is read only for it.
- **[Risk]** `ID` and `REC_CREATED_DATE` are nullable, so the order may not match what the legacy system calls the latest. → **Mitigation:** the order is spelled out in the spec (dated rows first, then highest id), and the service test covers the null cases.
- **[Risk]** A moving text is hard to read and can trouble users who are sensitive to motion. → **Mitigation:** it pauses on hover and focus, it stands still with reduced motion, and the full text is on the Notification screen and in the accessible name.
- **[Trade-off]** A new notification shows only after a reload or a new login. This is accepted, because announcements change rarely and polling would add load for every open tab.
- **[Trade-off]** The bar takes one line of height on every screen. This is accepted, as the BRS asks for it there. It is gone when there is no notification.

## Migration Plan

- There is no schema change. `GENINFO` already exists and is only read.
- Deploy the backend and the frontend together. The frontend calls the new endpoint, and an old backend would answer 404 there, which only hides the bar.
- To roll back, revert the change. Nothing is stored.
