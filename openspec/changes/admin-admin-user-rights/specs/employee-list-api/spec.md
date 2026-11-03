# Spec Delta

## ADDED Requirements

### Requirement: Admin user's allowed branches
For the admin user (user code `ADMIN`, see `user-menu-api`) the allowed branches of the Employee List SHALL be every not-deleted branch of the session company (`COMPANYM` rows of type 'B' under the company), whether allotted to the user (`USERD`) or not. This applies to the branch options and to the `branch` values the list accepts: `all` means every branch of the company. Every other user's allowed branches SHALL stay as they are.

#### Scenario: Admin user's branch options
- **WHEN** the admin user, allotted only "Kochi", requests the branch options and the company has the branches "Chennai", "Kochi" and "Mumbai" and a deleted branch "Delhi"
- **THEN** the response is 200 with Chennai, Kochi and Mumbai, by name, and not Delhi or any branch of another company

#### Scenario: Admin user lists a branch not allotted
- **WHEN** that admin user requests `branch=<id of Mumbai>`
- **THEN** only the employees of Mumbai are returned

#### Scenario: Admin user lists all branches
- **WHEN** that admin user requests `branch=all`
- **THEN** the employees of every branch of the company are returned, and none of another company

#### Scenario: Admin user refused another company's branch
- **WHEN** the admin user requests the id of another company's branch, a deleted branch or an unknown id
- **THEN** the response is 403 problem details
