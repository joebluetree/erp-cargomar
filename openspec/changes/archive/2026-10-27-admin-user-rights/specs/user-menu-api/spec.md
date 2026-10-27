# Spec Delta

## Purpose

Provides the backend of the rights-based menu: the logged-in user's menu grouped by module, the user's rights on one menu, and the view-right check that guards the screens' endpoints.

## ADDED Requirements

### Requirement: User menu endpoint
The system SHALL expose `GET /api/admin/menu`, which needs a valid token and takes no parameters. It SHALL return the session company's modules (`MODULEM`), each with its menus (`MENUM`) that pass all of these:
- the menu is of the session company (`REC_COMPANY_CODE`);
- it is marked for the new software (`MENU_NEWSOFTWARE` = 'Y');
- the logged-in user has a rights row on it for the session branch (`USERRIGHTS`: user, branch, menu) with the view right (`RIGHTS_VIEW` = 'Y').

Only these columns SHALL decide which menus are shown:
- `MENUM`: `REC_COMPANY_CODE` (the session company's menus) and `MENU_NEWSOFTWARE` ('Y' shows the menu);
- `USERRIGHTS`: the row for the user, branch and menu (`RIGHTS_USER_ID`, `RIGHTS_BRANCH_ID`, `RIGHTS_MENU_ID`) and its `RIGHTS_VIEW`;
- `MODULEM`: `REC_COMPANY_CODE` and the menu's `MENU_MODULE_ID`, only to find the module the menu is listed under.

No other column SHALL be used for this, such as the old software's `MENU_DISPLAYED` or `MENU_TYPE`, or `RIGHTS_COMPANY`.

A module SHALL be listed only when at least one of its menus is. Modules SHALL be in `MODULE_ORDER` and menus in `MENU_ORDER`, with ties by name and then id. Each module SHALL have its id and name; each menu its id, code, name and route (`MENU_ROUTE1`). The company, user and branch SHALL come from the session only.

#### Scenario: Menus with rights
- **WHEN** a CPL user has the view right in their branch on "Company List" and "Profile", both marked for the new software in module "Hr"
- **THEN** the response is one module "Hr" with "Company List" then "Profile", in menu order, with their ids, codes and routes

#### Scenario: Not marked for the new software
- **WHEN** the user has rights on a menu whose `MENU_NEWSOFTWARE` is 'N'
- **THEN** that menu is not listed

#### Scenario: Old software's display flag ignored
- **WHEN** the user has the view right on a menu marked for the new software whose `MENU_DISPLAYED` is 'N'
- **THEN** that menu is listed

#### Scenario: No rights
- **WHEN** the user has no rights row on a menu, or a row with view 'N', or a row for another branch
- **THEN** that menu is not listed

#### Scenario: Empty module hidden
- **WHEN** none of a module's menus is listed
- **THEN** the module is not listed

#### Scenario: No rights at all
- **WHEN** the user has no rights on any new-software menu
- **THEN** the response is 200 with no modules

#### Scenario: Branch switched
- **WHEN** the user switches to a branch where they have rights on other menus
- **THEN** the menu lists the menus of the new branch

### Requirement: Menu rights endpoint
The system SHALL expose `GET /api/admin/menu/rights?codes=<code>,<code>`, which needs a valid token and takes 1 to 10 menu codes. For each code, in the order given, it SHALL return the code and the logged-in user's rights in the session branch on the session company's menu with that code marked for the new software, each as true or false: view, add, edit, delete, print, email, docs, docs upload and admin. The rights SHALL be read from `USERRIGHTS` at the time of the request. A code with no such menu, or no rights row, SHALL give all false. No codes, more than 10, or an empty code SHALL answer 400.

#### Scenario: Screen and related menu
- **WHEN** the user's row on "Employee List" has view 'Y' and on "Profile" view 'N', and the request is `?codes=NS-EMPLIST,NS-EMPPROFILE`
- **THEN** the response is `NS-EMPLIST` with view true, then `NS-EMPPROFILE` with view false

#### Scenario: Rights of a menu
- **WHEN** the user's row on "Employee List" in their branch has view 'Y', add 'Y', edit 'Y' and delete 'N'
- **THEN** the entry for `NS-EMPLIST` has view, add and edit true and delete false

#### Scenario: No rights row
- **WHEN** the user has no row on the menu in the session branch
- **THEN** every right of that code is false

#### Scenario: Unknown menu
- **WHEN** a code is another company's menu, a menu not marked for the new software, or no menu
- **THEN** every right of that code is false

#### Scenario: Too many codes
- **WHEN** the request has no codes or more than 10
- **THEN** the response is 400

### Requirement: Screen endpoints need the view right
The endpoints of a screen that has a menu SHALL answer 403 with the message "You do not have access to this screen." when the logged-in user lacks the view right on that menu in the session branch. The rule SHALL be checked before the endpoint reads any data. The menus and endpoints are:
- `NS-COMPLIST`: `GET /api/reports/companies`;
- `NS-BRANCHLIST`: `GET /api/reports/branches`;
- `NS-EMPPROFILE`: `GET /api/admin/profile`, `GET /api/admin/profile/photo`, `GET /api/admin/employees/{id}` and `GET /api/admin/employees/{id}/photo`;
- `NS-EMPLIST`: `GET /api/admin/employees`;
- `NS-HOLIDAYLIST`: `GET /api/admin/holidays` and `GET /api/reports/branches/{id}/holidays`.

Login, Change Branch, the menu endpoints and the session endpoints SHALL NOT need a menu right.

#### Scenario: Without the view right
- **WHEN** a user without the view right on "Company List" requests `GET /api/reports/companies`
- **THEN** the response is 403 "You do not have access to this screen." and no company is read

#### Scenario: With the view right
- **WHEN** a user with the view right on "Employee List" requests `GET /api/admin/employees`
- **THEN** the endpoint answers as before

#### Scenario: Employee profile needs the Profile right
- **WHEN** a user with the view right on "Employee List" but not on "Profile" requests `GET /api/admin/employees/{id}`
- **THEN** the response is 403 "You do not have access to this screen." and no employee is read

#### Scenario: Branch holidays need the Holiday List right
- **WHEN** a user with the view right on "Branch List" but not on "Holiday List" requests `GET /api/reports/branches/{id}/holidays`
- **THEN** the response is 403 "You do not have access to this screen." and no holiday is read

#### Scenario: Right in another branch only
- **WHEN** the user has the view right on "Holiday List" in another branch but not the session branch
- **THEN** `GET /api/admin/holidays` answers 403

### Requirement: Menu tables are read only
`MENUM`, `MODULEM` and `USERRIGHTS` SHALL be mapped read-only. Migrations SHALL leave them alone, and the system SHALL never write to them. The menu queries SHALL run on Oracle 10.2: no `TRUE`/`FALSE` literals and plain comparisons on the `CHAR(1)` flags.

#### Scenario: Migrations leave the tables alone
- **WHEN** the migration script is generated
- **THEN** it has no statement for `MENUM`, `MODULEM` or `USERRIGHTS`

#### Scenario: SQL on 10.2
- **WHEN** the menu and rights queries are generated for Oracle
- **THEN** their SQL has no `TRUE` or `FALSE` and compares `MENU_NEWSOFTWARE` and `RIGHTS_VIEW` with 'Y'
