# frontend-error-handling Specification

## Purpose
Defines how the frontend tells users what happened and how it responds to failed backend calls, in one consistent way for all features.

## Requirements

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

### Requirement: Central handling of HTTP errors
Failed backend calls SHALL be handled in one central place that turns them into user-friendly messages, without exposing technical details.

#### Scenario: Server error
- **WHEN** the backend responds with a 5xx status
- **THEN** an error notification says that something went wrong and to try again, and no status text, stack or internal message is shown

#### Scenario: Not found
- **WHEN** the backend responds with 404
- **THEN** an error notification says the item could not be found

#### Scenario: Network failure
- **WHEN** the request cannot reach the backend
- **THEN** an error notification says the server could not be reached

#### Scenario: Handled once
- **WHEN** a request fails
- **THEN** the user sees one notification for it, not one from the central handler and another from the feature

### Requirement: Backend validation errors
A 400 response that lists field errors SHALL be passed to the caller, keyed by field name, so a form can show each message next to its field, instead of raising a generic error notification.

#### Scenario: Field errors reach the caller
- **WHEN** the backend returns a 400 with an error for the `Title` field
- **THEN** the caller receives that message under the field name `title`, and no generic error notification is shown

#### Scenario: Bad request without field errors
- **WHEN** the backend returns a 400 that has no field errors
- **THEN** the error is reported through the central handling like any other error

### Requirement: No external monitoring
The frontend SHALL NOT require any external error-monitoring service.

#### Scenario: Offline development
- **WHEN** the application runs without internet access to third-party services
- **THEN** error handling works unchanged
