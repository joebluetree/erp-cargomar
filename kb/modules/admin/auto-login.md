# Business Requirement Specification
## Auto Login

| Field | Value |
|---|---|
| **Domain** | Admin |
| **Capability** | Auto Login |
| **Current Version** | 1.0 |
| **Status** | Approved |
| **Owner** | Sourav |
| **Last Updated** | 2026-10-26 |

## Document Use

This document is the business source of truth for user Auto Login. It
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

Login credentials is checked based on data fetched from appdetails table and Automatic login to dashboard without login screen.


## Glossary

| Term | Meaning |
|---|---|
| Appdetails | Save Login details like User id, code, password, company, branch, year|

---

## Change History

### v1.0 — Initial User Auto Login   [Status: Implemented]

- **Date:** 2026-10-26
- **Change Ref:** `admin-auto-login`
- **Affects:** BR-001, BR-002

**Changes:**

<!-- - ADDED Company List report (BR-001): read-only, filter by code and name, sort, page. -->
- ADDED Auto Login function (BR-001):

---

## Login Auto Login Requirments

A new Login service which receive a id (from appdetails table) which fetch all details like login user's Id, code, password, Company Code, Branch Code,
year, and based on these datas fetched Authentication is done automatically. The Authentication only works if user_logged_out is N.
Dashborad with login details will be shown after auto-login.

## Scope

- Automatically login using login detail from appdetails table

---
## Data Model

- The structure of tables used to check auto-login credentials and also to retrive datas after login success

### Table :appdetails

**Purpose:** To fetch login credential detail of existing logged in user

| Ver | Column | Description |
|---|---|---|
| 1.0 | USER_APPID | Internal  ID of user table, Use this ID to fetch login details|
| 1.0 | USER_CODE | Unique user code, use this code for login|
| 1.0 | USER_PASSWORD | Use this password |
| 1.0 | USER_COMPANY_CODE | Use this Company code |
| 1.0 | USER_BRANCH_ID | Use this Branch id |
| 1.0 | USER_YEAR_ID | Use this Year id |
| 1.0 | USER_LOGGED_OUT | Only log in if this field is N |

### Table :userm

**Purpose:** To check login credential passed by auto-login service and to retrive details.

| Ver | Column | Description |
|---|---|---|
| 1.0 | USER_PKID | Internal  ID of user table|
| 1.0 | USER_CODE | Unique user code, retrive code after login matches |
| 1.0 | USER_NAME | Login check this name |
| 1.0 | USER_PASSWORD | login check this password |
| 1.0 | REC_COMPANY_CODE | Login check Company code |
| 1.0 | USER_BRANCH_ID | Default branch, retrive branch after login matches and datas are based on this branch only |
| 1.1 | USER_EMP_ID | to fetch employee id |

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

### BR-001 — Auto-login service

- **BR-001.1 [v1.0]** Get user login details from user_appid passed from frontend.
- **BR-001.2 [v1.0]** Fetched details are passed to login-service and get automatically logged in.

**Scenarios**

- **BR-001.S1 [v1.0]**
WHEN URL have id parameter while loging in
THEN Login Automatically to dashboard without login screen.

---

## User Interface

### Login screen

a URL parameter is passed (appid) which fetch login details as per BR-001.1 from appdetails table, and directly logged into 
Dashboard after checking login credentials.

## References and notes

- follow backend and frontend structure as mentioned in kb
