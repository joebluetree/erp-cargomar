# Spec Delta

## Purpose

Provides the screen-level use of the user's rights: every menu link carries its menu code, opening a screen loads the user's rights on that menu, and a screen without the view right shows a "no access" state instead of its content.

## ADDED Requirements

### Requirement: Menu code in the URL
Every menu link (sidebar and Dashboard quick links) SHALL open its route with the menu's code (`MENU_CODE`) as the URL parameter `menuId`. Each screen route SHALL belong to one menu: a menu's own route to that menu, a branch's holidays (`/reports/branches/<id>/holidays`) to the Holiday List (`NS-HOLIDAYLIST`), and an employee's profile (`/admin/employees/<id>`) to the Profile (`NS-EMPPROFILE`). A link inside a screen SHALL set `menuId` to the code of the menu of the screen it opens. Back SHALL return to the previous URL with its own code; when there is no previous page, Back's fallback SHALL set the code of the screen it opens.

#### Scenario: Menu link
- **WHEN** the user chooses "Employee List" in the sidebar
- **THEN** the URL is `/admin/employees?menuId=NS-EMPLIST`

#### Scenario: Profile from the Employee List
- **WHEN** the user opens an employee's profile from the Employee List
- **THEN** the URL is `/admin/employees/<id>?menuId=NS-EMPPROFILE`

#### Scenario: Branch's holidays
- **WHEN** the user opens a branch's holidays from the Branch List
- **THEN** the URL is `/reports/branches/<id>/holidays?menuId=NS-HOLIDAYLIST`

#### Scenario: Back
- **WHEN** the user presses Back on an employee's profile opened from the Employee List
- **THEN** the URL is `/admin/employees?menuId=NS-EMPLIST` again, with the list as it was left

### Requirement: Rights loaded when a screen opens
When a screen of a menu opens, the application SHALL load from the backend, in one request, the user's rights on the screen's menu and on its related menus (the menus of the screens it links to). The relations SHALL be: the Employee List is related to the Profile (`NS-EMPPROFILE`), and the Branch List to the Holiday List (`NS-HOLIDAYLIST`); the other screens have none. The rights SHALL be requested again each time the screen opens, so a right changed in the existing software applies on the next opening without a new login. When `menuId` is in the URL it SHALL be the code of the screen's menu; without `menuId` (a typed or old URL), the screen's menu SHALL be used.

The rights SHALL be available to the screen for its later actions. The current screens are view only and use only the view right.

#### Scenario: Opened from the menu
- **WHEN** a screen opens with the code of its menu in `menuId`
- **THEN** the rights of that menu are requested

#### Scenario: Related menu with the screen
- **WHEN** the Employee List opens
- **THEN** one request asks for the rights on `NS-EMPLIST` and `NS-EMPPROFILE`

#### Scenario: Related menu of the Branch List
- **WHEN** the Branch List opens
- **THEN** one request asks for the rights on `NS-BRANCHLIST` and `NS-HOLIDAYLIST`

#### Scenario: Typed URL
- **WHEN** the user types `/reports/companies` without `menuId` and has the view right on the Company List
- **THEN** the screen opens with the rights of that menu

### Requirement: No access without the view right
A screen SHALL show only the message "You do not have access to this screen." (and the shell around it) instead of its content when one of these holds:
- the user's view right on the screen's menu, from the request made when it opens, is false (also when the menu is not the user's);
- `menuId` names another menu than the screen's;
- the rights cannot be loaded.

The screen SHALL then send none of its own data requests. The menu entries of the screens' own specs (Company List, Branch List, Profile, Employee List, Holiday List) SHALL appear only for users with the view right on them.

#### Scenario: No view right
- **WHEN** the user opens `/admin/holidays?menuId=NS-HOLIDAYLIST` and their view right on it is false
- **THEN** the page says "You do not have access to this screen." and no holiday request is sent

#### Scenario: Not in the menu
- **WHEN** the user types `/admin/employees` and has no view right on the Employee List
- **THEN** the page says "You do not have access to this screen."

#### Scenario: Another menu's code
- **WHEN** the user opens `/admin/employees?menuId=NS-COMPLIST`
- **THEN** the page says "You do not have access to this screen."

#### Scenario: Profile without the Profile right
- **WHEN** a user with the Employee List but without the view right on the Profile opens `/admin/employees/<id>?menuId=NS-EMPPROFILE`
- **THEN** the page says "You do not have access to this screen." and no profile request is sent

#### Scenario: Branch's holidays without the Holiday List right
- **WHEN** a user with the Branch List but without the view right on the Holiday List opens `/reports/branches/<id>/holidays?menuId=NS-HOLIDAYLIST`
- **THEN** the page says "You do not have access to this screen." and no holiday request is sent

#### Scenario: Dashboard always open
- **WHEN** a user without any menu rights logs in
- **THEN** the Dashboard is shown, with no quick links

### Requirement: Profile link needs the Profile right
In the Employee List, the Employee No SHALL open the employee's profile (as a link, and by a click anywhere in its cell, with the hand cursor) only when the Profile's view right, loaded when the Employee List opened, is true. Otherwise the Employee No SHALL be shown as plain text, without the hand cursor, and a click on it SHALL do nothing. The rest of the list SHALL be unchanged.

#### Scenario: With the Profile right
- **WHEN** the user has the view right on the Employee List and the Profile
- **THEN** each Employee No is a link to `/admin/employees/<id>?menuId=NS-EMPPROFILE`

#### Scenario: Without the Profile right
- **WHEN** the user has the view right on the Employee List but not on the Profile
- **THEN** each Employee No is plain text, and clicking its cell opens nothing

#### Scenario: Right given while logged in
- **WHEN** the Profile's view right is set to 'Y' in the existing software while the user is logged in, and the user opens the Employee List again
- **THEN** each Employee No is a link, without a new login

### Requirement: Holiday List column needs the Holiday List right
In the Branch List, the "Holiday List" column, with its button that opens a branch's holidays, SHALL be shown only when the Holiday List's view right, loaded when the Branch List opened, is true. Otherwise the column SHALL not be shown at all, and the table SHALL have its other columns only. The rest of the list SHALL be unchanged.

#### Scenario: With the Holiday List right
- **WHEN** the user has the view right on the Branch List and the Holiday List
- **THEN** the table has the "Holiday List" column, and its button opens `/reports/branches/<id>/holidays?menuId=NS-HOLIDAYLIST`

#### Scenario: Without the Holiday List right
- **WHEN** the user has the view right on the Branch List but not on the Holiday List
- **THEN** the table has no "Holiday List" column

#### Scenario: Right given while logged in
- **WHEN** the Holiday List's view right is set to 'Y' in the existing software while the user is logged in, and the user opens the Branch List again
- **THEN** the "Holiday List" column is shown, without a new login
