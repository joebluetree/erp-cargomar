# employee-list-api Specification

## Purpose
Provides the read-only backend of the Employee List: a filtered, paged list of the employees of the session's company and branch who are not relieved, and the profile and photo of any employee in that list.

## Requirements

### Requirement: Employees in scope
Every employee endpoint of this capability SHALL consider only the employees in scope: `EMPM` rows whose company code (`REC_COMPANY_CODE`) is the session's company code, whose branch code (`REC_BRANCH_CODE`) is the code (`COMPANYM.COMP_CODE`) of the session's branch, and whose `EMP_IS_RELIEVED` is 'N'. The company and branch SHALL come from the access token, never from the request.

#### Scenario: Other branch left out
- **WHEN** the session's branch is "Kochi" and an employee belongs to branch "Chennai" of the same company
- **THEN** that employee is not listed and their profile answers 404

#### Scenario: Relieved left out
- **WHEN** an employee of the session's branch has `EMP_IS_RELIEVED` 'Y'
- **THEN** that employee is not listed and their profile answers 404

#### Scenario: Branch switched
- **WHEN** the user switches the session to another branch
- **THEN** the list shows the employees of the new branch

### Requirement: Employee list endpoint
The system SHALL expose a read-only `GET /api/admin/employees` that returns one page of the employees in scope, following the common paging request and response of `server-side-tables`. It accepts optional `code` and `name` filters (case-insensitive "contains" on `EMP_NO` and `EMP_NAME`, combined, with `%` and `_` as ordinary characters, at most 60 characters), a one-based `page` (default 1) and a `pageSize` (default 10; 2, 5, 10, 25, 50 or 100). Rows SHALL be ordered by name, then id.

#### Scenario: First page
- **WHEN** 23 employees are in scope and a client requests the endpoint without parameters
- **THEN** the response is 200 with the first 10 employees ordered by name, `total` 23, `page` 1 and `pageSize` 10

#### Scenario: Filter by code and name
- **WHEN** a client requests `code=10&name=kum`
- **THEN** only employees whose code contains "10" and whose name contains "kum", in any letter case, are returned, and `total` counts only them

#### Scenario: Filter characters are plain text
- **WHEN** a client requests `name=a_b`
- **THEN** the underscore is matched literally

#### Scenario: Invalid paging values
- **WHEN** a client requests `page=0`, `pageSize=7` or a `name` longer than 60 characters
- **THEN** the response is 400 problem details naming the field

#### Scenario: No token
- **WHEN** a client requests the endpoint without a token
- **THEN** the response is 401

### Requirement: Employee list row
Each row SHALL contain the employee's id, code (`EMP_NO`), name, father's name, date of birth (a date without time), current address (address lines 1 to 3 joined with ", ", empty lines left out), mobile and personal email. Text values SHALL be trimmed, and an empty value SHALL be empty.

#### Scenario: Row values
- **WHEN** an employee has address lines "House 1", "", "Area 3"
- **THEN** the row's address is "House 1, Area 3"

#### Scenario: Missing values
- **WHEN** an employee has no father's name, date of birth or email
- **THEN** those row values are empty and the request does not fail

### Requirement: Profile of a listed employee
The system SHALL expose `GET /api/admin/employees/{id}` returning that employee's profile, with the same content as the user's own profile (every field in full, state and country by name, `hasPhoto`). It SHALL also expose `GET /api/admin/employees/{id}/photo`, returning that employee's photo under the same rules as the own photo. Both SHALL answer 404 problem details when the id names no employee in scope.

#### Scenario: Listed employee
- **WHEN** a user requests the profile of an employee in the list
- **THEN** the response is 200 with that employee's full profile

#### Scenario: Employee outside the scope
- **WHEN** a user requests the profile or photo of an employee of another branch, a relieved employee, or an unknown id
- **THEN** the response is 404 problem details, and nothing of that employee is returned

#### Scenario: Photo of a listed employee
- **WHEN** a listed employee's image file is in the configured folder
- **THEN** the photo request answers 200 with the image and `Cache-Control: no-store`
