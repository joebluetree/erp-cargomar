# Spec Delta

## ADDED Requirements

### Requirement: Notification bar in the layout
When there is a notification (`notification-bar`), the layout SHALL show the notification bar above the header, across the full width of the window, so the header, sidebar and content area move down by the bar's height. Without a notification the layout SHALL be as before, with the header at the top. The login screen SHALL NOT show the bar.

#### Scenario: Bar above the header
- **WHEN** a logged-in user opens any screen inside the shell and there is a notification
- **THEN** the bar is the top line of the window, the header is right below it, and the sidebar and content area below the header

#### Scenario: No notification
- **WHEN** there is no notification
- **THEN** the header is the top line of the window, as before

#### Scenario: Narrow screen
- **WHEN** the window is narrower than 768 pixels and there is a notification
- **THEN** the bar is above the header across the full width, and the menu overlay opens as before
