# Business Requirement Specification
## Holiday List

| Field | Value |
|---|---|
| **Domain** | Admin |
| **Capability** | Hoiday List |
| **Current Version** | 1.0 |
| **Status** | Approved |
| **Owner** | Sourav V |
| **Last Updated** | 2026-10-17 |

## Document Use

This document is the business source of truth for branch holiday list. It
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

This menu allows a user to view their own branch holiday-list, including holiday reason and date from a txt file.
Users can view only their own Holiday list(branch's). When the **Holiday List** menu is selected (clicked), it directly opens the currently logged-in user's holiday list(using company and branch logined).



## Change History

### v1.0 — Initial Holiday List   [Status: Proposed]

- **Date:** 2026-10-15
- **Change Ref:** `admin-holiday-list`
- **Affects:** BR-001, BR-002, holiday display screen, main menu

**Changes:**

- ADDED Holiday List menu entry in the sidebar (also shown as a Dashboard quick link).
- ADDED Holiday List screen: the logged-in user's own holiday list, view only.

---


## Scope

- View the logged-in user's(based on company and branch) own holiday list (view only).

**Out of scope (later changes):**

- A list of all braches with their ow holiday list, and search.
- Viewing another branches holiday list.
- Showing list like reason and date inside a box like in profile

---

## Business Rules

### BR-001 — Holiday List

- **BR-001.1 [v1.0]** A user SHALL see only their own branch's holiday list.
- **BR-001.2 [v1.0]** The user SHALL open their Holiday List directly from the **Holiday List** menu, without a list or search step.
- **BR-001.3 [v1.0]** The holiday list SHALL be view only.
- **BR-001.4 [v1.0]** Every field of the data model SHALL be shown in full. A field without a value shows a dash (—).

**Scenarios**

- **BR-001.S1 [v1.0]** WHEN a logged-in user chooses Holiday List in the menu
  THEN their own (company & branch) holiday list is shown.
- **BR-001.S2 [v1.0]** WHEN the user select holday list menu
  THEN .txt file from path(in app settings) is taken based on naming rule.
- **BR-001.S3 [v1.0]** WHEN .txt file of corresponding branch not found
  THEN show "Holiday List Not Found".

<!-- ---

## Data Model

### Employee Master Table (EMPM)

**Purpose:** stores all details of an employee. Existing table; read only.


--- -->

## User Interface

### Holiday List

- Opened from the **Holiday List** entry of the main menu (sidebar and the slide-in menu on narrow screens). Like every menu entry, it is also a Dashboard quick link.
- Shows only the logged-in user's holiday list (branch under company). View only: no inputs and no edit, save or delete actions.
- Refer to the UI template [Holiday-list](../../ui-templates/admin/emp-profile-basic-info.JPG), like this add a single box and show holiday reson on left and date on right (both alligned to left).
<!-- - Uses the full content area width. -->
- on top show header or title Holiday List and below show holiday list as per the .txt file

#### Actions

**Record Actions:**

| Ver | Action | Shown when |
|---|---|---|
| 1.0 | View | Always |

---

## Permissions

| Action | Roles |
|---|---|
| View (own profile) | ALL |
