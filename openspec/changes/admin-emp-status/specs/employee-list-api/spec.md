# Spec Delta

## ADDED Requirements

### Requirement: Employee status filter
The list endpoint SHALL accept an optional `status` of `active`, `relieved` or `all`, in any letter case, and SHALL treat a missing or blank value as `active`.
- `active` lists only employees whose `EMP_IS_RELIEVED` is 'N'.
- `relieved` lists only those whose `EMP_IS_RELIEVED` is 'Y'.
- `all` lists the employees in scope without checking `EMP_IS_RELIEVED`.

The status combines with the code and name filters, and `total` counts only the employees that match.

#### Scenario: Default is active
- **WHEN** a client requests the list without `status`
- **THEN** only employees with `EMP_IS_RELIEVED` 'N' are returned, as before

#### Scenario: Relieved employees
- **WHEN** a client requests `status=relieved`
- **THEN** only employees with `EMP_IS_RELIEVED` 'Y' are returned

#### Scenario: All employees
- **WHEN** a client requests `status=all`
- **THEN** both current and relieved employees in scope are returned, ordered by name then id

#### Scenario: Combined with the other filters
- **WHEN** a client requests `status=relieved&name=kum`
- **THEN** only relieved employees whose name contains "kum" are returned, and `total` counts only them

### Requirement: Branch filter for admins
A user SHALL be an admin of the list when their rights row on the session company's Employee List menu (`NS-EMPLIST`) in the session branch has `RIGHTS_ADMIN` 'Y'. An admin's allowed branches SHALL be the session's branch plus the branches assigned to the user (`USERD`) that are branches of the session company (`COMPANYM` rows of type 'B' under the company, not deleted), whatever the user's rights in them. A non-admin's allowed branches SHALL be the session's branch alone. The backend SHALL decide this from the session on every request. The list endpoint SHALL accept an optional `branch`:
- missing, blank or the session's branch id: the employees of the session's branch, for every user;
- `all` in any letter case: the employees of every allowed branch;
- the id of an allowed branch: the employees of that branch;
- any other value, for every user: 403 problem details, and nothing is listed.

The branch combines with the status, code and name filters.

#### Scenario: Admin chooses a branch
- **WHEN** a user assigned Kochi, Chennai and Delhi, logged in to Kochi with the admin right there, requests `branch=<id of Chennai>`
- **THEN** only employees of Chennai are returned, whatever the user's rights in Chennai, and `total` counts only them

#### Scenario: Admin chooses all branches
- **WHEN** that user requests `branch=all&status=all`
- **THEN** the current and relieved employees of Kochi, Chennai and Delhi are returned, ordered by name then id, and none of Mumbai, which is not assigned to them, or of another company

#### Scenario: Branch not assigned
- **WHEN** that user requests `branch=<id of Mumbai>`, or the id of another company's branch, or an unknown id
- **THEN** the response is 403 problem details

#### Scenario: No admin right in the session branch
- **WHEN** the same user logs in to Chennai, where their row has `RIGHTS_ADMIN` 'N', and requests `branch=all` or the id of Kochi
- **THEN** the response is 403 problem details

#### Scenario: No branch given
- **WHEN** an admin or a non-admin requests the list without `branch`
- **THEN** only employees of the session's branch are returned, as before

### Requirement: Branch options
The system SHALL expose a read-only `GET /api/admin/employees/branches`, needing the Employee List's view right, that returns the user's allowed branches (see Branch filter for admins), each with its id, code and name, ordered by name then id, when the user is an admin of the list, and an empty list otherwise.

#### Scenario: Admin gets the assigned branches
- **WHEN** a user assigned Kochi, Chennai and Delhi, logged in to Kochi with the admin right there, requests the branch options
- **THEN** the response is 200 with Chennai, Delhi and Kochi, by name, and no other branch

#### Scenario: Deleted or other company's branch left out
- **WHEN** a branch assigned to the user is deleted or belongs to another company
- **THEN** that branch is not among the options

#### Scenario: Non-admin
- **WHEN** a user with the view right but `RIGHTS_ADMIN` 'N' in the session branch requests the branch options
- **THEN** the response is 200 with an empty list

#### Scenario: No token
- **WHEN** a client requests the branch options without a token
- **THEN** the response is 401

## MODIFIED Requirements

### Requirement: Employees in scope
Every employee endpoint of this capability SHALL consider only the employees in scope: `EMPM` rows whose company code (`REC_COMPANY_CODE`) is the session's company code and branch code (`REC_BRANCH_CODE`) is the code (`COMPANYM.COMP_CODE`) of one of the scope's branches, whether or not they are relieved. The company SHALL come from the access token, never from the request. The branch SHALL be:
- for a non-admin, the session's branch, from the access token;
- for an admin's list, the session's branch unless `branch` chooses another allowed branch or all of them (see Branch filter for admins);
- for an admin's profile and photo requests, every allowed branch.

#### Scenario: Other branch left out
- **WHEN** a non-admin's session branch is "Kochi" and an employee belongs to branch "Chennai" of the same company
- **THEN** that employee is not listed and their profile answers 404

#### Scenario: Other company left out
- **WHEN** an admin requests `branch=all`, or the profile of an employee of another company
- **THEN** no employee of another company is listed, and that profile answers 404

#### Scenario: Branch not assigned left out
- **WHEN** an admin logged in to Kochi requests the profile of an employee of Mumbai, which is not assigned to them
- **THEN** that profile answers 404

#### Scenario: Relieved left out
- **WHEN** an employee of the session's branch has `EMP_IS_RELIEVED` 'Y' and the list is requested without `status` (Active)
- **THEN** that employee is not listed

#### Scenario: Relieved in scope
- **WHEN** an employee of the session's branch has `EMP_IS_RELIEVED` 'Y'
- **THEN** that employee is listed with `status=relieved` or `status=all`, and their profile answers 200

#### Scenario: Branch switched
- **WHEN** the user switches the session to another branch
- **THEN** the list requested without `branch` shows the employees of the new branch

### Requirement: Employee list endpoint
The system SHALL expose a read-only `GET /api/admin/employees` that returns one page of the employees in scope, following the common paging request and response of `server-side-tables`. It accepts:
- optional `code` and `name` filters: case-insensitive "contains" on `EMP_NO` and `EMP_NAME`, combined, with `%` and `_` as ordinary characters, at most 60 characters;
- an optional `status` (see Employee status filter);
- an optional `branch` (see Branch filter for admins), at most 40 characters;
- a one-based `page` (default 1);
- a `pageSize` (default 10; 2, 5, 10, 25, 50 or 100).

Rows SHALL be ordered by name, then id.

#### Scenario: First page
- **WHEN** 23 current employees are in scope and a client requests the endpoint without parameters
- **THEN** the response is 200 with the first 10 of them ordered by name, `total` 23, `page` 1 and `pageSize` 10

#### Scenario: Filter by code and name
- **WHEN** a client requests `code=10&name=kum`
- **THEN** only employees whose code contains "10" and whose name contains "kum", in any letter case, are returned, and `total` counts only them

#### Scenario: Filter characters are plain text
- **WHEN** a client requests `name=a_b`
- **THEN** the underscore is matched literally

#### Scenario: Invalid paging values
- **WHEN** a client requests `page=0`, `pageSize=7`, a `name` longer than 60 characters, a `branch` longer than 40 characters or `status=left`
- **THEN** the response is 400 problem details naming the field

#### Scenario: No token
- **WHEN** a client requests the endpoint without a token
- **THEN** the response is 401

### Requirement: Employee list row
Each row SHALL contain the employee's id, code (`EMP_NO`), name, father's name, date of birth (a date without time), current address (address lines 1 to 3 joined with ", ", empty lines left out), mobile, personal email and branch. The branch SHALL be the name (`COMP_NAME`) of the session company's branch whose code is the employee's `REC_BRANCH_CODE`, deleted or not, or that code when the company has no such branch. Text values SHALL be trimmed, and an empty value SHALL be empty.

#### Scenario: Row values
- **WHEN** an employee has address lines "House 1", "", "Area 3"
- **THEN** the row's address is "House 1, Area 3"

#### Scenario: Missing values
- **WHEN** an employee has no father's name, date of birth or email
- **THEN** those row values are empty and the request does not fail

#### Scenario: Branch name
- **WHEN** an employee's `REC_BRANCH_CODE` is "MBISF", the code of the company's branch "CARGOMAR PVT LTD (MUMBAI SEA)"
- **THEN** the row's branch is "CARGOMAR PVT LTD (MUMBAI SEA)"

#### Scenario: Unknown branch code
- **WHEN** an employee's `REC_BRANCH_CODE` is not the code of any branch of the company, or is empty
- **THEN** the row's branch is that code, or empty

### Requirement: Profile of a listed employee
The system SHALL expose `GET /api/admin/employees/{id}` returning that employee's profile, with the same content as the user's own profile (every field in full, state and country by name, `hasPhoto`). It SHALL also expose `GET /api/admin/employees/{id}/photo`, returning that employee's photo under the same rules as the own photo. Both SHALL answer 404 problem details when the id names no employee in scope. A relieved employee in scope SHALL open like a current one. For an admin the scope is every allowed branch, so every employee an admin can list opens, and no other.

#### Scenario: Listed employee
- **WHEN** a user requests the profile of an employee in the list
- **THEN** the response is 200 with that employee's full profile

#### Scenario: Relieved employee
- **WHEN** a user requests the profile or photo of a relieved employee of the session's branch
- **THEN** the response is the same as for a current employee: 200 with the profile, and the photo when there is one

#### Scenario: Admin opens another branch's employee
- **WHEN** an admin whose session branch is "Kochi" requests the profile or photo of an employee of "Chennai", a branch assigned to them
- **THEN** the response is 200 with that employee's profile, and the photo when there is one

#### Scenario: Employee outside the scope
- **WHEN** a user requests the profile or photo of an employee of another company or an unknown id, or of a branch that is not one of their allowed branches
- **THEN** the response is 404 problem details, and nothing of that employee is returned

#### Scenario: Photo of a listed employee
- **WHEN** a listed employee's image file is in the configured folder
- **THEN** the photo request answers 200 with the image and `Cache-Control: no-store`
