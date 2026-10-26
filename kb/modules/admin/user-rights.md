# Business Requirement Specification
## Menu and User Rights

| Field | Value |
|---|---|
| **Domain** | Admin |
| **Capability** | Menu and User rights |
| **Current Version** | 1.0 |
| **Status** | Approved |
| **Owner** | Sourav V |
| **Last Updated** | 2026-10-22 |

## Document Use

This document is the business source of truth for menu and user-rights. It
describes current behaviour plus any entry marked `[Status: Proposed]`.
A propose command should name the version or BR IDs to implement;
everything else here already exists.

**Tracking changes:**

- Rules use `BR-<group>.<n> [v<version>]`, e.g. `BR-004.2 [v1.2]`.
- Scenarios use `BR-<group>.S<n> [v<version>]`, e.g. `BR-004.S2 [v1.2]`.
- A modified rule or scenario keeps its ID and shows both versions, e.g. `[v1.0 → v1.3]`.
- A removed rule or scenario is deleted here and recorded in Change History. Its ID is never reused.
- Every change is listed in Change History as ADDED, MODIFIED, or REMOVED.

## Purpose

Based on loged in user' rights for each menu (userrights table)  

## Glossary

| Term | Meaning |
|---|---|
| User Rights | The rights like view,add,delete etc.. assigned to each user is saved in userrights table |
| Menu | The Menu table contain details of menu's available and to check visibility in software |

---

## Change History

### v1.0 — Initial Menu and Userrights   [Status: Draft]

- **Date:** 2026-10-22
- **Change Ref:** `admin-user-rights`
- **Affects:** BR-001, BR-002

**Changes:**
- ADDED module and list of menu under module based on module id
- ADDED rules to display menu based on user rights

---

## Scope

- To show menu on software(navbar) based on new-software column in menu table.
- Based on rights assigned for a user, view, admin etc.. options will be available.
- Module is displayed only when minimum one menu is is displayed.
- When a menu is clicked pass menu id with URL parameters.
- Check user rights for that menu id passed to backend and display menu options based on rights

---

## Data Model

### Table :MENUM

**Purpose:** Stores the details of all available menu.

| Ver | Column | Type | Description |
|---|---|---|---|
| 1.0 | MENU_PKID | PK | Internal  ID |
| 1.0 | REC_COMPANY_CODE | VARCHAR(20) | Company code |
| 1.0 | MENU_MODULE_ID | VARCHAR(40) | Module Id, under which menu added |
| 1.0 | MENU_CODE | VARCHAR(40) | Menu Code |
| 1.0 | MENU_NAME | VARCHAR(60) | Menu Name |
| 1.0 | MENU_ROUTE1 | VARCHAR(100) | Route or path of menu |
| 1.0 | MENU_ROUTE2 | VARCHAR(100) | Route or path of menu optional |
| 1.0 | MENU_NEWSOFTWARE | BOOLEAN | Show in New Software or not |

### Table :USERRIGHTS

**Purpose:** Stores the details of user and their rights like edit, view, delete, print etc.

| Ver | Column | Type | Description |
|---|---|---|---|
| 1.0 | RIGHTS_PKID | PK | Internal  ID |
| 1.0 | RIGHTS_BRANCH_ID | VARCHAR(20) | branch id |
| 1.0 | RIGHTS_USER_ID | VARCHAR(40) | user id |
| 1.0 | RIGHTS_MENU_ID | VARCHAR(40) | Menu id |

### Constraints
---

### Relationships
---


## Business Rules

### BR-001 — Menu Visibility Check

- **BR-001.1 [v1.0]** If New Software is Y then show menu in navbar, else Hide
- **BR-001.2 [v1.0]** Name displayed on Navbar is based on menu name
- **BR-001.3 [v1.0]** Menu Displayed are in order of column order
- **BR-001.4 [v1.0]** Each menu is displayed under a module, based on module id

**Scenarios**

- **BR-001.S1 [v1.0]** 
WHEN a menu's new software column is Y
THEN Show the menu on navbasr of new software.

- **BR-001.S2 [v1.0]** 
WHEN a menu have new software true
THEN Show that menu under the assigned module


### BR-002 — User Rights Check

- **BR-002.1 [v1.0]** Based on rights assigned to each user, menu functionality changes
- **BR-002.2 [v1.0]** Menu is Displayed on basis of rights assigned to login user
- **BR-002.3 [v1.0]** Menu Displayed are in order of column order
- **BR-002.4 [v1.0]** Each menu is displayed under a module, based on module id

**Scenarios**

- **BR-002.S1 [v1.0]** 
WHEN login user have no rights on a menu
THEN Menu is hide from navabar or not displayed

- **BR-002.S2 [v1.0]** 
WHEN login user have View rights
THEN User Can only view record and record list, no Add,Edit,Detete etc..

---

## User Interface

- Menus are listed under module like below example
    HR
      employee list
      profile


## Workflow

- When software is opened, Show module only if minimum one menu is assigned(displayed).
- When a menu is selected/clicked pass menu id as URL parameter
- Based on this menu id param check user rights, like for add, edit ,delete etc.


---

