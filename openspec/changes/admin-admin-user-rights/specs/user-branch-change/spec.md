# Spec Delta

## MODIFIED Requirements

### Requirement: Branches and years offered
The Branch list SHALL contain exactly the branches allotted to the logged-in user (`USERD`) that are not-deleted branches of the logged-in company, sorted by name. For the admin user (user code `ADMIN`, see `user-menu-api`) it SHALL instead contain every not-deleted branch of the logged-in company, allotted or not, sorted by name. The Year list SHALL contain every open financial year of the logged-in company (`YEAR_CLOSED` = 'N'), newest first; closed years SHALL NOT be offered. For the admin user the Year list SHALL instead contain every financial year of the logged-in company, open or closed, newest first. The lists SHALL come from the session, never from values the browser sends.

#### Scenario: Allotted branches only
- **WHEN** a user allotted the branches "Kochi" and "Mumbai" of their company opens the dialog
- **THEN** Branch offers "Kochi" and "Mumbai" and no other branch

#### Scenario: Open years of the company
- **WHEN** the logged-in company has the closed year "2023-2024" and the open years "2024-2025" and "2025-2026"
- **THEN** Year offers "2025-2026" then "2024-2025", and not "2023-2024"

#### Scenario: Lists cannot be loaded
- **WHEN** the lists cannot be loaded because the server fails or cannot be reached
- **THEN** the matching error notification is shown and the session is unchanged

#### Scenario: Admin user offered every branch of the company
- **WHEN** the admin user, allotted only "Kochi", opens the dialog and the company has the branches "Chennai", "Kochi" and "Mumbai" and a deleted branch "Delhi"
- **THEN** Branch offers "Chennai", "Kochi" and "Mumbai", by name, and not "Delhi" or any branch of another company

#### Scenario: Admin user offered every year of the company
- **WHEN** the admin user opens the dialog and the logged-in company has the closed year "2023-2024" and the open years "2024-2025" and "2025-2026"
- **THEN** Year offers "2025-2026", "2024-2025" then "2023-2024", and no year of another company

### Requirement: Backend checks the switch
The backend SHALL accept a switch only for a branch allotted to the logged-in user that is a not-deleted branch of the session's company, and an open year (`YEAR_CLOSED` = 'N') of the session's company. For the admin user any not-deleted branch of the session's company SHALL be accepted, allotted or not, and any year of the session's company, open or closed. Any other branch or year SHALL be refused with 403 problem details and the session SHALL stay as it was. Missing values SHALL be refused with 400. No data SHALL be written.

#### Scenario: Branch not allotted
- **WHEN** a client asks to switch to a branch that is not allotted to the user
- **THEN** the response is 403 "This branch is not available to you." and no new token is issued

#### Scenario: Year of another company
- **WHEN** a client asks to switch to a year of another company
- **THEN** the response is 403 "This financial year is not available for your company."

#### Scenario: Closed year
- **WHEN** a client asks to switch to a closed year of the session's company
- **THEN** the response is 403 "This financial year is not available for your company." and no new token is issued

#### Scenario: Refusal shown
- **WHEN** the backend refuses the switch with 403
- **THEN** the dialog stays open with its values and shows the message as a warning notification

#### Scenario: Admin user switches to a branch not allotted
- **WHEN** the admin user, allotted only "Kochi", asks to switch to "Mumbai", a branch of the session's company
- **THEN** the switch is accepted and the new session's branch is "Mumbai"

#### Scenario: Admin user refused another company's or a deleted branch
- **WHEN** the admin user asks to switch to a branch of another company, a deleted branch, or an unknown id
- **THEN** the response is 403 "This branch is not available to you." and no new token is issued

#### Scenario: Admin user switches to a closed year
- **WHEN** the admin user asks to switch to the closed year "2023-2024" of the session's company
- **THEN** the switch is accepted and the new session's year is "2023-2024"

#### Scenario: Admin user refused another company's year
- **WHEN** the admin user asks to switch to a year of another company or an unknown year id
- **THEN** the response is 403 "This financial year is not available for your company." and no new token is issued

### Requirement: Mandatory branch and year
Branch and Year SHALL both be required (BR-001.1). Select with either field empty SHALL show "Branch is required." or "Year is required." under that field and SHALL NOT change the session.

#### Scenario: Current year closed
- **WHEN** the session's year has been closed since login, and a user other than the admin user opens the dialog and activates Select without picking a year
- **THEN** Year starts empty, "Year is required." is shown under Year and nothing is sent

#### Scenario: Admin user's current year closed
- **WHEN** the session's year has been closed since login and the admin user opens the dialog
- **THEN** Year shows the session's year, as it is among the offered years
