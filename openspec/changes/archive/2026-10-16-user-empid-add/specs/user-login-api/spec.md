# Spec Delta

## MODIFIED Requirements

### Requirement: Session details
A successful login SHALL return: the user's code and name; the company's id, code and name; the user's default branch (`USER_BRANCH_ID`) id and name; the company's latest financial year (the `YEARM` row of the company with the latest start date) id, code and name; and the user's employee id (`USER_EMP_ID`, without surrounding spaces), or an empty value when the user has none. A user without an employee id SHALL still be able to log in. It SHALL also return the token and the time at which the token expires.

#### Scenario: Default branch
- **WHEN** a user whose default branch is "Kochi" logs in
- **THEN** the response's branch name is "Kochi"

#### Scenario: Latest financial year
- **WHEN** the company has years starting 2024-04-01 and 2025-04-01 and a user logs in
- **THEN** the response's year is the one starting 2025-04-01

#### Scenario: Employee id
- **WHEN** a user whose `USER_EMP_ID` is "E-1" logs in
- **THEN** the response's employee id is "E-1"

#### Scenario: No employee id
- **WHEN** a user whose `USER_EMP_ID` is empty logs in with valid credentials
- **THEN** the login succeeds and the response's employee id is empty

### Requirement: Access token
The token SHALL be signed by the backend and SHALL carry the user code, user name, company id and code, branch id and year id, and the employee id when the user has one. It SHALL expire after a configured lifetime (8 hours by default). The signing key SHALL come from configuration and SHALL NOT be stored in the repository.

#### Scenario: Token expires
- **WHEN** a token older than the configured lifetime is sent to a protected endpoint
- **THEN** the response is 401

#### Scenario: Tampered token
- **WHEN** a client changes the company in a token and sends it
- **THEN** the response is 401

#### Scenario: No signing key configured
- **WHEN** the API starts outside the Testing environment without a signing key
- **THEN** it fails to start with a message naming the missing setting

#### Scenario: Employee id in the token
- **WHEN** a user with employee id "E-1" logs in
- **THEN** the token carries "E-1" as the employee id, and a token of a user without one carries no employee id
