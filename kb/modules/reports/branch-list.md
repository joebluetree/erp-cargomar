# Business Requirement Specification
## Branch List

| Field | Value |
|---|---|
| **Domain** | Reports |
| **Capability** | Branch List |
| **Current Version** | 1.0 |
| **Status** | Approved |
| **Owner** | Sourav V |
| **Last Updated** | 2026-10-17 |

## Document Use

This document is the business source of truth for Branch List. It
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

Branch List gives a list of branches in the ERP

## Glossary

| Term | Meaning |
|---|---|
| Branch | A row of the Companym table whose type is branch (`B`), not deleted. |

Terms of the common list behaviour (Search, searched filters, selected row, Wrap text) are in `kb/platform/list-screen.md`.

---

## Change History

### v1.0 — Initial Branch List   [Status: Implemented]

- **Date:** 2026-10-17
- **Change Ref:** `reports-branch-list`
- **Affects:** BR-001

**Changes:**

- ADDED Branch List report (BR-001): read-only, filter by code and name, sort, page.

---


## Common List Requirements

This list follows the list-screen requirements in `kb/platform/list-screen.md` (`LS`) **v1.0 with no exceptions**: the layout (LS-001), Search and filters (LS-002), filtering and paging on the server (LS-003), the footer (LS-004), sorting of the shown page (LS-005), row selection (LS-006), remembered screen state (LS-007), the Wrap text toggle (LS-008), the loading, empty and error states (LS-009), the look (LS-010), accessibility (LS-011) and navigation (LS-012).

The rest of this document states only what is specific to the Branch List.

## Scope

- Show the list of branches held in the existing Companym table, under same company which logined
- Filter by branch code and branch name
- Read only: no branch is created, changed or deleted here

---

## Business Rules

### BR-001 — Branch List

- **BR-001.1 [v1.0]** Show Branch List.
- **BR-001.2 [v1.0]** Only branches are listed: rows of `COMPANYM` with `COMP_TYPE` = 'B' and company_code = login company that are not deleted (`REC_DELETED_DATE` empty)..
- **BR-001.3 [v1.1 → v1.2]** The Code filter applies to the branch code and the Name filter to the branch name, matched as LS-002.4 says (contains, ignoring letter case, blank does not restrict, both must match, `%` and `_` are ordinary characters).
- **BR-001.4 [v1.1]** branches are ordered by name ascending, then by their identifier, so that no branch is repeated or skipped between pages. This is the order shown until the user chooses a sort (LS-005.3).
- **BR-001.5 [v1.2]** The menu entry and the Dashboard quick link are named "Branch List" (LS-012.1).

**Scenarios**

- **BR-001.S1 [v1.0]**
WHEN the table holds 7 companies and 10 branches
THEN the list shows the 10 branches.
- **BR-001.S2 [v1.1]**
WHEN the user searches for Code "c"
THEN only branches whose code contains "c" or "C" are listed, and the total counts only those.
- **BR-001.S3 [v1.1]**
WHEN the user searches for Name "100%"
THEN only branches whose name contains the text "100%" are listed ("%" is not a wildcard).

### BR-002 — Holiday List

- **BR-002.1 [v1.0]** Show Holiday List of each branch.
- **BR-002.2 [v1.0]** Holiday list are saved in a folder(path in appsettings) as txt file
- **BR-002.3 [v1.0]** Holiday list file saved in format comp_code-branch-year eg (CPL-COKSF-2026.txt)

**Scenarios**

- **BR-002.S1 [v1.0]**
WHEN button in column holiday is selected
THEN list of holiday is show like profile format

---

## Data Model

### Table : COMPANYM

**Purpose:** The existing company table. It also holds branches. here list of branches under login company is shown; it is not created, changed or deleted by this screen.

| Ver | Column | Type | Used for |
|-----|--------|------|----------|
| 1.0 | COMP_PKID | NVARCHAR2(40) | Identifier (text, not shown) |
| 1.0 | COMP_TYPE | CHAR(1) | `C` company, `B` branch; only `B` is listed under login company |
| 1.0 | REC_COMPANY_CODE | NVARCHAR2(10) | Company Code which user loged in |
| 1.0 | COMP_CODE | NVARCHAR2(10) | Code |
| 1.0 | COMP_NAME | NVARCHAR2(60) | Name |
| 1.0 | COMP_ADDRESS1 | NVARCHAR2(60) | Address-1 |
| 1.0 | COMP_ADDRESS2 | NVARCHAR2(60) | Address-2 |
| 1.0 | COMP_ADDRESS3 | NVARCHAR2(60) | Address-3 |
| 1.0 | COMP_TEL | NVARCHAR2(60) | Tel |
| 1.0 | COMP_EMAIL | NVARCHAR2(60) | Email |
| 1.0 | COMP_WEB | NVARCHAR2(60) | Web |

The column types in version 1.0 (VARCHAR) were corrected to the real table. The table has other columns that this screen does not use.

---

## User Interface

### Branch List

Displays the existing branches one page at a time. The layout, the Search button, the Wrap text toggle, the footer and the row behaviour are those of the common list screen (`LS-001` – `LS-009`); this section lists what is specific to the Branch List.

#### List Columns

| Ver | Field | Description |
|---|---|---|
| 1.0 | Comp_Code | Code |
| 1.0 | Comp_Name | Name |
| 1.0 | Comp_address1 | Address-1 |
| 1.0 | Comp_address2 | Address-2 |
| 1.0 | Comp_address3 | Address-3 |
| 1.0 | Comp_Tel | Tel |
| 1.0 | Comp_email | Email |
| 1.0 | Comp_web | Web |

#### Filters

| Ver | Filter | Type | Options | Default |
|---|---|---|---|---|
| 1.0 | Code | TextBox |
| 1.0 | Name | TextBox |

The filters are applied by the Search button (LS-002).

#### Sorting

| Ver | Sortable Field |
|---|---|
| 1.0 | Comp_Code |
| 1.0 | Comp_Name |
| 1.0 | Comp_Address1 |
| 1.0 | Comp_Address2 |
| 1.0 | Comp_Address3 |
| 1.0 | Comp_Tel |
| 1.0 | Comp_Email |
| 1.0 | Comp_Web |

**Default Sort:** Branch Name ascending (BR-001.4). Sorting a column reorders the shown page only (LS-005).

#### Pagination

As the common list screen: the default page size and the available page sizes are those of LS-003 and LS-004. [v1.0]

#### Actions

The common actions of a list screen (Back, Search, Wrap text, the page buttons, Rows per page and selecting a row) are defined in `LS-001` – `LS-008` and apply here. The Company List adds none of its own.

**Page Actions:**

| Ver | Action | Shown when |
|---|---|---|
| 1.2 | None specific to this list | |

**Record Actions:**

| Ver | Action | Shown when |
|---|---|---|
| 1.2 | None specific to this list | |

---
