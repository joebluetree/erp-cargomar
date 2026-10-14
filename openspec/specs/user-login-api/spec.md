# user-login-api Specification

## Purpose
Provides the backend login: it checks a user's name, password and company code against the existing user, company and financial-year tables and, on success, returns the user's session details and an access token for the rest of the API.

## Requirements

### Requirement: Login endpoint
The system SHALL expose `POST /api/admin/login`, which accepts a JSON body with `userCode`, `password` and `companyCode` and SHALL NOT require a token. The endpoint SHALL NOT change any data.

#### Scenario: Endpoint open without a token
- **WHEN** a client posts valid credentials without an `Authorization` header
- **THEN** the request is processed and is not rejected with 401 for lacking a token

#### Scenario: Other methods
- **WHEN** a client sends GET, PUT, PATCH or DELETE to the endpoint
- **THEN** the response is 405 and no data changes

### Requirement: Mandatory login fields
`userCode`, `password` and `companyCode` SHALL each be required and non-blank (BR-001.1). A request that misses any of them SHALL be answered with 400 problem details that name each missing field, and no credential check SHALL be made. Each field SHALL be limited to a maximum length that fits its column; a longer value SHALL be answered with 400.

#### Scenario: Missing fields
- **WHEN** a client posts a body with an empty `password` and no `companyCode`
- **THEN** the response is 400 and lists `password` and `companyCode` with a "required" message

#### Scenario: Value too long
- **WHEN** a client posts a `userCode` longer than the user code column allows (15 characters)
- **THEN** the response is 400 naming `userCode`

### Requirement: Credential check
A login SHALL succeed only when a not-deleted user exists whose code (`USERM.USER_CODE`) equals `userCode` and whose company code equals `companyCode` (both ignoring surrounding spaces and letter case), whose stored password equals `password` exactly, and when `companyCode` belongs to a not-deleted company (`COMP_TYPE` = 'C').

#### Scenario: Correct credentials
- **WHEN** a client posts the user code, password and company code of an existing user of an existing company
- **THEN** the response is 200 with the session details and a token

#### Scenario: Case and spaces in user code and company code
- **WHEN** a client posts " admin " as user code and "cmp01" for company code "CMP01", with the correct password
- **THEN** the login succeeds

#### Scenario: Password is exact
- **WHEN** a client posts the correct user code and company code with the password in different letter case
- **THEN** the login fails

#### Scenario: Wrong company for the user
- **WHEN** a client posts a correct user code and password with the code of a company the user does not belong to
- **THEN** the login fails

### Requirement: Generic failure response
A failed credential check SHALL be answered with 401 problem details carrying one fixed message, "Invalid user code, password or company code.", whatever value was wrong. The response SHALL NOT reveal whether the user, the company or the password was wrong. Each failure SHALL be logged without the password.

#### Scenario: Unknown user
- **WHEN** a client posts a user code that does not exist
- **THEN** the response is 401 with the fixed message

#### Scenario: Wrong password
- **WHEN** a client posts an existing user with a wrong password
- **THEN** the response is 401 with the same fixed message and the same shape as for an unknown user

#### Scenario: Unknown company
- **WHEN** a client posts a company code that is not a company
- **THEN** the response is 401 with the same fixed message

#### Scenario: Password never logged
- **WHEN** any login request is handled
- **THEN** no log entry contains the submitted password

### Requirement: Session details
A successful login SHALL return: the user's code and name; the company's id, code and name; the user's default branch (`USER_BRANCH_ID`) id and name; and the company's latest financial year (the `YEARM` row of the company with the latest start date) id, code and name. It SHALL also return the token and the time at which the token expires.

#### Scenario: Default branch
- **WHEN** a user whose default branch is "Kochi" logs in
- **THEN** the response's branch name is "Kochi"

#### Scenario: Latest financial year
- **WHEN** the company has years starting 2024-04-01 and 2025-04-01 and a user logs in
- **THEN** the response's year is the one starting 2025-04-01

### Requirement: Missing working context
When the credentials are correct but the user has no default branch that exists, or the company has no financial year, the login SHALL be refused with 403 problem details whose message names what is missing ("No default branch is set for this user." or "No financial year is set up for this company."), and no token SHALL be issued.

#### Scenario: No default branch
- **WHEN** a user with correct credentials has an empty or unknown default branch
- **THEN** the response is 403 with "No default branch is set for this user." and no token

#### Scenario: No financial year
- **WHEN** a user with correct credentials belongs to a company with no year rows
- **THEN** the response is 403 with "No financial year is set up for this company." and no token

### Requirement: Access token
The token SHALL be signed by the backend and SHALL carry the user code, user name, company id and code, branch id and year id. It SHALL expire after a configured lifetime (8 hours by default). The signing key SHALL come from configuration and SHALL NOT be stored in the repository.

#### Scenario: Token expires
- **WHEN** a token older than the configured lifetime is sent to a protected endpoint
- **THEN** the response is 401

#### Scenario: Tampered token
- **WHEN** a client changes the company in a token and sends it
- **THEN** the response is 401

#### Scenario: No signing key configured
- **WHEN** the API starts outside the Testing environment without a signing key
- **THEN** it fails to start with a message naming the missing setting

### Requirement: Legacy tables read only
The login SHALL only read the existing tables `USERM`, `YEARM` and `COMPANYM`. The application SHALL NOT create, alter or write to them, and applying the application's migrations SHALL leave them unchanged. The queries SHALL run on Oracle 10.2.

#### Scenario: Migrations leave tables alone
- **WHEN** the application's migrations are applied to a schema containing these tables
- **THEN** their structure and rows are unchanged
