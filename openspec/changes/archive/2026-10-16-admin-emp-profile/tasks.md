# Tasks

## 1. Map `EMPM` and `PARAM`

- [x] 1.1 Add `iErp.Entities/Employee.cs` and `iErp.Entities/Parameter.cs`, and map them in `iErp.Data/Configurations/EmployeeConfiguration.cs` and `ParameterConfiguration.cs`: read-only, excluded from migrations, explicit upper-case column names, `EMP_NO` as `Code`, `EMP_DO_BIRTH` as `DateTime?`, max lengths from the column character lengths (D1). Verify:
  - new `Unit/EmployeeMappingTests` and `Unit/ParameterMappingTests` (following `UserMappingTests`) check the table, the exclusion from migrations, and each column's name and length;
  - `dotnet build backend/iErp.sln` passes.
- [x] 1.2 Run `dotnet ef migrations add EmployeeParameterReadOnlyMapping -p iErp.Data -s iErp.Data` (or `-s iErp.Api` when its `bin` is not locked). Keep it only if `Up`/`Down` are empty; delete it if EF reports no change. Verify that `dotnet ef migrations script` contains no `EMPM` or `PARAM` statement.

## 2. Profile endpoint

- [x] 2.1 Add `iErp.Admin/EmployeeProfile` (D2–D4) and register the service and repository in `AdminRegistration`:
  - `EmployeeProfileRepository`: find the employee by id, and list the `PARAM` names for a set of ids of type `STATE` or `COUNTRY`;
  - `EmployeeProfileService`: read `ICurrentSession.EmployeeId`, return `null` for a blank id or a missing row, trim values, map state and country ids to names, and `DateOfBirth` to `DateOnly?`;
  - `EmployeeProfileDto` and `AddressDto`;
  - `EmployeeProfileController` `GET api/admin/profile`, answering 404 problem details "No employee profile is linked to this user." when the service returns `null`.

  Verify with new `Admin/EmployeeProfileServiceTests` (fake repository and session):
  - all fields mapped, and `" Asha Nair "` becomes `"Asha Nair"`;
  - state and country names come from the parameters, and an unknown id or a parameter of another type gives `null`;
  - empty fields stay `null`;
  - a null employee id, a blank one and a missing row all return `null`, and the repository is not called for a blank id.
- [x] 2.2 Check the queries for Oracle 10g: a new `Unit/EmployeeProfileQueryTests` (following `ChangeBranchQueryTests`) shows with `ToQueryString()` that the employee query and the parameter query contain no `TRUE`/`FALSE` and no `FETCH`/`OFFSET`, and that the parameter query uses `IN`.
- [x] 2.3 Add `Integration/EmployeeProfileEndpointTests` (following `ChangeBranchEndpointTests`, fake repository, `TestTokens`):
  - a token with employee id "E-1" gets 200 with the camelCase body, including `dateOfBirth` `"1990-03-05"` and nested addresses;
  - `?id=E-2` still returns "E-1";
  - a token without an employee id, and an id with no row, get 404 problem details with the title;
  - no token gets 401.

  Then run `dotnet test backend/iErp.sln` (Oracle tests off).
- [x] 2.4 Add the Oracle-gated `Integration/EmployeeProfileTablesTests` (following `LoginTablesTests`). It is skipped unless `IERP_TEST_ORACLE` is set. It creates shaped `EMPM` and `PARAM` tables only in a schema that has none and drops them afterwards; otherwise it only reads. It checks the employee query and the state/country lookup. Do NOT point it at the dev database. Verify that it is reported as skipped in `dotnet test`.
- [x] 2.5 Read-only check against the dev database: with the API running, log in as a user who has an employee id and request `GET /api/admin/profile` (credentials read by the read-only probe into a temporary file, deleted right after). Compare the response's code, name and state/country names with a read-only `SELECT` joined to `PARAM` (compared, not printed). Then log in as a user without an employee id and check for 404. Use only `SELECT`.

## 3. Profile screen

- [x] 3.1 Add `features/admin/employee-profile/employee-profile.model.ts` and `employee-profile.service.ts` (D5):
  - `load()` with `profile`, `loading`, `notLinked` and `error` signals;
  - the request sets `SKIP_ERROR_NOTIFICATION`;
  - a 404 sets `notLinked` without a notification;
  - other failures set `error` and show one notification.

  Verify with `employee-profile.service.spec.ts` (`HttpTestingController`): success, 404 (no notification), 500 (one notification), and a reload clears the previous state.
- [x] 3.2 Add `employee-profile.page.ts/html` and `employee-profile.routes.ts` (D5), and the lazy route `admin/profile` in `app.routes.ts`. The page has the title, the top card with the initials avatar, name and code, and the six boxes with every field and label from the spec. It shows "—" for empty values and the date of birth as `dd-MM-yyyy`. It has loading, not-linked and error-with-Retry states, and no inputs or edit actions; it uses only theme tokens and shared pieces. Verify with `employee-profile.page.spec.ts`:
  - box headings in order;
  - every label and value;
  - initials "AN" for "Asha Nair", and "?" without a name;
  - "—" for an empty value;
  - the date `05-03-1990`;
  - the loading, not-linked and error states, with Retry calling `load()` again;
  - no `input` or edit button.

  Also check that the existing look-guard spec passes on the new files.
- [x] 3.3 Add the Profile entry to `NAV_ITEMS` (`lucideCircleUser`, added to `NAV_ICONS`, tone `violet`, route `/admin/profile`). Verify with tests:
  - `app-nav.spec.ts` (or the nav-items test) shows the entry with its violet icon, and it is highlighted on `/admin/profile`;
  - the Dashboard spec shows a Profile quick link with the same tone;
  - existing shell and Dashboard tests stay green.

  Then run `npm test -- --no-watch` and `npm run build`.

## 4. Final check

- [x] 4.1 Run `dotnet test backend/iErp.sln`, `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`; all must pass. Then, in the browser against the running API (dev DB, read-only):
  - log in as a user with an employee, open Profile from the sidebar, and check every box, state and country names, the full-width layout, dark mode and phone width;
  - log in as a user without an employee and check the not-linked message with no notification.

  Per `CLAUDE.md`, do not update `kb/`. Report which `kb/` notes are now out of date so the user can decide:
  - the legacy-table notes in `kb/architecture/backend.md` (`EMPM`, `PARAM`);
  - the new feature in `kb/architecture/frontend.md`;
  - the BRS v1.0 status in `kb/modules/admin/employee-profile.md`, still Proposed.

## 5. Revision: merged first box and reference colours

- [x] 5.1 Add `--profile-heading` and `--profile-label` to `src/styles.css` (light and dark values, mapped in `@theme inline`; D6). Merge the top card into the first box, which has no heading: the avatar, name and Employee Code in its top row, and the other basic fields below (D5). Headings and the name use `text-profile-heading`, and labels `text-profile-label`. Verify with tests:
  - the page spec shows the first box with no heading, holding the avatar, name and code;
  - Name and Employee Code are not repeated in its grid;
  - five headed boxes follow, in order;
  - headings and labels carry the two classes;
  - the look guard still passes.
- [x] 5.2 Run `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only), check the layout and the heading and label colours in light, dark and phone width.

## 6. Revision: addresses side by side

- [x] 6.1 Put Current Address and Permanent Address in one row from `lg` (`grid grid-cols-1 lg:grid-cols-2 gap-4`, Current first), and give their field grids two columns at most (D5). Verify in `employee-profile.page.spec.ts`:
  - both address sections are inside one row container with `lg:grid-cols-2`, Current first;
  - their grids have no `lg:grid-cols-4`;
  - the other boxes are unchanged.
- [x] 6.2 Run `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only), check that the addresses are side by side at 1280px, and that at phone width they stack without sideways scroll, in both themes.

## 7. Revision: reference box style, narrower column, photo column with basic rows

- [x] 7.1 Add `--profile-backdrop` (light and dark, mapped in `@theme inline`; D6). Then, per D5:
  - put the boxes in a centered column of at most 900px on the backdrop panel;
  - give the cards `rounded-2xl shadow-md ring-0`;
  - make the first box two columns: a big avatar on the left, and on the right the name and label–value rows (Employee Code, Father's Name, Spouse Name, Marital Status, Date of Birth) with grey labels.

  Verify in `employee-profile.page.spec.ts`:
  - the column has `max-w-[900px]`, and the backdrop class is present;
  - the first box has the avatar and five rows, each with a grey label and a value;
  - Name is not a row;
  - the other boxes keep blue labels;
  - the look guard still passes.
- [x] 7.2 Run `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only):
  - at 1920px the column is at most 900px and centered;
  - the photo is on the left with the rows on the right, each label left of its value;
  - at phone width the photo is above the rows, with no sideways scroll;
  - the addresses are still side by side on wide screens;
  - both themes look right.

## 8. Revision: full width, content-sized boxes that flow (reference `profile.JPG`)

- [x] 8.1 Replace the 900px column and the address row with one full-width `flex flex-wrap` flow on the backdrop (D5). Cards are `w-full sm:w-fit sm:max-w-[48rem]`, field grids use content-width columns (Bank 4, IDs 5, Contact and addresses 2), and values wrap at 18rem. Verify in `employee-profile.page.spec.ts`:
  - the flow container holds the six boxes in order;
  - there is no `max-w-[900px]` and no address row;
  - the cards have `sm:w-fit`;
  - each box has its column count;
  - the look guard still passes.
- [x] 8.2 Run `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only):
  - at 1920px the backdrop spans the content area, every box is narrower than it, and at least two boxes share the first row;
  - Contact Details is narrower than Bank Details;
  - at phone width the boxes stack at full width with no sideways scroll;
  - both themes look right.

## 9. Revision: two columns, one Address box, rows everywhere

- [x] 9.1 Model: `profileSections` returns five sections, where Address has `parts` Current and Permanent; add `addressLines()` (D5). Verify with tests:
  - Address 1–3 and "P.O. x" are joined with line breaks, with empty lines left out;
  - all four empty gives "—";
  - the five section titles and the parts' fields are in order.
- [x] 9.2 Page: the two-column grid (left: basic, Address; right: Bank, Contact, IDs), the Address box with its Current and Permanent parts, and label–value rows in every box (D5). Verify in `employee-profile.page.spec.ts`:
  - each column's contents and order;
  - the Address box has `h3` Current then Permanent, each with Address, City, State, PIN Code and Country rows;
  - every headed box has `grid-cols-[auto_1fr]` rows;
  - the look guard still passes.
- [x] 9.3 Run `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only):
  - the basic box is at the top left with Bank Details to its right, and the Address box is below the basic box;
  - Current is left of Permanent;
  - the address lines are merged under one label;
  - at phone width the order is basic, Address, Bank, Contact, IDs, with no sideways scroll;
  - both themes look right.

## 10. Revision: new `profile.JPG` grid, equal left widths, white page with tinted boxes

- [x] 10.1 Theme values (D6): add `--profile-box` and `--profile-muted` (light and dark, mapped in `@theme inline`), set the light `--profile-label` to `oklch(0.52 0.12 240)`, and remove `--profile-backdrop`. Verify with the contrast check that every heading, label and value is at least 4.5:1 on the tinted box in both themes.
- [x] 10.2 Page (D5): remove the backdrop panel, then build:
  - the left column as a grid, so the basic and Address boxes are the same width;
  - the right column with Bank and Contact side by side and ID and Documents spanning below;
  - cards with `bg-profile-box`;
  - the basic row labels with `text-profile-muted`.

  Verify in `employee-profile.page.spec.ts`:
  - the column contents and classes (`sm:col-span-2` on IDs);
  - no backdrop;
  - the cards are tinted;
  - the basic labels use `text-profile-muted`;
  - the look guard still passes.
- [x] 10.3 Run `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only):
  - the basic and Address boxes have the same width;
  - from 1536px, Bank and Contact share a row and IDs is below them spanning both; at 1280px they are one below the other, with labels on one line and no value cut off;
  - the page background is the app's own (white in light), with tinted boxes;
  - contrast is at least 4.5:1 in both themes;
  - the phone order is basic, Address, Bank, Contact, IDs, with no sideways scroll.

## 11. Revision: Bank and Contact as tall as the basic box

- [x] 11.1 Replace the column wrappers with one grid placed per box (`PLACEMENT`; D5), so Bank and Contact stretch to the basic box's row height. IDs uses `2xl:col-[2/span_2] 2xl:max-w-none`. Verify in `employee-profile.page.spec.ts`:
  - the grid holds the five boxes directly;
  - each box has its placement classes;
  - Bank and the basic box are never `self-start`.
- [x] 11.2 Run `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only):
  - at 1920px the basic box, Bank and Contact are the same height (244px), with IDs below Bank and Contact spanning both;
  - at 1280px Bank is as tall as the basic box;
  - basic and Address are the same width at both sizes;
  - all earlier checks still pass.

## 12. Revision: email in lower case

- [x] 12.1 Show the email in lower case (model `profileSections`; the stored value is unchanged). Verify with `employee-profile.page.spec.ts`: "VSPRADEEP1973@GMAIL.COM" is shown as "vspradeep1973@gmail.com". Then run `npm test -- --no-watch` and `npm run build`.

## 13. Revision: ID and Documents as tall as Address

- [x] 13.1 From `2xl`, let Address and ID and Documents stretch to their shared row (`2xl:self-stretch` in `PLACEMENT`; D5), so IDs is as tall as Address. Verify:
  - `employee-profile.page.spec.ts` checks both classes;
  - in the browser at 1920px both boxes are 316px tall on the same row, and all 38 checks pass.

## 14. Revision: Contact before Bank, stack when the boxes do not fit, blue basic labels

- [x] 14.1 Model order and labels: `profileSections` returns basic, Contact, Bank, Address, IDs. Use `text-profile-label` for the basic rows and remove `--profile-muted`. Verify with tests:
  - the section order;
  - every `dt` is `text-profile-label`.
- [x] 14.2 Page (D5): the `fits` signal from a `ResizeObserver` on the grid's parent, which remembers the natural row width; the row layout with `max-content` columns and `PLACEMENT`; one column otherwise. Verify in `employee-profile.page.spec.ts` with a stubbed `ResizeObserver` and widths:
  - when the boxes fit, the row classes and placements apply;
  - when they do not fit, one column with no placement classes, in reading order;
  - widening again restores the rows;
  - the observer is disconnected on destroy.
- [x] 14.3 Run `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only):
  - at 1920px, rows with Contact before Bank, the heights matched and basic/Address the same width;
  - just below the natural width, all boxes are stacked; widened again, rows;
  - every label is blue, in both themes;
  - no sideways scroll at any width.

## 15. Revision: stacked order basic, Address, Contact, Bank, IDs

- [x] 15.1 Move Address to second place in `profileSections`. The rows are unchanged, because they are placed explicitly. Verify:
  - the page spec checks the stacked order and the row placements;
  - in the browser, just below the natural row width the order is basic > Address > Contact > Bank > IDs, and at 1920px the rows are as before;
  - all 39 checks pass.

## 16. Revision: employee photo from the configured folder

- [x] 16.1 Backend (D7):
  - `EmployeeImages:Folder` in `appsettings.json` and the `EmployeeImagesOptions` class;
  - `Employee.ImageName` (`EMP_IMAGE_NAME`, 35 characters) with a snapshot-only migration;
  - `EmployeePhotoStore` lookup;
  - `HasPhoto` in the profile;
  - `GET api/admin/profile/photo`.

  Verify with tests:
  - the mapping test;
  - store tests on a temporary folder: found, no name, missing file, `..\` in the name, other extension, and a different folder;
  - service tests for `HasPhoto`;
  - endpoint tests: 200 with `image/jpeg` and the bytes, 404 cases, 401 without a token.
- [x] 16.2 Frontend (D7):
  - `hasPhoto` in the model;
  - `loadPhoto()` as a blob with `SKIP_ERROR_NOTIFICATION`;
  - the `photoUrl` signal, revoked on replace and on destroy;
  - `hlmAvatarImage` with the initials fallback.

  Verify in the specs:
  - `hasPhoto` false means no request;
  - a successful load sets the URL and renders the image;
  - a failure keeps the initials with no notification;
  - the URL is revoked on destroy.
- [x] 16.3 Run `dotnet test`, `npm test -- --no-watch`, `npm run build` and `openspec validate admin-emp-profile --strict`. In the browser (dev DB, read-only):
  - a user whose image file exists sees the photo in the circle;
  - a user without one sees the initials;
  - all earlier checks still pass.

## 17. Fix: a replaced photo shows at once

- [x] 17.1 Serve the photo with `Cache-Control: no-store` instead of `private, max-age=300`, so a file replaced in the images folder shows the next time the profile opens (D7). Verify:
  - `EmployeePhotoEndpointTests` checks `no-store`;
  - a file replaced between two requests is served at once;
  - `dotnet test` passes.

## 18. Fix: photo framed inside the circle

- [x] 18.1 Crop the photo a quarter from the top (`object-[50%_25%]`) instead of centred, so the whole head is inside the circle (D7). Verify:
  - the page spec checks the class;
  - all 22 photos in the images folder were compared at centre, 25% and 15%: centre cut off the top of several heads, and 25% framed every face.

## 19. Revision: whole photo in the circle, face smaller

- [x] 19.1 Show the whole photo (`object-contain`) on a new white theme value `--profile-photo` (`bg-profile-photo`, white in both themes) instead of cropping it to fill the circle, so the full face and head are seen (D7). Verify:
  - the page spec checks `object-contain`, no `object-cover`, and `bg-profile-photo`;
  - a comparison on real photos (crop, zoom, contain): contain showed the full head without a hard edge;
  - in the browser the photo loads at 192px with the whole face, and all 40 checks pass.

## 20. Fix: no "ResizeObserver loop" console error

- [x] 20.1 Run the fit measurement in the next animation frame instead of inside the `ResizeObserver` callback, and cancel a pending frame on destroy (D5). Verify:
  - the page spec runs frames at once and its fit, stack and back-to-rows tests pass;
  - in the browser the console shows no error;
  - Change Branch still switches branch and year on the Dashboard and the Profile page;
  - all 40 layout checks pass.
