# Business Requirement Specification
## Employee Profile

| Field | Value |
|---|---|
| **Domain** | Admin |
| **Capability** | Employee |
| **Current Version** | 1.0 |
| **Status** | Approved |
| **Owner** | Sourav V |
| **Last Updated** | 2026-10-15 |

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

This menu allows a user to view their own profile details, including basic information, bank details, addresses, contact details and ID numbers.
Users can view only their own profile. When the **Profile** menu is selected (clicked), it directly opens the currently logged-in user's employee profile.


## Glossary

| Term | Meaning |
|---|---|
| Employee | A row of `EMPM`. A user is linked to their employee by `USERM.USER_EMP_ID` (= `EMPM.EMP_PKID`), fetched at login. |
| Employee Code | The employee's business code, `EMPM.EMP_NO`. |
| Parameter | A row of the shared lookup table `PARAM`; states and countries are parameters of type `STATE` and `COUNTRY`. |

---

## Change History

### v1.0 — Initial Employee Profile   [Status: Proposed]

- **Date:** 2026-10-15
- **Change Ref:** `admin-emp-profile`
- **Affects:** BR-001, BR-002, Profile screen, main menu

**Changes:**

- ADDED Profile menu entry in the sidebar (also shown as a Dashboard quick link).
- ADDED Profile screen: the logged-in user's own employee profile, view only.
- ADDED read-only use of `EMPM` and of `PARAM` (state and country names).

---


## Scope

- View the logged-in user's own employee profile (view only).

**Out of scope (later changes):**

- A list of all employees, and search.
- Viewing another employee's profile.
- Editing the profile.
- Showing the employee's photo (`EMP_IMAGE_NAME` exists, but where the image files are stored is not yet known).

---

## Business Rules

### BR-001 — Employee Profile

- **BR-001.1 [v1.0]** A user SHALL see only their own employee profile: the employee linked to the user by `USER_EMP_ID` at login. There is no way to choose or ask for another employee.
- **BR-001.2 [v1.0]** The user SHALL open their profile directly from the **Profile** menu, without a list or search step.
- **BR-001.3 [v1.0]** The profile SHALL be view only.
- **BR-001.4 [v1.0]** Every field of the data model SHALL be shown in full, including bank account and ID numbers (it is the user's own data). A field without a value shows a dash (—).
- **BR-001.5 [v1.0]** State and country SHALL be shown by name (from `PARAM`), never as internal ids.

**Scenarios**

- **BR-001.S1 [v1.0]** WHEN a logged-in user chooses Profile in the menu
  THEN their own employee profile is shown.
- **BR-001.S2 [v1.0]** WHEN the employee has no spouse name
  THEN Spouse Name shows "—".
- **BR-001.S3 [v1.0]** WHEN the employee's current state is the parameter "KERALA"
  THEN the Current Address shows State "KERALA".

### BR-002 — No Employee Linked

- **BR-002.1 [v1.0]** A user without an employee id, or whose employee id names no employee, SHALL see a message that no employee profile is linked to the user. This is not an error.
- **BR-002.2 [v1.0]** A user who logged in before the employee id was fetched at login SHALL see the same message until they log in again.

**Scenarios**

- **BR-002.S1 [v1.0]** WHEN a user whose `USER_EMP_ID` is empty opens Profile
  THEN the screen says no employee profile is linked, and no error notification is shown.

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

### Employee Profile

- Opened from the **Profile** entry of the main menu (sidebar and the slide-in menu on narrow screens). Like every menu entry, it is also a Dashboard quick link.
- Shows only the logged-in user's profile. View only: no inputs and no edit, save or delete actions.
- Refer to the UI template [employee_profile](../../ui-templates/admin/emp-profile-basic-info.JPG).
- Uses the full content area width.
- A top card with a round image area on the top-left showing the employee's initials (for example "AN" for "Asha Nair"), and the name and Employee Code beside it.
- Below it, a separate box for each group, in this order: Basic Information, Bank Details, Current Address, Permanent Address, Contact Details, ID and Documents.
- Displays every field in the data model, with a dash for an empty value.
- States: a loading message while loading; "no employee profile linked" when the user has none; an alert with Retry when loading fails.

#### Actions

**Record Actions:**

| Ver | Action | Shown when |
|---|---|---|
| 1.0 | View | Always |

---

## Current Working and Out of Scope

- The Profile menu opens the profile of the employee whose id (`USER_EMP_ID`) was fetched at login and is carried by the session. The screen never takes an employee id from the user.

## Permissions

| Action | Roles |
|---|---|
| View (own profile) | ALL |
