# Business Requirement Specification
## Notification Bar

| Field | Value |
|---|---|
| **Domain** | Admin |
| **Capability** | Notification Bar |
| **Current Version** | 1.0 |
| **Status** | Approved |
| **Owner** | Sourav V |
| **Last Updated** | 2026-10-29 |

## Document Use

This document is the business source of truth for Scrolling notification bar. It
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

This menu allows a user to view Notification or announcement as a scrolling bar. When this notification bar is clicked its more detail content(details) will be shown in another screen.


## Change History

### v1.0 — Initial Notification Bar   [Status: Proposed]

- **Date:** 2026-10-29
- **Change Ref:** `admin-notify-bar`
- **Affects:** BR-001

**Changes:**

<!-- - ADDED Holiday List menu entry in the sidebar (also shown as a Dashboard quick link).
- ADDED Holiday List screen: the logged-in user's own holiday list, view only. -->

---


## Scope

- View headings of a notification as a scrolling bar on dashboard
- When the notification bar is clicked a detail content of that heading open in new screen.
- latest created and entered(id) heading is displayed on notification bar

<!-- **Out of scope (later changes):**

- A list of all braches with their ow holiday list, and search.
- Viewing another branches holiday list.
- Showing list like reason and date inside a box like in profile -->

---

## Business Rules

### BR-001 — Scrolling Notification Bar

- **BR-001.1 [v1.0]** A user SHALL see heading in scrolling notification bar.
- **BR-001.2 [v1.0]** The user SHALL open content detail screen when clicked on this notification bar.
- **BR-001.3 [v1.0]** The latest heading is displayed on notification scroll bar.

**Scenarios**

- **BR-001.S1 [v1.0]** WHEN a user click the heading text any where in notification bar
THEN a screen with box container opens with content detail of that heading.
- **BR-001.S2 [v1.0]** Heading with Latest id and created date is always shown
- **BR-001.S3 [v1.0]** Content is shown inside a box container like holiday list, profile screens

---

## Data Model

### Heading Table (geninfo)

**Purpose:** stores all details of notification or announcement, for displaying.

**Basic Info**

| Ver | Column | Description |
|---|---|---|
| 1.0 | ID | Internal id of geninfo |
| 1.0 | HEADING | Shows simple heading for displaying in notification bar |
| 1.0 | CONTENT | Shows detail notification, used in display screen |
| 1.0 | REC_CREATED_DATE | info created date |

---

## User Interface

### Scrolling Notification Bar

- A red Scrolling Notification bar with heading moving from right to left.
- The bar is displayed just above header navigation bar.
- This bar is clickable which opens a screen in content are with box container displaying corresponding content in it.

### Content Display Screen

- A box container like holiday list is shown with a fixed 1/4 th width of content screen and height varies according to content height
- Header title is Notification

#### Actions

**Record Actions:**

| Ver | Action | Shown when |
|---|---|---|
| 1.0 | View | Always |
| 1.0 | Click | Always |

---
