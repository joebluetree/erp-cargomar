# app-dashboard Specification

## Purpose
Defines the Dashboard, the landing page that welcomes the user and links to the available features.

## Requirements

### Requirement: Dashboard landing page
The Dashboard SHALL be the page shown at the application root. It SHALL show a heading and a short welcome text.

#### Scenario: Landing page content
- **WHEN** the user opens the application root
- **THEN** the Dashboard is shown with its heading and welcome text

### Requirement: Quick links
The Dashboard SHALL show quick links to the user's menu entries, built from the same menu as the sidebar and excluding the Dashboard itself. They SHALL be grouped under module headings in the same order, and each SHALL carry its `menuId`. While the user has no menu entries, the quick-links section SHALL NOT be shown.

#### Scenario: No features yet
- **WHEN** the user's menu has no entries
- **THEN** the Dashboard shows no quick-links section

#### Scenario: Grouped by module
- **WHEN** the user's menu is module "Hr" with "Company List" and "Profile"
- **THEN** the Dashboard shows the heading "Hr" with quick links to "Company List" and "Profile"

#### Scenario: New module link
- **WHEN** a menu is added to the user's menu
- **THEN** the Dashboard shows a quick link for it without further changes

#### Scenario: Link navigates
- **WHEN** the user chooses a quick link
- **THEN** the linked page is shown inside the shell, with its `menuId`

### Requirement: Dashboard content limits
The Dashboard SHALL NOT show charts, recent-activity lists or counts, and SHALL NOT send any request to the backend.

#### Scenario: No backend calls
- **WHEN** the Dashboard is displayed
- **THEN** no request is sent to the backend
