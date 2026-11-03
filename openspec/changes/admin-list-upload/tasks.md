# Tasks

## 1. Name rule and file store

- [x] 1.1 Add `HolidayFiles.Parse(fileName, companyCode)` in `backend/iErp.SharedBusiness/Holidays` (design D2). It returns the branch and year codes, or null for a bad name. Verify with `HolidayFilesTests` cases:
  - `CPL-COKSF-2026.txt` and `cpl-coksf-2026.TXT` parse;
  - a branch code with a `-` parses;
  - another company, a non-digit year, `.csv`, `holidays.txt`, `..\CPL-COKSF-2026.txt` and a name with a folder are refused.
- [x] 1.2 Add `Exists(fileName)` and `Write(fileName, bytes, replace)` to `IHolidayFileStore` and `HolidayFileStore`, sharing the read path's folder and name guards, writing a temp file and then moving it (design D3). Verify with `HolidayFileStoreTests` cases on a temp folder:
  - a new file is written byte for byte;
  - an existing file without `replace` is refused and unchanged;
  - with `replace` it is replaced;
  - a bad name or a missing folder writes nothing;
  - no `.tmp` file is left after a success or a refusal.

## 2. Upload backend

- [x] 2.1 Add `FindCompanyBranchByCodeAsync(companyId, code)` and `FindCompanyYearByCodeAsync(companyCode, yearCode)` to `IHolidayListRepository` and `HolidayListRepository` (design D2). Verify with `HolidayListQueryTests` cases: no `TRUE`/`FALSE` in the SQL, the branch query filters type 'B', the company and not deleted, and the year query filters the company and the code.
- [x] 2.2 Add `HolidayUploadService`, which runs the checks in design D4's order and returns `Saved`, `Invalid(message)` or `Exists(name)`. Register it in `AdminRegistration`. Verify with `HolidayUploadServiceTests` cases for every spec message:
  - empty, over 100 KB, not UTF-8, bad name, another company, unknown branch, unknown year;
  - an existing file without `replace` (Exists), and replaced with it;
  - a save under the database's codes;
  - nothing written on any refusal.
- [x] 2.3 Add the `POST /api/admin/holidays/file` action to `HolidaysController`: the admin-right check first (403 "You may not upload holiday lists."), then the service, mapped to 200, 400 or 409 problem details, with a 1 MB request limit (design D1). Verify with `HolidayListEndpointTests` cases:
  - the admin user's token saves a file in a temp folder (200 with the name);
  - a view-only user gets 403 and nothing is written;
  - a user without the view right gets 403 "You do not have access to this screen.";
  - no file gives 400;
  - an existing file gives 409, then 200 with `replace=true`;
  - after uploading the session's own file, `GET /api/admin/holidays` returns its holidays.

## 3. Upload frontend

- [x] 3.1 Add `HolidayUploadService` (`upload(file, replace)`, multipart to `admin/holidays/file`, `SKIP_ERROR_NOTIFICATION`) in `frontend/src/app/features/admin/holiday-list`. Verify with a service spec: the form data holds `file` and `replace`, and the URL is right.
- [x] 3.2 Add `HolidayUploadDialog`: title "Upload Holiday List", a `.txt` file field, the naming hint, and Upload/Replace and Cancel (design D5). The shared `toApiError` keeps a 400's own title when it has no field errors, so the dialog can show the backend's reason (agreed during apply; covered in `api-error.spec.ts`). Verify with a dialog spec:
  - Upload is disabled with no file and while sending, and the file is sent once;
  - success closes the dialog with the saved file name;
  - 400 and 403 show a warning and keep the dialog open;
  - 409 shows the replace text and a "Replace" button that re-sends with `replace` true;
  - choosing another file clears the warning;
  - Cancel sends nothing.
- [x] 3.3 On `HolidayListPage`, add `canUpload` and the Upload button below the list (loaded, empty and not-found states only, own list only). Open the dialog through `HlmDialogService`; after a success, show "Holiday list <name> uploaded." and reload. Verify with page spec cases:
  - the button shows with the admin right, for the `ADMIN` user's rights too;
  - it is hidden for view-only users, while loading, after an error, and on a branch opened from the Branch List;
  - it shows on "Holiday List Not Found";
  - a successful dialog reloads the list and shows the notification.

## 4. Integration check

- [x] 4.1 Run `dotnet test` in `backend` without `IERP_TEST_ORACLE` (the dev database is read-only) and `npx ng test --watch=false` in `frontend`. Verify that both pass, and that the upload tests use temp folders only, never the configured `HolidayLists:Folder`.

## 5. Several files at once (added during apply)

- [x] 5.1 Let the upload dialog take up to 20 `.txt` files and send them one after another, with a result per file, Replace for the existing ones only, and closing with the saved names (design D5). The page's notification names one file or counts several. Verify with the dialog spec (order, refusals keep going, Replace sends only the existing files, too many files, Cancel after a partial upload) and the page spec, then the full frontend run.
