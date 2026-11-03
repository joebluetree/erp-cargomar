# Design

## Context

- **How a list is read today:** `HolidaysController` (`GET /api/admin/holidays`, `[RequiresMenu(NS-HOLIDAYLIST)]`) asks `HolidayListService` for the session's file.
- **Shared pieces in `iErp.SharedBusiness/Holidays`:**
  - `HolidayFiles.NameFor` builds `<company>-<branch>-<year>.txt`;
  - `IHolidayFileStore.Read` reads it from `HolidayLists:Folder`, only by its bare name and only inside the folder;
  - `HolidayLines.Parse` reads its lines.
- **No writes so far:** nothing writes the folder, and the spec says so.
- **Rights:** `IMenuAccess` (Shared) gives `CanViewAsync` and `IsAdminAsync` per menu code, live per request. After admin-admin-user-rights, both are true for the `ADMIN` user without reading `USERRIGHTS`.
- **Frontend:** the guard puts the screen's rights in `MenuRightsStore`. The Change Branch dialog is the app's modal pattern: opened through `HlmDialogService`, with its own provided service, warning notifications for refusals, and `SKIP_ERROR_NOTIFICATION` on its request.

Motivation: see proposal.md. Requirements: see `specs/holiday-list-api` and `specs/holiday-list-page`.

## Goals / Non-Goals

**Goals:**
- One write path, as safe as the read path: bare name, inside the folder, `.txt` only, and never a half-written file.
- The backend decides everything (rights, name, size, text, replace), so the UI is only a convenience.
- Reuse the naming rule and the folder setting. No second definition of either.

**Non-Goals:**
- No upload from the Branch List's holiday view, and no delete, rename or on-screen editing.
- No parsing check of the content beyond "UTF-8 text": the existing line rules already accept any text.
- No database writes, and no audit table.

## Decisions

### D1. Endpoint: `POST /api/admin/holidays/file` on `HolidaysController`

The action is multipart (`IFormFile file`, `[FromForm] bool replace`) on the existing controller. It keeps the class-level `[RequiresMenu(NS-HOLIDAYLIST)]` (view right, 403 "You do not have access to this screen.") and first checks `IMenuAccess.IsAdminAsync(NS-HOLIDAYLIST)`: 403 "You may not upload holiday lists.". Only then is the file read.

`[RequestSizeLimit(1 MB)]` and a matching form limit stop large bodies early. Files between 100 KB and 1 MB still reach the service and get the spec's 400 message; anything larger is 413 from the server.

- *Alternative:* a separate upload controller. Rejected: the screen's menu and rights are the same, and the existing controller already carries them.

### D2. Name rule: parse against the session, then look the codes up

`HolidayFiles` gets `Parse(fileName, companyCode)`. It needs the bare name (`Path.GetFileName(name) == name`), an extension of `.txt` in any case, and a stem of `<company>-<middle>-<year>`:
- the company part must equal the session's company code, ignoring case;
- the year is the part after the last `-` and must be digits;
- the branch code is everything between, so a branch code with a `-` still works.

`IHolidayListRepository` gets two lookups:
- `FindCompanyBranchByCodeAsync(companyId, code)`: type 'B', under the company, not deleted, code compared trimmed and ignoring case;
- `FindCompanyYearByCodeAsync(companyCode, yearCode)`: a year of the company with that `YEAR_CODE`, open or closed.

The saved name is rebuilt with `HolidayFiles.NameFor` from the database's codes. So `cpl-coksf-2026.TXT` is saved as `CPL-COKSF-2026.txt`, the exact name the list reads.

- *Why any branch and year of the company, for both the `ADMIN` user and rights admins:* you chose to keep the uploaded name, so that one screen can upload any branch's or year's list. Limiting a rights admin to their allotted branches was considered. It is not asked for in BR-002, and it can be added later without changing the endpoint.
- *Why closed years too:* a past year's list may still need fixing, and the Holiday List reads by year code whatever the year's state.

### D3. Write: temp file plus move, in the store

`IHolidayFileStore` gets `Exists(fileName)` and `Write(fileName, bytes, replace)`. Both reuse the read path's guards (bare name, `.txt`, full path inside the folder) through one private resolver.

`Write` saves the bytes to a temp file in the same folder (`.<name>.<guid>.tmp`), then calls `File.Move(temp, path, overwrite: replace)`. The move is atomic on the same volume, so the list is never half-written. Without `replace`, an existing target makes the move fail, which becomes the 409 even if the file appeared after the `Exists` check. On any failure the temp file is deleted, and the old file stays untouched.

The bytes are saved exactly as uploaded, BOM included.

- *Alternative:* `File.WriteAllBytes` straight onto the target. Rejected: a failure midway would leave a broken list for every user of that branch.

### D4. Content checks: in the service, before writing

`HolidayUploadService` runs these checks in order:
1. the file is present;
2. its length is greater than 0 and at most 102,400 bytes;
3. it decodes with a strict `UTF8Encoding(throwOnInvalidBytes: true)`;
4. the name passes the rule (D2);
5. the file exists or not, unless `replace` is set.

Then it writes. Every message is the spec's exact text.

The service returns an outcome (`Saved`, `Invalid(message)`, `Exists(name)`), and the controller maps it to 200, 400 or 409 problem details with `ApiProblem.Create`, as the other controllers do.

### D5. Frontend: Upload button on the page, upload dialog as its own component

- **The button:** `HolidayListPage` gets `canUpload`. It is true when there is no `branchId` (the user's own list) and `MenuRightsStore.rightsOf(NS-HOLIDAYLIST)?.admin` is true. The button shows in the loaded, empty and not-found states, never while loading or after an error.
- **The dialog:** a new `HolidayUploadDialog`, opened lazily through `HlmDialogService` like the Change Branch dialog. It provides its own `HolidayUploadService` (`upload(file, replace)`, multipart, `SKIP_ERROR_NOTIFICATION`), so it does not depend on the page's route-provided service.
- **Several files at once (added during apply):** the field takes up to 20 `.txt` files. The backend stays one file per request: the dialog sends the files one after another (`concatMap`), so each file gets every backend check on its own and one bad file never blocks the others.
- **The dialog's states:**
  - Upload is disabled until a file is chosen, and while sending;
  - each file shows its own result: uploaded (with the saved name), already existing, or refused with the backend's reason;
  - files answered 409 wait for "Replace", which re-sends only them with `replace=true`;
  - choosing other files clears the results;
  - a failure that is not an API answer shows the shared server error message in that file's row.
- **After an upload:** when every file is saved the dialog closes on its own. It always closes with the names saved, also on Cancel after a partial upload, and the page then shows one success notification (the name for one file, the count for several) and reloads the list.

## Risks / Trade-offs

- [The API's account cannot write the folder] → The upload answers 500 through the usual error path, and the list keeps working. Deployment must grant write access to `HolidayLists:Folder` (noted in the proposal).
- [Two admins replace the same file at once] → Each move is atomic, so the last one wins and the file is never mixed. This is acceptable for a rarely edited list.
- [A rights admin can upload any branch's list of the company] → This follows from keeping the uploaded name (D2). The name must still be a real branch and year of the session's company.
- [Temp files left after a crash] → They start with `.` and end in `.tmp`, so the list never reads them (it reads only `<company>-<branch>-<year>.txt`). They can be deleted by hand.

## Migration Plan

Deploy the API and the frontend together, and make sure the API's account can write `HolidayLists:Folder`. No data migration. To roll back, redeploy the previous versions; uploaded files stay and are read as before.
