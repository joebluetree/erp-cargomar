# Business Requirement Specification
## Employee Profile List

| Field | Value |
|---|---|
| **Domain** | Admin |
| **Capability** | Employee List |
| **Current Version** | 1.1 |
| **Status** | Approved |
| **Owner** | Sourav V |
| **Last Updated** | 2026-10-28 |

## Document Use

This document is the business source of truth for Employee. It
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

This menu allows a user to view employee list.
User can open and view each employee profile screen.
User with its rights can only

## Glossary

| Term | Meaning |
|---|---|
| Employee | A list of rows from `EMPM`. |
---

## Change History

### v1.1 —  Employee Status List   [Status: Proposed]

- **Date:** 2026-10-28
- **Change Ref:** `admin-emp-status`
- **Affects:** BR-003

**Changes:**

- ADDED Employee status Search filter.

### v1.0 — Initial Employee List   [Status: Proposed]

- **Date:** 2026-10-16
- **Change Ref:** `admin-emp-list`
- **Affects:** BR-001, BR-002

**Changes:**

- ADDED Profile menu entry in the sidebar (also shown as a Dashboard quick link).
- ADDED Employee List Screen with search filters.
- ADDED Profile screen: the logged-in user's own employee profile, view only.
- ADDED read-only use of `EMPM` and of `PARAM` (state and country names).

---


## Scope

- View all employee's list and can open each employee pofile separately.
- View Active, Relieved, or All Employees.
- by default active user.

---

## Business Rules

### BR-001 — Employee Profile List

- **BR-001.1 [v1.0]** A User with Rights CAN view list of employee.
- **BR-001.2 [v1.0]** The profile SHALL be view only.

**Scenarios**

- **BR-001.S1 [v1.0]** WHEN user have rights
  THEN Show employee list with profile view option.

### BR-002 — Employee Search

- **BR-002.1 [v1.0]** User can search and filter List by Name and Code.

**Scenarios**

- **BR-002.S1 [v1.0]** WHEN user search with employee name or code
  THEN Show only filtered employee list.

### BR-003 — Active/Relieved Employee Search

- **BR-003.1 [v1.1]** User can search Active and Relieved employee.
- **BR-003.2 [v1.1]** User can also search all employee, using dropdown list.

**Scenarios**

- **BR-003.S1 [v1.1]** WHEN user search active employee
  THEN Show only relieved = N employee list.
- **BR-003.S2 [v1.1]** WHEN user search Relieved employee
  THEN Show only relieved = Y employee list.
- **BR-003.S3 [v1.1]** WHEN user search all(status type) employee
  THEN Show only employee list without checking relieved column.

---

## Data Model

### Employee Master Table (EMPM)

**Purpose:** stores all details of an employee. Existing table; read only.

**Basic Info**

| Ver | Column | Description |
|---|---|---|
| 1.0 | EMP_PKID | Internal id of the employee; the user's `USERM.USER_EMP_ID` |
| 1.0 | EMP_NO | Employee Code (the table has no `EMP_CODE` column) |
| 1.0 | EMP_NAME | Name |
| 1.0 | EMP_FATHER_NAME | Father's Name |
| 1.0 | EMP_SPOUSE_NAME | Spouse Name |
| 1.0 | EMP_MARITAL_STATUS | Marital Status |
| 1.0 | EMP_DO_BIRTH | Date of Birth (shown as dd-MM-yyyy) |
| 1.1 | EMP_IS_RELIEVED | Relieved status |

**Bank Details**

| Ver | Column | Description |
|---|---|---|
| 1.0 | EMP_BANK_ACNO | Bank A/C No |
| 1.0 | EMP_BANK_NAME | Bank Name |
| 1.0 | EMP_BANK_BRANCH | Branch |
| 1.0 | EMP_IFSC_CODE | IFSC Code |

**Current Address**

| Ver | Column | Description |
|---|---|---|
| 1.0 | EMP_LOCAL_ADDRESS1 | Address 1 |
| 1.0 | EMP_LOCAL_ADDRESS2 | Address 2 |
| 1.0 | EMP_LOCAL_ADDRESS3 | Address 3 |
| 1.0 | EMP_LOCAL_CITY | City |
| 1.0 | EMP_LOCAL_STATE_ID | State (a `PARAM` id of type `STATE`; shown by name) |
| 1.0 | EMP_LOCAL_PIN | PIN Code |
| 1.0 | EMP_LOCAL_POBOX | P.O. |
| 1.0 | EMP_LOCAL_COUNTRY_ID | Country (a `PARAM` id of type `COUNTRY`; shown by name) |

**Permanent Address**

| Ver | Column | Description |
|---|---|---|
| 1.0 | EMP_HOME_ADDRESS1 | Address 1 |
| 1.0 | EMP_HOME_ADDRESS2 | Address 2 |
| 1.0 | EMP_HOME_ADDRESS3 | Address 3 |
| 1.0 | EMP_HOME_CITY | City |
| 1.0 | EMP_HOME_STATE_ID | State (a `PARAM` id of type `STATE`; shown by name) |
| 1.0 | EMP_HOME_PIN | PIN Code |
| 1.0 | EMP_HOME_POBOX | P.O. |
| 1.0 | EMP_HOME_COUNTRY_ID | Country (a `PARAM` id of type `COUNTRY`; shown by name) |

**Contact Details**

| Ver | Column | Description |
|---|---|---|
| 1.0 | EMP_MOBILE | Mobile |
| 1.0 | EMP_EMAIL_PERSONAL | Email |

**ID and Documents**

| Ver | Column | Description |
|---|---|---|
| 1.0 | EMP_ADHAR_NO | Aadhaar |
| 1.0 | EMP_PAN | PAN |
| 1.0 | EMP_PFNO | PF |
| 1.0 | EMP_ESINO | ESI No |
| 1.0 | EMP_UAN_NO | UAN |

### Parameter Table (PARAM)

**Purpose:** shared lookup values. Existing table; read only. Used here for state and country names.

| Ver | Column | Description |
|---|---|---|
| 1.0 | PARAM_PKID | Internal id; the value held in `EMP_*_STATE_ID` / `EMP_*_COUNTRY_ID` |
| 1.0 | PARAM_TYPE | `STATE` or `COUNTRY` |
| 1.0 | PARAM_NAME | The name shown |

### Relationships

```
USERM.USER_EMP_ID  -> EMPM.EMP_PKID       (fetched at login, carried by the session)
EMPM.EMP_*_STATE_ID   -> PARAM.PARAM_PKID (PARAM_TYPE = 'STATE')
EMPM.EMP_*_COUNTRY_ID -> PARAM.PARAM_PKID (PARAM_TYPE = 'COUNTRY')
```

---

## User Interface

### Employee List

Displays existing employee and lets users search, filter, sort, and maintain
customer records. refere [list-screen](../../platform/list-screen.md)

#### List Columns

| Ver | Field | Description |
|---|---|---|
| 1.0 | Employee No | Code |
| 1.0 | Employee Name | Name |
| 1.0 | Father's Name | Fathers Name |
| 1.0 | Date of birth | DOB |
| 1.0 | Address1,Address2,Address3 | Current Address |
| 1.0 | mobile no | Contact Number |
| 1.0 | personal Email | Personal Email |

#### Search

As defined in BR-002 and BR-003.
- for status show a dropdown list with value Active, Relieved and All.

### Employee List

- Opened from the **Employee List** entry of the main menu (sidebar and the slide-in menu on narrow screens). Like every menu entry, it is also a Dashboard quick link.
- Shows all employee list with a link on code top open each empoyee profile separately. no edit, save or delete actions.
- refere list-screen template for design.

#### Actions

**Record Actions:**

| Ver | Action | Shown when |
|---|---|---|
| 1.0 | View | Always |

---

## Current Working and Out of Scope

- The Employee List menu opens the list of employees and when code clicked or selected open profile of the employee whose id (`USER_EMP_ID`). The screen never takes an employee id from the user.

## Permissions

| Action | Roles |
|---|---|
| View | ALL |
