# Spec Delta

## MODIFIED Requirements

### Requirement: User notifications
The application SHALL show transient notifications for success, information, warning and error outcomes in a consistent place and style, through one notification service that features use. That place SHALL be the top right corner of the window, on every screen, including the login screen.

#### Scenario: Success notification
- **WHEN** a feature reports a successful action through the notification service
- **THEN** a success notification with that message is shown

#### Scenario: Notification kinds
- **WHEN** a feature reports an information, warning or error outcome
- **THEN** a notification of that kind is shown in the same place and style

#### Scenario: Notifications dismiss
- **WHEN** a notification has been visible for a few seconds
- **THEN** it disappears, and the user can also close it earlier

#### Scenario: Top right
- **WHEN** any notification is shown, on any screen
- **THEN** it appears in the top right corner of the window
