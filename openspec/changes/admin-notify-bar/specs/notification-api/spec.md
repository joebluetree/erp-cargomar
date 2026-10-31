# Spec Delta

## Purpose

Provides the read-only backend endpoint behind the notification bar: it returns the latest announcement stored in the legacy `GENINFO` table.

## ADDED Requirements

### Requirement: Latest notification endpoint
The system SHALL expose `GET /api/admin/notification`. It needs a valid token but no menu right, and it accepts no parameters. On success it SHALL answer 200 with the latest notification's id, banner (`BANNER`), heading, content and created date and time. Each text SHALL be returned exactly as entered, with its spaces and line breaks; nothing SHALL be trimmed. An empty text SHALL have no value.

#### Scenario: Latest notification returned
- **WHEN** a logged-in user requests the notification, and the latest `GENINFO` row has id 7, banner "Office closed on Friday", heading "Maintenance", content "The office is closed on Friday for maintenance." and created date 2026-10-28 10:15
- **THEN** the response is 200 with id 7, that banner, that heading, that content and the created date and time 2026-10-28 10:15

#### Scenario: Exact text
- **WHEN** the content is "  The office is closed.\n\n   Please plan  " (spaces at both ends, a blank line, and an indented line)
- **THEN** the response's content is exactly that text, with every space and line break

#### Scenario: No token
- **WHEN** the request has no valid token
- **THEN** the response is 401

#### Scenario: No menu right needed
- **WHEN** a logged-in user without any menu rights requests the notification
- **THEN** the response is 200 with the latest notification

### Requirement: Which notification is the latest
The latest notification SHALL be chosen from the `GENINFO` rows that are visible (`VISIBLE` = 'Y', in either case; 'N', another value or no value hides a row) and whose banner or heading is not empty (a text of only spaces or line breaks counts as empty):
- the newest `REC_CREATED_DATE` comes first, and a row without a date comes after every dated row;
- among rows with the same date, the highest `ID` comes first, and a row without an id comes last.

`GENINFO` has no company or branch, so every user SHALL get the same notification whatever their company, branch or year.

#### Scenario: Newest date wins
- **WHEN** row 3 was created on 2026-10-28 and row 9 on 2026-10-20
- **THEN** row 3 is returned

#### Scenario: Same date, highest id
- **WHEN** rows 4 and 5 have the same created date and time, and no row is newer
- **THEN** row 5 is returned

#### Scenario: Row without banner and heading skipped
- **WHEN** the newest row's banner and heading are both empty or only spaces, and an older row has a heading
- **THEN** the older row is returned

#### Scenario: Hidden row skipped
- **WHEN** the newest row has `VISIBLE` 'N' and an older row has 'Y'
- **THEN** the older row is returned

#### Scenario: Every row hidden
- **WHEN** every row has `VISIBLE` 'N'
- **THEN** there is no notification, and the response is 404

#### Scenario: Banner alone is enough
- **WHEN** the newest row has a banner but no heading
- **THEN** that row is returned

#### Scenario: Same for every branch
- **WHEN** users of two different branches request the notification
- **THEN** both get the same notification

### Requirement: No notification
When `GENINFO` has no visible row with a banner or a heading, the system SHALL answer 404 with the message "Notification not found.".

#### Scenario: Empty table
- **WHEN** `GENINFO` has no rows
- **THEN** the response is 404 with the message "Notification not found."

### Requirement: Notifications are read only
The system SHALL only read `GENINFO`. It SHALL never insert, update or delete its rows, and it SHALL never create, alter or drop the table.

#### Scenario: Only reads
- **WHEN** the notification is requested any number of times
- **THEN** `GENINFO` is unchanged
