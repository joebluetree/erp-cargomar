# Spec Delta

## MODIFIED Requirements

### Requirement: Navigation menu
The sidebar SHALL list Dashboard first, then the user's menu from the backend (`user-menu-api`). Each module SHALL appear as a heading with its name, followed by its menu entries. Each entry SHALL have a label (the menu name), an icon and a destination (the menu's route with its `menuId`). The menu SHALL vary by the user's rights in the session branch, and SHALL be loaded again after login and after a branch switch. The entry matching the current page SHALL be visibly highlighted, and choosing an entry SHALL navigate to its destination. While the menu loads, or when it cannot be loaded, only Dashboard SHALL be listed.

#### Scenario: Initial entries
- **WHEN** the menu is displayed
- **THEN** it lists Dashboard with an icon first

#### Scenario: Modules and entries
- **WHEN** the user's menu is module "Hr" with "Company List" and "Profile"
- **THEN** the sidebar shows Dashboard, the heading "Hr", then "Company List" and "Profile", each with an icon

#### Scenario: No rights
- **WHEN** the user's menu is empty
- **THEN** the sidebar lists only Dashboard

#### Scenario: Navigate
- **WHEN** the user chooses an entry
- **THEN** its destination is shown in the content area

#### Scenario: Highlight current entry
- **WHEN** the user is on a page beneath an entry's destination
- **THEN** that entry is highlighted and Dashboard is not

#### Scenario: Dashboard highlight is exact
- **WHEN** the user is on any page other than the application root
- **THEN** the Dashboard entry is not highlighted

#### Scenario: Branch switched
- **WHEN** the user switches the branch
- **THEN** the sidebar shows the menu of the new branch

#### Scenario: Adding an entry
- **WHEN** a menu is marked for the new software in `MENUM` with a route of the application, and a user is given rights on it
- **THEN** the entry appears in that user's menu without changes to the shell
