# reports-branch-list-api Specification

## Purpose
Provides the read-only backend of the Branch List report: the paged, filtered list of the logged-in company's branches, and the holiday list of one of those branches.

## Requirements

### Requirement: Branch list endpoint
The system SHALL expose `GET /api/reports/branches`, which needs a valid token. It SHALL return one page of branches with the total matching count, the page and the page size, in the same shape as the Company List.
- Each branch SHALL have its id, code, name, address lines 1–3, tel, email and web; an empty value SHALL be an empty string.
- `page` (from 1) and `pageSize` (one of the common page sizes) SHALL be validated as for the Company List; an invalid value SHALL answer 400 naming the field.
- The endpoint SHALL only read data.

#### Scenario: Branches of the company
- **WHEN** the logged-in company has 16 branches and the user requests page 1 of 10
- **THEN** the response holds 10 branches and the total 16

#### Scenario: Invalid paging values
- **WHEN** the request has `page=0` or `pageSize=7`
- **THEN** the response is 400 naming `Page` or `PageSize`

#### Scenario: No token
- **WHEN** a client requests the branches without a token
- **THEN** the response is 401

### Requirement: Only the company's branches are listed
The list SHALL hold only rows of `COMPANYM` that are branches (`COMP_TYPE` 'B') of the logged-in company and are not deleted (`REC_DELETED_DATE` empty). The company SHALL come from the session, never from the request.

#### Scenario: Companies and other companies' branches excluded
- **WHEN** the table holds 4 companies and 26 branches, 16 of them in the logged-in company
- **THEN** the list shows those 16 branches only

#### Scenario: Deleted branch excluded
- **WHEN** one of the company's branches has a deleted date
- **THEN** it is not listed and not counted

### Requirement: Branch filters and order
`code` SHALL filter on the branch code and `name` on the branch name. Each SHALL match when the value contains the text, ignoring letter case; a blank filter SHALL not restrict; both SHALL have to match; `%` and `_` SHALL be ordinary characters. Branches SHALL be ordered by name, then by id, so that no branch is repeated or skipped between pages.

#### Scenario: Filter by code
- **WHEN** the user searches for code "c"
- **THEN** only branches whose code contains "c" or "C" are listed, and the total counts only those

#### Scenario: Filter characters are plain text
- **WHEN** the user searches for name "100%"
- **THEN** only branches whose name contains "100%" are listed

### Requirement: Holiday list of a listed branch
The system SHALL expose `GET /api/reports/branches/{id}/holidays`, which needs a valid token. For a branch of the logged-in company that is not deleted, it SHALL return the branch's code and name and the holidays of its holiday file for the session's financial year. The file, its name (`<company code>-<branch code>-<year code>.txt`), its folder and the reading of its lines SHALL be those of the Holiday List. It SHALL answer 404 with the message "Holiday list not found." when the branch is not one of the company's listed branches, or when the branch has no holiday file.

#### Scenario: Another branch's holidays
- **WHEN** a user of company "CPL" in financial year 2026-2027 requests the holidays of branch "BLRAF", whose file `CPL-BLRAF-2026.txt` lists "Republic Day,Monday,26-January-2026"
- **THEN** the response is 200 with the branch code "BLRAF", its name, and the holiday "Republic Day", "Monday", "26-January-2026" as written

#### Scenario: Branch of another company
- **WHEN** the id is a branch of another company, a company, or no row at all
- **THEN** the response is 404 with the message "Holiday list not found." and no file is read

#### Scenario: No file for the branch
- **WHEN** the branch is listed but has no holiday file for the year
- **THEN** the response is 404 with the message "Holiday list not found."

### Requirement: Branch list works on Oracle 10g
The branch list and branch lookup queries SHALL run on Oracle 10.2: no `TRUE`/`FALSE` literals and the 10g paging form.

#### Scenario: Listing on 10.2
- **WHEN** the queries are generated for Oracle
- **THEN** their SQL has no `TRUE` or `FALSE` and filters `COMP_TYPE` and the company in plain comparisons
