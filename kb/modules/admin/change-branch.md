# Business Requirement Specification
## Change Branch

| Field | Value |
|---|---|
| **Domain** | Admin |
| **Capability** | Login Screen |
| **Current Version** | 1.0 |
| **Status** | Approved |
| **Owner** | Sourav |
| **Last Updated** | 2026-10-12 |

## Document Use

This document is the business source of truth for user Login-Screen. It
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

Change branch option helps user to change login branch and financial year without loging out.
User can change to any branch, which they have rights, based on table userd also any years which a company have.

## Glossary

| Term | Meaning |
|---|---|
| Company | Available option for company, type `C`. |
| Branch | list of branches with company_code of selected company. |
| User | Table which have user details like Name, code, branch id(default). |
| Year | Table which have year details like year code, start and end date  (FY). |
| userd | the table which save the branches alloted to a user |
---

## Change History

### v1.0 — Initial User Login   [Status: Implemented]

- **Date:** 2026-10-13
- **Change Ref:** `user-branch-change`
- **Affects:** BR-001

**Changes:**

<!-- - ADDED Company List report (BR-001): read-only, filter by code and name, sort, page. -->

---

## Branch Change Requirments

When a change branch (change icon) is clicked a modal window is openend, change icon is set on top right after login details.
The Screen option have two fields branch and year both are dropdown (autocomplete, LOV).
on clicking select the user will be changed to selected branch and year.

## Scope

- Show modal window screen with lov fields branch and year, and two action button select and cancel

---
## Data Model

- The structure of tables used to change branch and year

### Table :userd

**Purpose:** To change branch, userd have all branch allocated to a user, multiple rows of data for a user with multiple branches.

| Ver | Column | Description |
|---|---|---|
| 1.0 | USER_ID | ID of user|
| 1.0 | USER_BRANCH_ID | fk id of branches, type="B" in company table |

### Table :yearm

**Purpose:** This table fetch all financial year details for that company

| Ver | Column | Description |
|---|---|---|
| 1.0 | YEAR_PKID | Internal  ID of year table |
| 1.0 | YEAR_CODE | year code |
| 1.0 | YEAR_NAME | dashboard display this  |
| 1.0 | YEAR_START_DATE | login check this password |
| 1.0 | YEAR_END_DATE | login check this password |
| 1.0 | REC_COMPANY_CODE | based on Company code, retrive year details |

### Table : comapnym

**Purpose:** This table fetch comapny and branch details ( based on comp_type)

| Ver | Column | Description |
|---|---|---|
| 1.0 | COMP_PKID | Internal  ID of Company and branch table |
| 1.0 | COMP_CODE | year code |
| 1.0 | COMP_NAME | dashboard display this name |
| 1.0 | COMP_TYPE | TYPE='C' for company TYPE='B' for branch  |


### Relationships

- use these tables in db to select and display changed menus, modules based on seleted branch and year.
---

## Business Rules

### BR-001 — Change Branch Modal screen

- **BR-001.1 [v1.0]** User branch, year are LOV field and mandatory.

**Scenarios**

---

## User Interface

### Change Branch

a modal window screen with LOV fields(dropdown) for branch and year, and on bottom right two action button Select and Cancel.
Header with title Change Branch

#### Actions

- **Select:** change current branch and year to selected branch and year
- **Cancel:** This will return to previous screen

## References and notes

- follow backend and frontend structure as mentioned in kb
