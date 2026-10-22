# Spec Delta

## Purpose

Provides the read-only backend endpoint behind the Holiday List screen: it returns the holidays of the session's company, branch and financial year from that branch's holiday text file in a configured folder.

## ADDED Requirements

### Requirement: Holiday list endpoint
The system SHALL expose `GET /api/admin/holidays`, which needs a valid token. It SHALL take the company, branch and financial year from the session, never from the request, and SHALL accept no parameters. On success it SHALL answer 200 with the session branch's code and name and the holidays of its holiday file, in the order of the file. Each holiday SHALL have its holiday, day and date exactly as written in the file.

#### Scenario: Holidays of the session's branch
- **WHEN** a user of company "CPL", branch "COKSF" and financial year 2026-2027 requests the holidays, and the file holds "Republic Day,Monday,26-01-2026" and "Vishu,Thursday,14-May-2026"
- **THEN** the response is 200 with the branch code "COKSF", its name, and two holidays in that order: "Republic Day", "Monday", "26-01-2026", then "Vishu", "Thursday", "14-May-2026"

### Requirement: Holiday file
The holiday file SHALL be the file named `<company code>-<branch code>-<year code>.txt` in the folder set in configuration (`HolidayLists:Folder`, `D:\erp-cargomar\resources\Holiday List\` by default):
- the company code is the session's company code;
- the branch code is the code of the session's branch;
- the year code is the code of the session's financial year (2026 for 2026-2027).

The system SHALL read only that file, never a file outside the folder, and SHALL never write, create or delete holiday files.

#### Scenario: File name
- **WHEN** the session's company is "CPL", its branch's code is "COKSF" and its financial year's code is 2026
- **THEN** the file read is `CPL-COKSF-2026.txt` in the configured folder

#### Scenario: Year switched
- **WHEN** the user switches the financial year to 2025-2026, whose code is 2025
- **THEN** the file read is `CPL-COKSF-2025.txt`

#### Scenario: Folder changed in configuration
- **WHEN** `HolidayLists:Folder` is changed to another folder
- **THEN** holiday files are read from that folder, with no code change

### Requirement: Holiday lines
Each line of the file that is not blank SHALL be one holiday, written as `holiday,day,date` (for example `Republic Day,Monday,26-01-2026`):
- the last field SHALL be the date and the one before it the day; the fields before them, joined again with commas, SHALL be the holiday, so a holiday name may hold commas;
- a line with two fields SHALL be a holiday and a date, with no day;
- a line without a comma SHALL be a holiday with no day and no date.

Every field SHALL be returned exactly as written, without surrounding spaces; a field that is empty SHALL have no value. The day and the date SHALL NOT be calculated, checked or reformatted. A heading line whose fields are "Holiday", "Day" and "Date" (in any letter case) SHALL be skipped, and so SHALL blank lines. The file SHALL be read as UTF-8, with or without a byte order mark.

#### Scenario: Exactly as written
- **WHEN** the file has "Labour Day,Tuesday,01-May-2026"
- **THEN** the holiday is "Labour Day", its day "Tuesday" and its date "01-May-2026", although 1 May 2026 is a Friday

#### Scenario: Heading skipped
- **WHEN** the file is "Holiday,Day,Date", then "Republic Day,Monday,26-January-2026"
- **THEN** the heading is skipped and the one holiday is "Republic Day", "Monday", "26-January-2026"

#### Scenario: Holiday name with a comma
- **WHEN** a line is "Onam, Thiruvonam,Wednesday,26-08-2026"
- **THEN** the holiday is "Onam, Thiruvonam", its day "Wednesday" and its date "26-08-2026"

#### Scenario: Missing fields
- **WHEN** the lines are "Christmas,,25-12-2026", "Local festival,26-10" and "Diwali"
- **THEN** the holidays are "Christmas" with no day and date "25-12-2026"; "Local festival" with no day and date "26-10"; and "Diwali" with no day and no date

#### Scenario: Space-separated line
- **WHEN** a line is "Republic Day    Monday    26-01-2026", with no commas
- **THEN** the whole line is the holiday, with no day and no date

#### Scenario: Blank lines
- **WHEN** the file has blank lines between holidays
- **THEN** they are skipped and the other holidays keep their order

#### Scenario: Empty file
- **WHEN** the file exists but has no holiday lines
- **THEN** the response is 200 with no holidays

### Requirement: Holiday list not found
The system SHALL answer 404 with the message "Holiday list not found." when there is no holiday file for the session. This applies when the file does not exist in the folder, when no folder is configured, and when the session's branch or financial year cannot be found.

#### Scenario: No file for the branch
- **WHEN** the folder has no file for the session's company, branch and year
- **THEN** the response is 404 with the message "Holiday list not found."

#### Scenario: Unknown year
- **WHEN** the session's financial year is not found
- **THEN** the response is 404 with the message "Holiday list not found." and no file is read
