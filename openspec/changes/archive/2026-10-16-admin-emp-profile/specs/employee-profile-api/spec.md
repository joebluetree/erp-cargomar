# Spec Delta

## Purpose

Provides the read-only backend endpoint behind the Profile screen: it returns the logged-in user's own employee details from the existing `EMPM` table, found by the employee id of the session.

## ADDED Requirements

### Requirement: Own profile endpoint
The system SHALL expose a read-only `GET /api/admin/profile` endpoint that returns the employee profile of the logged-in user. The employee SHALL be the one named by the session's employee id (`USERM.USER_EMP_ID`, carried by the token). The endpoint SHALL accept no employee id, query parameter or body, and SHALL NOT change any data.

#### Scenario: Own profile
- **WHEN** a user whose employee id is "E-1" requests `GET /api/admin/profile`
- **THEN** the response is 200 with the profile of employee "E-1"

#### Scenario: No way to read another employee
- **WHEN** a user whose employee id is "E-1" requests `GET /api/admin/profile?id=E-2`
- **THEN** the response is still the profile of employee "E-1"

#### Scenario: No token
- **WHEN** a client requests the endpoint without a token
- **THEN** the response is 401 problem details and no employee data is read

### Requirement: Profile fields
The profile SHALL contain the employee's code (`EMP_NO`) and name; father's name, spouse's name and marital status; bank account number, bank name, bank branch and IFSC code; date of birth (a date without time); the current and the permanent address (address lines 1 to 3, city, state, PIN code, P.O. box and country); mobile and personal email; and Aadhaar, PAN, PF, ESI and UAN numbers; and whether a photo is available (`hasPhoto`, see "Own photo"). Text values SHALL be returned without surrounding spaces, and ID numbers in full.

#### Scenario: All fields
- **WHEN** the employee has a value for every field
- **THEN** each one is returned, with the date of birth as a date such as `1990-03-05`

#### Scenario: Empty fields
- **WHEN** the employee has no spouse name, no bank details and no date of birth
- **THEN** those fields are returned empty and the request does not fail

#### Scenario: Surrounding spaces
- **WHEN** the employee's name is stored as " Asha Nair "
- **THEN** the name is returned as "Asha Nair"

### Requirement: State and country by name
The state and country of each address SHALL be returned as their names, taken from the parameter table (`PARAM`, of type `STATE` and `COUNTRY`), and never as internal ids. A state or country that is not set, or whose id names no parameter, SHALL be returned empty.

#### Scenario: Names
- **WHEN** the employee's current state id names the parameter "KERALA" and the country id names "INDIA"
- **THEN** the current address's state is "KERALA" and its country is "INDIA"

#### Scenario: Unknown id
- **WHEN** the permanent state id names no parameter of type `STATE`
- **THEN** the permanent address's state is empty and the request does not fail

### Requirement: No employee profile
A logged-in user without an employee id, or whose employee id names no employee, SHALL receive 404 problem details whose title says that no employee profile is linked to the user. A session started before the token carried the employee id SHALL be treated as having none.

#### Scenario: User without an employee
- **WHEN** a user whose `USER_EMP_ID` is empty requests the profile
- **THEN** the response is 404 problem details saying no employee profile is linked

#### Scenario: Employee missing
- **WHEN** a user's employee id names no `EMPM` row
- **THEN** the response is 404 problem details saying no employee profile is linked

#### Scenario: Older token
- **WHEN** a valid token without an employee id is sent
- **THEN** the response is 404 problem details, not 401

### Requirement: Own photo
The system SHALL expose `GET /api/admin/profile/photo`, returning the logged-in user's own employee photo: the file named by `EMP_IMAGE_NAME` in the folder set in configuration (`EmployeeImages:Folder`, `D:\erp-cargomar\images\` by default). It SHALL accept no id or file name from the request, use only the bare file name (never leaving the folder), and serve only `.jpg`, `.jpeg` and `.png` files with their image type. In every other case it SHALL answer 404.

#### Scenario: Photo
- **WHEN** the user's employee has the image name "1590.jpg" and that file is in the configured folder
- **THEN** the response is 200 with content type `image/jpeg` and the file's bytes, and the profile's `hasPhoto` is true

#### Scenario: No image name
- **WHEN** the employee has no image name
- **THEN** the photo request answers 404 and the profile's `hasPhoto` is false

#### Scenario: File missing
- **WHEN** the image name names no file in the folder
- **THEN** the photo request answers 404 and the profile's `hasPhoto` is false

#### Scenario: Path in the name
- **WHEN** the stored image name is "..\secret.jpg"
- **THEN** only "secret.jpg" inside the configured folder is looked for, and no file outside the folder is ever read

#### Scenario: Other file type
- **WHEN** the image name is "notes.txt" and that file exists
- **THEN** the photo request answers 404

#### Scenario: Folder changed in configuration
- **WHEN** `EmployeeImages:Folder` is changed to another folder
- **THEN** photos are read from that folder, with no code change

#### Scenario: No token
- **WHEN** a client requests the photo without a token
- **THEN** the response is 401 and no file is read
