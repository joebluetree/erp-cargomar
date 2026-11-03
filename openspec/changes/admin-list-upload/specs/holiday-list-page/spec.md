# Spec Delta

## ADDED Requirements

### Requirement: Upload button
The Holiday List screen opened from the menu SHALL show an "Upload" button below the list. It SHALL show only when the user has the admin right on the Holiday List menu (`NS-HOLIDAYLIST`) in the session branch, as loaded when the screen opens; the admin user always has it. It SHALL also show when the branch has no list ("Holiday List Not Found") or the list has no holidays. It SHALL NOT show while the list loads or after a load failure, nor on a branch's list opened from the Branch List.

#### Scenario: Admin sees the button
- **WHEN** the admin user, or a user with the Holiday List admin right in the session branch, opens the Holiday List
- **THEN** an "Upload" button is shown below the list

#### Scenario: Other users do not
- **WHEN** a user with the view right but not the admin right opens the Holiday List
- **THEN** no "Upload" button is shown and the screen is view only

#### Scenario: No list yet
- **WHEN** an admin opens the Holiday List and the screen shows "Holiday List Not Found"
- **THEN** the "Upload" button is shown below the message

#### Scenario: Branch List's holiday view
- **WHEN** an admin opens a branch's holiday list from the Branch List
- **THEN** no "Upload" button is shown

### Requirement: Upload dialog
The Upload button SHALL open a modal dialog titled "Upload Holiday List" with a file field that accepts one or more `.txt` files, at most 20 at a time, and Upload and Cancel buttons at the bottom right, Upload first. The dialog SHALL state the expected file name form, `<company code>-<branch code>-<year code>.txt`. Upload SHALL be disabled until a file is chosen and while files are being sent. Upload SHALL send each chosen file on its own, one after another, and show each file's result: uploaded with its saved name, already existing, or refused with the backend's reason. Cancel, Escape and the dialog's close button SHALL close it without sending anything more.

#### Scenario: Choose and upload several files
- **WHEN** the admin chooses `CPL-COKSF-2026.txt` and `CPL-MAASF-2026.txt` and activates Upload
- **THEN** each file is sent once, one after the other, and Upload shows progress and is disabled until the last answer arrives

#### Scenario: All uploaded
- **WHEN** every chosen file is saved
- **THEN** the dialog closes, a success notification is shown ("Holiday list CPL-COKSF-2026.txt uploaded." for one file, "2 holiday lists uploaded." for several) and the Holiday List reloads

#### Scenario: Some refused
- **WHEN** the backend refuses one of the files with 400 or 403
- **THEN** the other files are still sent, that file's row shows the backend's reason, and the dialog stays open

#### Scenario: Existing files
- **WHEN** the backend answers 409 for some files because they exist
- **THEN** their rows say "A holiday list named <name> already exists. Replace it?" and the Upload button becomes "Replace"; activating Replace sends only those files again with `replace` true, and Cancel keeps the old files

#### Scenario: Other files chosen
- **WHEN** the dialog shows results and the admin chooses other files
- **THEN** the results go away and the button is "Upload" again

#### Scenario: Too many files
- **WHEN** the admin chooses more than 20 files
- **THEN** the dialog says "Choose at most 20 files at a time." and Upload stays disabled

#### Scenario: Cancel after a partial upload
- **WHEN** some files were saved and the admin activates Cancel
- **THEN** the dialog closes, the success notification counts the saved files and the Holiday List reloads

#### Scenario: Cancel
- **WHEN** the admin activates Cancel, presses Escape or closes the dialog before Upload
- **THEN** nothing is sent and the list is unchanged

#### Scenario: Keyboard and focus
- **WHEN** the dialog opens
- **THEN** focus moves into the dialog, stays inside it while it is open, and returns to the Upload button when it closes

## MODIFIED Requirements

### Requirement: Holiday List screen
The screen SHALL show the title "Holiday List" and, below it, one box in the style of the Profile's boxes. Inside the box, at the top, a header SHALL show the branch's name. Below it the box SHALL show three columns under the headings **Holiday**, **Day** and **Date**, with one row per holiday in file order, all columns left-aligned. Each column SHALL show the file's text exactly as written. A missing value SHALL show "—". The list SHALL be view only, with no inputs and no edit, save or delete actions; the only action on the screen SHALL be the Upload button, for admins (see "Upload button").

#### Scenario: Holidays shown
- **WHEN** the user's branch is "CARGOMAR (P) LTD (HO)" and its file is "Republic Day,Monday,26-01-2026" and "Vishu,Thursday,14-May-2026"
- **THEN** the box shows "CARGOMAR (P) LTD (HO)" at its top, then the headings Holiday, Day and Date, then "Republic Day", "Monday", "26-01-2026", then "Vishu", "Thursday", "14-May-2026"

#### Scenario: Exactly as written
- **WHEN** the file has "Labour Day,Tuesday,01-May-2026"
- **THEN** the row shows "Labour Day", "Tuesday" and "01-May-2026", exactly as the file writes them

#### Scenario: Missing values
- **WHEN** a holiday has no day or no date
- **THEN** its row shows "—" in that place

#### Scenario: View only
- **WHEN** the Holiday List is shown to a user without the Holiday List admin right
- **THEN** it has no inputs and no upload, edit, save or delete buttons
