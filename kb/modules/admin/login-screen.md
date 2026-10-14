# Business Requirement Specification
## Login Screen

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

<!-- Company List gives a list of companies in the ERP -->
Login Screen check auth and allow user to login to software based on login credentials, and fetch details like user, branch, company, year details

## Glossary

| Term | Meaning |
|---|---|
| Company | Available option for company, type `C`. |
| Branch | list of branches with company_code of selected company. |
| User | Table which have user details like Name, code, branch id(default). |
| Year | Table which have year details like year code, start and end date  (FY). |

---

## Change History

### v1.0 — Initial User Login   [Status: Implemented]

- **Date:** 2026-10-12 
- **Change Ref:** `user-loginpage`
- **Affects:** BR-001

**Changes:**

<!-- - ADDED Company List report (BR-001): read-only, filter by code and name, sort, page. -->
- ADDED "Remember me" checkbox on the login screen (BR-001): after a successful login with it ticked, the browser remembers the user code, password and company code and fills them in next time; unticked, it forgets them. The password is kept in plain text in the browser.

---

## Login Screen Requirments

A login screen which have three input options, User(user name), Password, Company Code and two action button cancel and login.
if login credentials are matching, Fetch details like user name, code, company code, Default branch saved in user table, latest financial year of that corresponding company saved in yearm table, move to Home dashboard.
The main Dashboard header shows the company name as its main title at the top left, and the fetched details at the top right in order like `(User Name    Default branch    year)`
All data and menu display on screen are based on selected company id, branch id and the latest financial year.

## Scope

- Show login screen, with user name, passwod, company code -> text field

---
## Data Model

- The structure of tables used to check login credentials and also to retrive datas after login success

### Table :userm

**Purpose:** To check login credential and to retrive details.

| Ver | Column | Description |
|---|---|---|
| 1.0 | USER_PKID | Internal  ID of user table|
| 1.0 | USER_CODE | Unique user code, retrive code after login matches |
| 1.0 | USER_NAME | Login check this name |
| 1.0 | USER_PASSWORD | login check this password |
| 1.0 | REC_COMPANY_CODE | Login check Company code |
| 1.0 | USER_BRANCH_ID | Default branch, retrive branch after login matches and datas are based on this branch only |

### Table :yearm

**Purpose:** This table fetch financial year detail

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

- use these tables in db to check login credentials and to retrive back data as mention in requirment.
---

## Business Rules

### BR-001 — Login Screen

- **BR-001.1 [v1.0]** User Name, Password and Company code are text field and mandatory.
- **BR-001.2 [v1.0]** Password can be hide/show using eye icon.

**Scenarios**

- **BR-001.S1 [v1.0]**
WHEN eye icon closed
THEN hide password else show.

---

## User Interface

### Login screen

login screen with user name, password, and company code downwards (fields alligned vertically).
Password field have eye icon on right of text box which hide the text value(password) when eye is closed
and show password when eye opened (BR-001.S1).
Action buttons Login and Cancel are aligned on right bottom of login screen component.
When login move to main/home dashboard: the company name is the main title at the top left of the header, and the login details (user, branch, FY) are on the top right of the header, before theme toggle button


#### Actions

- **Login:** check login credential data passed to backend with db and if matches, move to dashboard
- **Cancel:** This will reset the login page

## References and notes

- follow backend and frontend structure as mentioned in kb
