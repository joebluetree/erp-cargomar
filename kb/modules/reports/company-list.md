# Business Requirement Specification
## Company List

| Field | Value |
|---|---|
| **Domain** | Reports |
| **Capability** | Company List |
| **Current Version** | 1.2 |
| **Status** | Approved |
| **Owner** | Joyi John |
| **Last Updated** | 2026-10-09 |

## Document Use

This document is the business source of truth for Company List. It
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

Company List gives a list of companies in the ERP

## Glossary

| Term | Meaning |
|---|---|
| Company | A row of the company table whose type is company (`C`), not deleted. |
| Branch | A row of the same table whose type is branch (`B`). Branches are not listed. |

Terms of the common list behaviour (Search, searched filters, selected row, Wrap text) are in `kb/platform/list-screen.md`.

---

## Change History

### v1.2 — Follows the common list-screen requirements   [Status: Implemented]

- **Date:** 2026-10-09
- **Change Ref:** `reports-company-list`
- **Affects:** BR-001, BR-002 – BR-008 (removed), Scope, Glossary, User Interface

**Changes:**

- ADDED section "Common List Requirements": this list follows `kb/platform/list-screen.md` (`LS`) v1.0 with no exceptions.
- REMOVED BR-002 (Search), moved to LS-002. The ID is not reused.
- REMOVED BR-003 (Paging), moved to LS-003 and LS-004. The ID is not reused.
- REMOVED BR-004 (Sorting), moved to LS-005; the default order stays here as BR-001.4. The ID is not reused.
- REMOVED BR-005 (Row selection), moved to LS-006. The ID is not reused.
- REMOVED BR-006 (Screen state is remembered), moved to LS-007. The ID is not reused.
- REMOVED BR-007 (Wrap text), moved to LS-008. The ID is not reused.
- REMOVED BR-008 (Navigation), moved to LS-012; the name of this list's menu entry stays here as BR-001.5. The ID is not reused.
- MODIFIED BR-001.3: the Code and Name filters apply to the company code and name, matched as LS-002.4 says.
- ADDED BR-001.5: the menu entry and Dashboard quick link are named "Company List".
- MODIFIED Scope, Glossary and User Interface: the common behaviour, layout, paging and actions are no longer repeated here.
- The behaviour is unchanged; only where it is written down has moved.

---

### v1.1 — Search button, server-side paging and screen behaviour   [Status: Implemented]

- **Date:** 2026-10-09
- **Change Ref:** `reports-company-list`
- **Affects:** BR-001 – BR-008, COMPANYM, all screen tables

**Changes:**

- MODIFIED BR-001 (filters, order): filters are Code and Name text, case-insensitive "contains", combined; companies are ordered by name, then by id.
- ADDED BR-002 Search: filters apply only when Search is pressed; the system filters and returns only the shown page.
- ADDED BR-003 Paging: the system pages; page sizes 2, 5, 10, 25, 50, 100 (2 added); First, Previous, Next, Last; "Showing x–y of n" and "Page n of m".
- MODIFIED BR-004 Sorting: sorting reorders the rows of the shown page only; the order across pages is by name.
- ADDED BR-005 Row selection.
- ADDED BR-006 Screen state is remembered while the application stays open.
- ADDED BR-007 Wrap text toggle (on by default).
- ADDED BR-008 Navigation: menu entry "Company List", Back button.
- MODIFIED data model: column types corrected to the real table; COMP_TYPE and REC_DELETED_DATE added as used columns.
- MODIFIED user interface: Search button and Wrap text toggle added to the screen; page sizes updated.
- Look and feel (colours, table styling, icons, header) is not business behaviour and is described in `kb/architecture/frontend.md`, "Look and feel".

---

### v1.0 — Initial Company List   [Status: Implemented]

- **Date:** 2026-08-01
- **Change Ref:** `reports-company-list`
- **Affects:** BR-001

**Changes:**

- ADDED Company List report (BR-001): read-only, filter by code and name, sort, page.

---


## Common List Requirements

This list follows the list-screen requirements in `kb/platform/list-screen.md` (`LS`) **v1.0 with no exceptions**: the layout (LS-001), Search and filters (LS-002), filtering and paging on the server (LS-003), the footer (LS-004), sorting of the shown page (LS-005), row selection (LS-006), remembered screen state (LS-007), the Wrap text toggle (LS-008), the loading, empty and error states (LS-009), the look (LS-010), accessibility (LS-011) and navigation (LS-012).

The rest of this document states only what is specific to the Company List.

## Scope

- Show the list of companies held in the existing company table
- Filter by company code and company name
- Read only: no company is created, changed or deleted here

---

## Business Rules

### BR-001 — Company List

- **BR-001.1 [v1.0]** Show Company List.
- **BR-001.2 [v1.0]** Only companies are listed: rows of `COMPANYM` with `COMP_TYPE` = 'C' that are not deleted (`REC_DELETED_DATE` empty). Branch rows (`COMP_TYPE` = 'B') are not listed.
- **BR-001.3 [v1.1 → v1.2]** The Code filter applies to the company code and the Name filter to the company name, matched as LS-002.4 says (contains, ignoring letter case, blank does not restrict, both must match, `%` and `_` are ordinary characters).
- **BR-001.4 [v1.1]** Companies are ordered by name ascending, then by their identifier, so that no company is repeated or skipped between pages. This is the order shown until the user chooses a sort (LS-005.3).
- **BR-001.5 [v1.2]** The menu entry and the Dashboard quick link are named "Company List" (LS-012.1).

**Scenarios**

- **BR-001.S1 [v1.0]**
WHEN the table holds 4 companies and 26 branches
THEN the list shows the 4 companies.
- **BR-001.S2 [v1.1]**
WHEN the user searches for Code "c"
THEN only companies whose code contains "c" or "C" are listed, and the total counts only those.
- **BR-001.S3 [v1.1]**
WHEN the user searches for Name "100%"
THEN only companies whose name contains the text "100%" are listed ("%" is not a wildcard).

---

## Data Model

### Table : COMPANYM

**Purpose:** The existing company table. It also holds branches. The Company List reads it only; it is not created, changed or deleted by this screen.

| Ver | Column | Type | Used for |
|-----|----|---|------|
| 1.0 → 1.1 | COMP_PKID | NVARCHAR2(40) | Identifier (text, not shown) |
| 1.1 | COMP_TYPE | CHAR(1) | `C` company, `B` branch; only `C` is listed |
| 1.0 → 1.1 | COMP_CODE | NVARCHAR2(10) | Code |
| 1.0 → 1.1 | COMP_NAME | NVARCHAR2(60) | Name |
| 1.0 → 1.1 | COMP_ADDRESS1 | NVARCHAR2(60) | Address-1 |
| 1.0 → 1.1 | COMP_ADDRESS2 | NVARCHAR2(60) | Address-2 |
| 1.0 → 1.1 | COMP_ADDRESS3 | NVARCHAR2(60) | Address-3 |
| 1.0 → 1.1 | COMP_TEL | NVARCHAR2(60) | Tel |
| 1.0 → 1.1 | COMP_EMAIL | NVARCHAR2(60) | Email |
| 1.0 → 1.1 | COMP_WEB | NVARCHAR2(60) | Web |
| 1.1 | REC_DELETED_DATE | DATE | A company with a deletion date is not listed |

The column types in version 1.0 (VARCHAR) were corrected to the real table. The table has other columns that this screen does not use.

---

## User Interface

### Company List

Displays the existing companies one page at a time. The layout, the Search button, the Wrap text toggle, the footer and the row behaviour are those of the common list screen (`LS-001` – `LS-009`); this section lists what is specific to the Company List.

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
| 1.0 | Code | TextBox |  |  |
| 1.0 | Name | TextBox |  |  |

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

**Default Sort:** Company Name ascending (BR-001.4). Sorting a column reorders the shown page only (LS-005).

#### Pagination

As the common list screen: the default page size and the available page sizes are those of LS-003 and LS-004. [v1.0 → v1.2]

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
