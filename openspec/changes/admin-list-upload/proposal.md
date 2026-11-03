# Proposal

## Why

Branch holiday lists are `.txt` files in the folder set in `HolidayLists:Folder`, and today someone has to copy them there by hand: the system only reads them. The BRS `kb/modules/admin/holiday-list.md` v1.1 (BR-002) lets the admin user, and users with the admin right on the Holiday List, upload a holiday list file from the Holiday List screen. Every other user keeps view only.

## What Changes

- **Upload button:** the Holiday List screen (the user's own list, opened from the menu) shows an "Upload" button below the list. It shows only to a user with the admin right on the Holiday List menu (`NS-HOLIDAYLIST`) in the session branch, which includes the admin user (`ADMIN`, who has every right). It also shows when the branch has no list yet ("Holiday List Not Found"), so a first file can be uploaded (BR-002.1–BR-002.3, BR-002.S1).
- **Upload dialog:** the button opens a modal with a file picker for one or more `.txt` files (at most 20), and Upload and Cancel buttons. Upload sends each file on its own, one after another, and shows each file's result. Cancel, Escape and the close button send nothing more.
- **File name kept:** the file is saved in the holiday-list folder under its own name (BR-002.S2), which must follow the holiday file naming rule `<company code>-<branch code>-<year code>.txt`:
  - the company code is the session's company;
  - the branch code is a branch of that company;
  - the year code is a financial year of that company.

  So an admin can upload any branch's or year's list from one screen. A name that does not follow the rule is refused with a message naming the expected form.
- **Replace after confirming:** when a file with that name already exists, the dialog says so and asks to confirm. Only "Replace" overwrites it, and Cancel keeps the old file.
- **Checks:**
  - only `.txt`, at most 100 KB, not empty, and readable as UTF-8 text;
  - the backend checks the admin right and every rule above again, so a direct API call cannot bypass them;
  - a refused or failed upload leaves the folder unchanged.
- **New endpoint:** `POST /api/admin/holidays/file` (multipart), needing the Holiday List's view and admin rights in the session branch.
- **After an upload:** a success notification is shown and the list reloads, so a file for the session's branch and year shows at once.
- **Not in scope:** uploading from the Branch List's holiday view, deleting or renaming files, and editing holidays on screen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `holiday-list-api`: "Holiday file" no longer says holiday files are never written. New requirements cover the upload endpoint, its rights, the uploaded name, replacing an existing file, and the content checks.
- `holiday-list-page`: new requirements for the Upload button and the upload dialog on the Holiday List screen.

## Impact

- **Backend:**
  - `iErp.SharedBusiness/Holidays`: the file store gains "exists" and "write" next to "read", with the same folder and name safety, and the naming rule gains a parser for a file name.
  - `iErp.Admin/HolidayList`: an upload service, an upload action on `HolidaysController`, and repository lookups for a branch code and a year code of the company.
  - The upload checks `IMenuAccess.IsAdminAsync(NS-HOLIDAYLIST)`, which is true for the admin user without reading `USERRIGHTS` (admin-admin-user-rights).
  - No table, migration or database write. The only write is the `.txt` file in the configured folder.
- **Frontend:** the Holiday List page and service, and a new upload dialog component that follows the Change Branch dialog.
- **Config:** the existing `HolidayLists:Folder`. The API's account needs write access to that folder.
- **Depends on:** `admin-admin-user-rights` for the admin user's full rights. It is implemented, not yet archived.
- **Docs:** `kb/modules/admin/holiday-list.md` already describes v1.1. Per CLAUDE.md the kb is not edited here.
