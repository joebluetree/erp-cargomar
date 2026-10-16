# Design

## Context

See proposal.md for the motivation. The current state:

- **Session.** After `user-empid-add`, the token carries `ierp:employee_id` when the user has one, and `ICurrentSession.EmployeeId` returns it, or `null`. That change is complete but not archived, so its specs are not yet in `openspec/specs/`.
- **Legacy tables** are mapped read-only (`ToTable(..., t => t.ExcludeFromMigrations())`, upper-case column names, string keys, only the columns used), and read by a module repository that depends on `AppDbContext` directly (`ChangeBranchRepository`, `CompanyListRepository`). Each mapping change adds a snapshot-only migration.
- **`EMPM`** (read-only check of the dev schema): 532 rows, key `EMP_PKID` (`NVARCHAR2`, 40 characters). There is no `EMP_CODE` column; `EMP_NO` (531 distinct values) is the code. `EMP_DO_BIRTH` is a `DATE`. 338 `USERM` rows join to an `EMPM` row on `TRIM(USER_EMP_ID)`. There are no foreign keys. `EMPM` has no deleted flag.
- **`PARAM`** is the shared lookup table: key `PARAM_PKID`, `PARAM_TYPE`, `PARAM_NAME`. Every non-empty `EMP_*_STATE_ID` and `EMP_*_COUNTRY_ID` in the dev data matches a `PARAM` row of type `STATE` or `COUNTRY`.
- **Oracle 10.2.** No `TRUE`/`FALSE` literals and no `FETCH FIRST` without the interceptor; check new queries with `ToQueryString()` (as `Unit/ChangeBranchQueryTests` does).
- **Problem details.** Controllers build them with `ApiProblem.Create(HttpContext, status, title)` (`ChangeBranchController`). `NotFoundException` exists in Shared but no middleware maps it.
- **Frontend.**
  - Every failed request gets one notification from `httpErrorInterceptor`, unless the request sets `SKIP_ERROR_NOTIFICATION`.
  - `NAV_ITEMS` drives the sidebar, the slide-in menu and the Dashboard quick links; an entry needs an icon in `NAV_ICONS` and a `tone`. Dashboard is blue and Company List green.
  - Shared look pieces: `PageTitle`, the Spartan `hlm*` components and theme tokens. The look guard rejects literal palette colors in feature code.

## Goals / Non-Goals

**Goals:**
- One endpoint that can only ever return the caller's own employee, with names instead of ids for state and country.
- A view-only screen built only from the shared look pieces.

**Non-Goals:**
- Reading `USERM` again: the employee id comes from the token.
- An employee list, search, or editing.
- Checking that the employee belongs to the session's company (the link is the user's own `USER_EMP_ID`).

## Decisions

### D1. Two read-only mappings with only the profile's columns
- `Employee` → `EMPM`: `Id` (`EMP_PKID`), `Code` (`EMP_NO`) and the BRS columns, all `string?` except `DateOfBirth` (`DateTime?`, `EMP_DO_BIRTH`). Max lengths are the columns' character lengths (the dev schema's `data_length` / 2 for `NVARCHAR2`).
- `Parameter` → `PARAM`: `Id` (`PARAM_PKID`), `Type` (`PARAM_TYPE`), `Name` (`PARAM_NAME`). A general name, because other screens will need the same lookups.
- One snapshot-only migration, `EmployeeParameterReadOnlyMapping`.

Alternative considered: map all 87 `EMPM` columns now. Rejected: the project maps only what it reads, so unused columns (salary limits, remarks) are never selected.

### D2. `GET /api/admin/profile` in the Admin module
Folder `iErp.Admin/EmployeeProfile`, following ChangeBranch:
- `EmployeeProfileController` with route `api/admin/profile`;
- `IEmployeeProfileService` / `EmployeeProfileService`;
- `IEmployeeProfileRepository` / `EmployeeProfileRepository`;
- `EmployeeProfileDto` with nested `AddressDto` (`Current`, `Permanent`).

The service reads `ICurrentSession.EmployeeId`:
- null or blank → returns `null`, and the controller answers 404 with the title "No employee profile is linked to this user.";
- otherwise the repository finds the `EMPM` row by `Id`, and a missing row is answered the same way.

The route has no parameter, so another employee cannot be asked for.

Alternatives considered:
- `GET /api/admin/employees/{id}` with a check that the id is the caller's: rejected, because it invites a later "any id" use, and the BRS asks for "my profile" only.
- Throwing `NotFoundException`: rejected, because nothing maps it to 404 today and the existing controllers return problem details themselves.

### D3. State and country names in a second query
After loading the employee, the repository reads the `PARAM` rows whose `Id` is one of the (up to four) non-empty state and country ids, with types `STATE` or `COUNTRY`: one `WHERE PARAM_PKID IN (...)` query. The service maps each id to its name; an id with no row gives an empty value.

Alternative considered: one query with four left joins to `PARAM`. It works, but it produces a wide `LEFT JOIN` statement that is harder to check on 10g. Two simple queries for a single-row screen cost nothing.

### D4. DTO shape and values
- camelCase JSON, in groups that match the screen:
  - `code`, `name`, `fatherName`, `spouseName`, `maritalStatus`, `dateOfBirth`;
  - `bank { accountNo, name, branch, ifsc }`;
  - `currentAddress` / `permanentAddress { address1, address2, address3, city, state, pin, poBox, country }`;
  - `mobile`, `email`;
  - `ids { aadhaar, pan, pf, esi, uan }`.
- Every text value is trimmed, and null or blank becomes `null`.
- `dateOfBirth` is a `DateOnly?`, serialized as `yyyy-MM-dd`: no time zone shift can move the day.

### D5. Frontend feature `features/admin/employee-profile`
- `employee-profile.model.ts`: the DTO types.
- `employee-profile.service.ts`: provided by the routes. It keeps `profile`, `loading`, `notLinked` and `error` signals and has `load()`.
  - The request sets `SKIP_ERROR_NOTIFICATION`.
  - A 404 sets `notLinked`, with no notification.
  - Any other failure sets `error` and calls `NotificationService.error(apiError.message)` itself, so the user still gets the one notification other screens give.
- `employee-profile.page.ts/html`:
  - the `appPageTitle` "Profile" row;
  - five boxes in two columns, as in the reference `profile.JPG`, directly on the page (no backdrop panel).
    - One grid holds all five boxes in stacked order (basic, Address, Contact, Bank, IDs); `profileSections` returns them in that order. In rows each box is placed explicitly by `PLACEMENT`, so the DOM order only decides the stacked order.
    - A `fits` signal chooses the layout:
      - true: rows. The grid has `grid-cols-[max-content_max-content_max-content]`, and a `PLACEMENT` map (by title) gives each box its cell:
        - basic in column 1, row 1; Contact in column 2, row 1; Bank in column 3, row 1;
        - Address in column 1, row 2; IDs at `col-[2/span_2]`, row 2, with `max-w-none`.

        Boxes on a row stretch to its height, so Contact and Bank are as tall as the basic box and IDs as tall as Address. Address shares column 1 with the basic box, so they have the same width.
      - false: one column (`grid-cols-1`). No placement classes apply, so the boxes are stacked at full width in reading order.
    - `fits` comes from a `ResizeObserver` on the grid's parent:
      - while in rows, the grid's natural width is its `scrollWidth` with the `max-content` columns; this is remembered;
      - `fits` is true when the parent's width is at least that natural width;
      - while stacked, the remembered width is used, so widening the window brings the rows back;
      - the measurement runs in the next animation frame, not inside the observer callback: switching the layout inside the callback resized the observed elements in the same frame, which the browser reported as a "ResizeObserver loop" error. The observer and any pending frame are cancelled on destroy.
    - Alternative considered: fixed breakpoints (`lg`/`2xl`, revisions 10–13). Rejected: whether the boxes fit depends on the data (name and address lengths), and the user asked for the boxes to stack exactly when they no longer fit in a row.
    - Labels are `whitespace-nowrap`. Values use `[overflow-wrap:anywhere]` instead of `break-words`, so a long email can still wrap inside a narrow cell instead of being cut off by the card.
    - In the DOM the left column comes first, which gives the phone order: basic, Address, Bank, Contact, IDs.
    - Each card is `w-full sm:max-w-[48rem]`: it fills its grid cell, and the cells are sized to the content.
    - Every headed box shows its fields as rows, like the basic box: a `<dl>` with `grid-cols-[auto_1fr]`, label left, value right. A value wraps at `max-w-[18rem]`.
    - The cards get `bg-profile-box rounded-2xl shadow-md ring-0`: a named theme value, then shape and shadow classes. The look guard allows them, and the card's own `bg-card` is replaced by the helm class merge.
    - The first box has no header. It is `grid md:grid-cols-[auto_1fr]`.
      - Left: the initials avatar (`size-48`, `size-32` on phones).
      - Right: the name (the box's title, a `p`, not a heading) and its rows: Employee Code, Father's Name, Spouse Name, Marital Status, Date of Birth.
      - On phones the avatar is above the rows.
    - `profileSections` returns five sections: basic (empty title, Employee Code first; Name is the title, not a field), Address, Bank Details, Contact Details, ID and Documents.
    - The Address section has no fields of its own but two `parts`, `{ title: 'Current', fields }` and `{ title: 'Permanent', fields }`.
      - Each part's first field is "Address": `addressLines(address)` joins Address 1, 2, 3 and `P.O. <value>` with line breaks, leaving out empty ones, or "—" when all are empty. The page shows it with `whitespace-pre-line`.
      - City, State, PIN Code and Country follow.
      - In the box the parts are `grid gap-8 sm:grid-cols-2`, each with an `h3` sub-heading.
    - The other headed boxes each have an `h2` heading.
    - Alternatives considered:
      - the free `flex-wrap` flow of revision 8: rejected, because the user asked for fixed places (basic top left, Bank to its right, Address below basic);
      - columns stretched to fill the screen like the reference: not chosen, because an earlier request asked for boxes sized to their content;
      - equal grid columns: rejected, because they stretch small boxes.
  - The look guard forbids surface and brand color classes (`bg-card`, `bg-primary`, ...) in screens, so the boxes and the avatar use Spartan's `card` and `avatar` helm components. They are generated into `shared/ui` with `npx ng g @spartan-ng/cli:ui card` / `avatar`, and the page adds layout classes only (avatar `size-24`).
  - A `value()` helper shows "—" for an empty value. The date is formatted `dd-MM-yyyy` from the `yyyy-MM-dd` string, without `Date`, so no time zone shift.
  - Initials are the first letters of the first and last words of the name, upper-case, and "?" when there is no name.
- Route `admin/profile` (lazy, in `app.routes.ts`).
- `NAV_ITEMS` gains `{ label: 'Profile', icon: 'lucideCircleUser', route: '/admin/profile', tone: 'violet' }` after Company List; `lucideCircleUser` is added to `NAV_ICONS`.

Alternative considered: Angular's `DatePipe`. Rejected for the date of birth, because it parses into a local `Date`; a string split is exact for a date-only value.

### D6. Reference colours for headings and labels
Two named theme values in `src/styles.css`, with light and dark values, mapped in `@theme inline` the way `--header-*` is:
- `--profile-heading` (`text-profile-heading`): the box headings and the name in the first box.
  - Light: `oklch(0.33 0.03 257)`, about the reference's slate `#2d3748`, 12.2:1 on the white card.
  - Dark: `oklch(0.87 0.02 257)`, 12.1:1 on the dark card.
- `--profile-label` (`text-profile-label`): the field labels, including "Employee Code".
  - Light: `oklch(0.52 0.12 240)`, 5.0:1 on the tinted box. The reference's light blue `#3ea0d8` is only 2.9:1 on white, so it is darkened just enough to be readable.
  - Dark: `oklch(0.74 0.11 235)`, 7.1:1 on the dark tint.
- `--profile-box` (`bg-profile-box`): the fill of the boxes. The page itself keeps the app's background.
  - Light: `oklch(0.975 0.014 255)`, a pale blue-grey. Headings are 11.4:1 on it and values 18.4:1.
  - Dark: `oklch(0.25 0.02 255)`, a little lighter than the dark page. Headings are 10.8:1 on it and values 10.8:1.
- All labels, including the basic box's rows, use `--profile-label`. The grey `--profile-muted` of revision 10 is removed.

Field values keep the normal text color, and the page title keeps `appPageTitle` (the shared green). The look guard does not block these names, and screens use them only through their classes.

Alternative considered: reusing `--icon-blue`. Rejected: that value is for icons, and changing one would change the other.

### D7. The employee photo from a configured folder
- **Configuration.** `EmployeeImagesOptions` (`iErp.Admin`) binds `EmployeeImages:Folder`. The default is `D:\erp-cargomar\images\`, set in `appsettings.json`; another environment overrides it in its own settings file or with `EmployeeImages__Folder`.
- **Mapping.** `Employee.ImageName` maps `EMP_IMAGE_NAME` (35 characters), with a snapshot-only migration.
- **Lookup** (`EmployeePhotoStore`):
  - take `Path.GetFileName` of the trimmed name, so any directory part is dropped;
  - combine it with the folder's full path, and check that the result still starts with that folder;
  - allow only `.jpg`/`.jpeg` (`image/jpeg`) and `.png` (`image/png`);
  - require the file to exist.

  It returns the full path and content type, or null.
- **API.**
  - `EmployeeProfileService` sets `HasPhoto` from the lookup.
  - `GET api/admin/profile/photo` uses the session's employee only. It returns `PhysicalFile(path, type)` with `Cache-Control: no-store`, or 404. The URL is the same for every photo, so a kept copy would hide a file replaced in the folder (it did, with the first `max-age=300`).
- **Frontend.**
  - `EmployeeProfileService.loadPhoto()` is called only when `hasPhoto` is true. It gets `admin/profile/photo` as a blob with `SKIP_ERROR_NOTIFICATION`, and keeps an object URL in a `photoUrl` signal.
  - The URL is revoked when replaced and on destroy.
  - The avatar shows `<img hlmAvatarImage>` (`object-contain` on `bg-profile-photo`: the whole photo is shown, so the full face and head are seen; the space beside a portrait photo is white, the photos' own studio background, in both themes. An earlier crop, `object-cover` at 25% from the top, made the face fill the circle). Spartan shows the initials fallback until the image can be shown, and again if it fails. Automatic face detection (for example MediaPipe in the browser) was considered and not taken: the photos are consistent studio portraits, and it would add about 2–3 MB of model files and a delay per photo.
- **Alternative considered:** serving the folder as static files. Rejected, because anyone could then fetch any employee's photo without logging in, and the folder name would be public.
- Of the 165 employees with an image name in the dev data, 21 have a file in the folder, so the initials fallback is the common case.

## Risks / Trade-offs

- **[Sensitive data on screen]** Bank account and ID numbers are shown in full, as decided by the user. The endpoint returns only the caller's own row, and nothing is cached beyond the page's signals.
- **[Sessions from before `user-empid-add`]** They have no employee id, so they show "no employee profile" until the next login. Accepted: the message is clear, and logging in again fixes it.
- **[Duplicate employee id]** One employee id is shared by 2 users in the dev data. Both see the same profile, which is correct for that data.
- **[Oracle-only tests]** A test schema without `EMPM`/`PARAM` makes the mapped queries fail. The new Oracle-gated `EmployeeProfileTablesTests` creates shaped tables when the schema has none, as `LoginTablesTests` does. It never runs against the dev database (memory rule: dev DB is read-only).
- **[`PARAM` types]** If an id points to a `PARAM` row of another type, it is treated as unknown (empty). This is safer than showing an unrelated name.

## Migration Plan

1. Deploy the backend and frontend together. The endpoint and menu entry are new; nothing existing changes.
2. No database change. The migration is snapshot-only.
3. Rollback: redeploy the previous build.
