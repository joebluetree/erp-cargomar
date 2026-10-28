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

## MODIFIED Requirements

### Requirement: Employees in scope
Every employee endpoint of this capability SHALL consider only the employees in scope: `EMPM` rows whose company code (`REC_COMPANY_CODE`) is the session's company code and whose branch code (`REC_BRANCH_CODE`) is the code (`COMPANYM.COMP_CODE`) of the session's branch, whether or not they are relieved. The company and branch SHALL come from the access token, never from the request.

#### Scenario: Other branch left out
- **WHEN** the session's branch is "Kochi" and an employee belongs to branch "Chennai" of the same company
- **THEN** that employee is not listed and their profile answers 404

#### Scenario: Relieved left out
- **WHEN** an employee of the session's branch has `EMP_IS_RELIEVED` 'Y' and the list is requested without `status` (Active)
- **THEN** that employee is not listed

#### Scenario: Relieved in scope
- **WHEN** an employee of the session's branch has `EMP_IS_RELIEVED` 'Y'
- **THEN** that employee is listed with `status=relieved` or `status=all`, and their profile answers 200

#### Scenario: Branch switched
- **WHEN** the user switches the session to another branch
- **THEN** the list shows the employees of the new branch

### Requirement: Employee list endpoint
The system SHALL expose a read-only `GET /api/admin/employees` that returns one page of the employees in scope, following the common paging request and response of `server-side-tables`. It accepts:
- optional `code` and `name` filters: case-insensitive "contains" on `EMP_NO` and `EMP_NAME`, combined, with `%` and `_` as ordinary characters, at most 60 characters;
- an optional `status` (see Employee status filter);
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
- **WHEN** a client requests `page=0`, `pageSize=7`, a `name` longer than 60 characters or `status=left`
- **THEN** the response is 400 problem details naming the field

#### Scenario: No token
- **WHEN** a client requests the endpoint without a token
- **THEN** the response is 401

### Requirement: Profile of a listed employee
The system SHALL expose `GET /api/admin/employees/{id}` returning that employee's profile, with the same content as the user's own profile (every field in full, state and country by name, `hasPhoto`). It SHALL also expose `GET /api/admin/employees/{id}/photo`, returning that employee's photo under the same rules as the own photo. Both SHALL answer 404 problem details when the id names no employee in scope. A relieved employee in scope SHALL open like a current one.

#### Scenario: Listed employee
- **WHEN** a user requests the profile of an employee in the list
- **THEN** the response is 200 with that employee's full profile

#### Scenario: Relieved employee
- **WHEN** a user requests the profile or photo of a relieved employee of the session's branch
- **THEN** the response is the same as for a current employee: 200 with the profile, and the photo when there is one

#### Scenario: Employee outside the scope
- **WHEN** a user requests the profile or photo of an employee of another branch or company, or an unknown id
- **THEN** the response is 404 problem details, and nothing of that employee is returned

#### Scenario: Photo of a listed employee
- **WHEN** a listed employee's image file is in the configured folder
- **THEN** the photo request answers 200 with the image and `Cache-Control: no-store`
