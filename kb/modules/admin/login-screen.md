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

---

## Login Screen Requirments

A login screen which have three input options, User(user name), Password, Company Code and two action button cancel and login.
if login credentials are matching, Fetch details like user name, code, company code, Default branch saved in user table, latest financial year of that corresponding company saved in yearm table, move to Home dashboard.
The main Dashboard display fetched details in order like `(User Name    Company name (default branch) year)`
All data and menu display on screen are based on selected company id, branch id and the latest financial year

## Scope

- Show login screen, with user name, passwod, company code -> text field

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
When login move to main/home dashboard and display login details on top right of header, before theme toggle button


#### Actions

- **Login:** check login credential data passed to backend with db and if matches, move to dashboard
- **Cancel:** This will reset the login page

