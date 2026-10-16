# Spec Delta

## MODIFIED Requirements

### Requirement: Select switches the session
Select SHALL send the chosen branch and year to the backend. On success the session SHALL keep its user, employee id, company and expiry time, take the new branch and year, and the header SHALL show the new branch and year at once. The dialog SHALL close and the current page SHALL stay open, without a notification: the updated header is the confirmation. The change SHALL last for the browser tab, including reloads, until logout.

#### Scenario: Switch
- **WHEN** a user in "Kochi" / "2025-2026" selects "Mumbai" and "2024-2025"
- **THEN** the dialog closes, the header shows "Mumbai" and "2024-2025", the same page stays open, later API requests carry the new branch and year, and no notification is shown

#### Scenario: Reload keeps the switch
- **WHEN** the user reloads the page after switching
- **THEN** the header still shows the switched branch and year

#### Scenario: Busy
- **WHEN** Select has been activated and the answer has not arrived
- **THEN** Select is disabled and shows progress, and the request is sent only once

#### Scenario: Default branch unchanged
- **WHEN** the user switches the branch, logs out and logs in again
- **THEN** the session starts in the user's default branch and the latest year, as before

#### Scenario: Employee id kept
- **WHEN** a user with employee id "E-1" switches branch and year
- **THEN** the new session still carries employee id "E-1"
