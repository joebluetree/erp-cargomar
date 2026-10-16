# Spec Delta

## MODIFIED Requirements

### Requirement: Session context on the backend
For an authenticated request, the backend SHALL make the logged-in user code, employee id (empty when the user has none), company id and code, branch id and year id available to services through one shared accessor, taken from the token and not from request parameters. This change SHALL NOT alter which data existing endpoints return.

#### Scenario: Context from the token
- **WHEN** a service handling an authenticated request asks for the current company, branch and year
- **THEN** it receives the values carried by the request's token

#### Scenario: Company List unchanged
- **WHEN** a logged-in user opens the Company List
- **THEN** it lists the same companies as before this change

#### Scenario: Employee id from the token
- **WHEN** a service handling a request of a user with employee id "E-1" asks for the current employee
- **THEN** it receives "E-1", and for a user without an employee id it receives an empty value
