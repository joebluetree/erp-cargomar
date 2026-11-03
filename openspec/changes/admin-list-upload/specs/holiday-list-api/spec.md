# Spec Delta

## ADDED Requirements

### Requirement: Holiday file upload endpoint
The system SHALL expose `POST /api/admin/holidays/file`, which needs a valid token and takes one file as multipart form data (`file`), with an optional `replace` flag. A file that passes every check of this capability SHALL be saved in the holiday folder (`HolidayLists:Folder`) under its own name and answered with 200 and the saved file name. A refused or failed upload SHALL answer with problem details and leave the folder unchanged.

#### Scenario: Upload a new file
- **WHEN** an admin of the Holiday List uploads `CPL-COKSF-2026.txt` and the folder has no file of that name
- **THEN** the response is 200 with the name `CPL-COKSF-2026.txt`, and the folder has that file with the uploaded content

#### Scenario: Uploaded list is read at once
- **WHEN** the uploaded file is the session's own `<company>-<branch>-<year>.txt`
- **THEN** the next `GET /api/admin/holidays` returns its holidays

#### Scenario: No file sent
- **WHEN** the request has no file
- **THEN** the response is 400 "Choose a holiday list file to upload." and nothing is written

### Requirement: Upload needs the Holiday List admin right
The upload SHALL be accepted only when the logged-in user has the view right and the admin right (`RIGHTS_ADMIN` 'Y') on the Holiday List menu (`NS-HOLIDAYLIST`) in the session branch. The admin user (user code `ADMIN`) SHALL always have both. Any other user SHALL be answered 403 "You do not have access to this screen." without the view right, and 403 "You may not upload holiday lists." with the view right but without the admin right. The rights SHALL be checked before the file is read.

#### Scenario: Admin user uploads
- **WHEN** the admin user, with no `USERRIGHTS` rows, uploads a valid file
- **THEN** the file is saved

#### Scenario: User with the admin right uploads
- **WHEN** a user whose Holiday List row in the session branch has view 'Y' and admin 'Y' uploads a valid file
- **THEN** the file is saved

#### Scenario: View right only
- **WHEN** a user with view 'Y' and admin 'N' on the Holiday List uploads a file
- **THEN** the response is 403 "You may not upload holiday lists." and nothing is written

#### Scenario: Admin right in another branch only
- **WHEN** a user has the Holiday List admin right in another branch but not in the session branch
- **THEN** the upload is refused with 403 and nothing is written

### Requirement: Uploaded file name
The uploaded file's own name SHALL be kept, and it SHALL follow the holiday file naming rule `<company code>-<branch code>-<year code>.txt`, where:
- the company code is the session's company code;
- the branch code is the code of a not-deleted branch of the session's company;
- the year code is the code of a financial year of the session's company, as a whole number.

The extension SHALL be `.txt` in any case. Letter case of the codes SHALL be compared without regard to case, and the file SHALL be saved under the codes as the database writes them. Any other name, or a name with a folder part, SHALL be refused with 400 "The file name must be <company code>-<branch code>-<year code>.txt, for example CPL-COKSF-2026.txt." and nothing is written.

#### Scenario: Another branch of the company
- **WHEN** an admin working in branch "COKSF" uploads `CPL-MAASF-2026.txt`, and "MAASF" is a branch of company "CPL" and 2026 a year of "CPL"
- **THEN** the file is saved as `CPL-MAASF-2026.txt`

#### Scenario: Name saved with the database's codes
- **WHEN** the uploaded file is named `cpl-coksf-2026.TXT`
- **THEN** it is saved as `CPL-COKSF-2026.txt`

#### Scenario: Another company
- **WHEN** the session's company is "CPL" and the file is named `XYZ-COKSF-2026.txt`
- **THEN** the response is 400 with the naming message and nothing is written

#### Scenario: Unknown branch or year
- **WHEN** the file names a branch code that is not a branch of the session's company, or a year code that is not one of its years
- **THEN** the response is 400 with the naming message and nothing is written

#### Scenario: Not a text file
- **WHEN** the file is named `CPL-COKSF-2026.csv` or `holidays.txt`
- **THEN** the response is 400 with the naming message and nothing is written

#### Scenario: Folder part in the name
- **WHEN** the sent file name is `..\CPL-COKSF-2026.txt` or holds a folder
- **THEN** the response is 400 with the naming message and nothing is written outside or inside the folder

### Requirement: Replacing an existing holiday file
When a file of the same name already exists in the folder, the upload SHALL be refused with 409 "A holiday list named <name> already exists." unless the request's `replace` flag is true. With `replace` true the existing file SHALL be replaced in full by the uploaded one. Replacing SHALL never leave a partly written file: a failed write SHALL keep the old file as it was.

#### Scenario: File exists
- **WHEN** an admin uploads `CPL-COKSF-2026.txt` without `replace` and that file exists
- **THEN** the response is 409 "A holiday list named CPL-COKSF-2026.txt already exists." and the old file is unchanged

#### Scenario: Replace confirmed
- **WHEN** the same upload is sent with `replace` true
- **THEN** the file now has the uploaded content and the response is 200

### Requirement: Uploaded file content
The uploaded file SHALL be at most 100 KB, SHALL NOT be empty, and SHALL be readable as UTF-8 text (a byte order mark is allowed). A file that breaks one of these SHALL be refused with 400 problem details naming the problem: "The holiday list file is empty.", "The holiday list file must be at most 100 KB." or "The holiday list file must be UTF-8 text.". Nothing else about the content SHALL be checked: the lines are kept exactly as uploaded and read with the existing holiday line rules.

#### Scenario: Empty file
- **WHEN** the uploaded file has no bytes
- **THEN** the response is 400 "The holiday list file is empty." and nothing is written

#### Scenario: Too large
- **WHEN** the uploaded file is larger than 100 KB
- **THEN** the response is 400 "The holiday list file must be at most 100 KB." and nothing is written

#### Scenario: Not text
- **WHEN** the uploaded file is not valid UTF-8 text
- **THEN** the response is 400 "The holiday list file must be UTF-8 text." and nothing is written

## MODIFIED Requirements

### Requirement: Holiday file
The holiday file SHALL be the file named `<company code>-<branch code>-<year code>.txt` in the folder set in configuration (`HolidayLists:Folder`, `D:\erp-cargomar\resources\Holiday List\` by default):
- the company code is the session's company code;
- the branch code is the code of the session's branch;
- the year code is the code of the session's financial year (2026 for 2026-2027).

The system SHALL read only that file, never a file outside the folder. It SHALL write holiday files only through the upload (see "Holiday file upload endpoint"), only inside the folder, and SHALL never delete or rename them.

#### Scenario: File name
- **WHEN** the session's company is "CPL", its branch's code is "COKSF" and its financial year's code is 2026
- **THEN** the file read is `CPL-COKSF-2026.txt` in the configured folder

#### Scenario: Year switched
- **WHEN** the user switches the financial year to 2025-2026, whose code is 2025
- **THEN** the file read is `CPL-COKSF-2025.txt`

#### Scenario: Folder changed in configuration
- **WHEN** `HolidayLists:Folder` is changed to another folder
- **THEN** holiday files are read from that folder, with no code change

#### Scenario: Listing never writes
- **WHEN** a user opens a holiday list
- **THEN** no holiday file is written, created or deleted
