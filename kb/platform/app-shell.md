# Business Requirement Specification
## ERP Application Shell

| Field | Value |
|---|---|
| **Capability** | `app-shell` |
| **Current Version** | 1.3 |
| **Status** | Approved |
| **Owner** | joyi john |
| **Last Updated** | 2026-10-08 |

## Document Use

This document is the business source of truth for the Application Shell.

It defines the layout that wraps every screen of the Angular frontend, the navigation menu, and the Dashboard landing page. It builds on the Frontend Foundation (`kb/platform/frontend.md`) and follows its conventions.

**Tracking changes:**

- Rules use `FR-<group>.<n> [v<version>]`, e.g. `FR-004.2 [v1.2]`.
- Scenarios use `FR-<group>.S<n> [v<version>]`, e.g. `FR-004.S2 [v1.2]`.
- A modified rule or scenario keeps its ID and shows both versions, e.g. `[v1.0 → v1.3]`.
- A removed rule or scenario is deleted here and recorded in Change History. Its ID is never reused.
- Every change is listed in Change History as ADDED, MODIFIED, or REMOVED.

---

## Change History

### v1.0 — Initial Application Shell   [Status: Proposed]

- **Date:** 2026-10-07
- **Change Ref:** `app-shell`
- **Affects:** FR-001 – FR-009

**Changes:**

- ADDED Application shell layout (header, sidebar, content area).
- ADDED Navigation menu driven by a static list.
- ADDED Responsive sidebar behavior.
- ADDED Dashboard landing page with Todo summary and quick links.
- ADDED Replacement of the Home page by the Dashboard.
- ADDED Dashboard exception to the cross-feature import rule.
- ADDED Tests and architecture documentation update.

---

### v1.1 — Light and dark theme   [Status: Implemented]

- **Date:** 2026-10-08
- **Change Ref:** `app-shell`
- **Affects:** FR-001, FR-010

**Changes:**

- MODIFIED FR-001: the header contains a theme switch.
- ADDED FR-010: light and dark theme with a header switch.
- Theme switching removed from Out of Scope.

---

### v1.2 — Softer dark-mode text   [Status: Implemented]

- **Date:** 2026-10-08
- **Change Ref:** `app-shell`
- **Affects:** FR-010

**Changes:**

- MODIFIED FR-010: dark-mode text is softened instead of near-white.

---

### v1.3 — Remove the Todo dependency   [Status: Proposed]

- **Date:** 2026-10-08
- **Change Ref:** `app-shell`
- **Affects:** FR-002, FR-004, FR-005, FR-006 (removed)

**Changes:**

- MODIFIED FR-002: the menu starts with the Dashboard only.
- MODIFIED FR-004: the Dashboard is a landing page with welcome text and quick links; Todo counts removed.
- MODIFIED FR-005: reference to existing Todo routes removed.
- REMOVED FR-006 (Dashboard Data Access Rule): the Dashboard no longer reads Todo data. The ID is not reused.

---

## Purpose

Give the ERP frontend one consistent frame: a header, a sidebar menu, and a content area in which every feature page is displayed, plus a Dashboard as the landing page.

The shell shall make it easy to add future ERP modules (Masters, Inventory, Accounts, Operations, HR, Administration) by adding one menu entry and one route, without changing the shell's structure.

## Scope

The Application Shell shall include:

1. A layout with header, sidebar, and content area.
2. A navigation menu with an entry for the Dashboard.
3. A menu defined as a static typed list that features extend.
4. Responsive sidebar behavior.
5. A Dashboard as the landing page, with welcome text and quick links.
6. Removal of the Home page; the Dashboard replaces it.
7. (Removed in v1.3.)
8. Tests for the shell, menu, and Dashboard.
9. Light and dark theme with a header switch.
10. Update of `kb/architecture/frontend.md`.

## Functional Requirements

### FR-001 [v1.0 → v1.1] — Shell Layout

- The application shall display a header, a sidebar, and a content area on every page.
- The header shall show the application name (iErp) and, on small screens, a button that opens the sidebar.
- The content area shall display the current page (route).
- Feature pages shall not provide their own page frame; the shell supplies the page width and padding.
- Notifications and confirmation dialogs shall remain available on every page, independent of the shell.
- The header shall contain the theme switch described in FR-010.
- The header shall not contain a user menu until authentication exists. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)

### FR-002 [v1.0 → v1.3] — Navigation Menu

- The sidebar shall list the application's navigation entries, each with a label, an icon, and a destination.
- The initial entry shall be Dashboard; each future module adds its own entry.
- The menu shall be defined as a single static typed list. Adding an ERP module's entry shall require adding one item to that list and the module's route.
- The entry for the current page shall be visibly highlighted.
- Choosing an entry shall navigate to its destination.
- Entries shall not be hidden or shown based on permissions in this version.

### FR-003 [v1.0] — Responsive Behavior

- At a width of 768 pixels or more, the sidebar shall be visible beside the content.
- Below 768 pixels, the sidebar shall be hidden, and the header button shall open it as an overlay over the content.
- Choosing a menu entry in the overlay shall close it.
- The overlay shall also be closable without choosing an entry.
- Collapsing the sidebar to icons on desktop is not required in this version.

### FR-004 [v1.0 → v1.3] — Dashboard

- The Dashboard shall be the landing page at the application root.
- The Dashboard shall show a heading and a short welcome text.
- The Dashboard shall show quick links to the available features, built from the navigation menu list and excluding the Dashboard itself. While there are none, the quick-links section shall not be shown.
- The Dashboard shall not show charts, recent-activity lists, or counts, and shall not call the backend.

### FR-005 [v1.0 → v1.3] — Routing and Home Page

- The Dashboard shall replace the Home page. The Home page and its route shall be removed.
- All feature routes shall be displayed inside the shell.
- Unknown paths shall redirect to the Dashboard.
- Route guards shall not be introduced. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)

### FR-007 [v1.0] — Testing

- Tests shall cover the menu list: initial entries, labels, and destinations.
- Tests shall cover the shell: it shows the menu and renders the routed page.
- Tests shall cover responsive behavior: the overlay opens from the header button, closes after choosing an entry, and closes without choosing one.
- Tests shall cover the Dashboard: counts, the loading state, the load-failure message, and quick links.
- Existing frontend tests shall continue to pass.

### FR-008 [v1.0] — Architecture Documentation

- `kb/architecture/frontend.md` shall be updated to describe the implemented shell, menu list, responsive behavior, Dashboard, the Dashboard exception, and how a new module adds its menu entry.
- The Home page shall no longer be described.
- The document shall describe the implemented architecture only.

### FR-010 [v1.1 → v1.2] — Light and Dark Theme

- The application shall provide a light theme and a dark theme.
- The header shall contain an icon button that switches between light and dark.
- The icon shall show the theme the user will switch to (a moon in light mode, a sun in dark mode).
- The button shall have an accessible name that states the action ("Switch to dark theme" or "Switch to light theme").
- On the first visit, the application shall use the operating system's preferred color scheme.
- The user's choice shall be remembered in the browser and used on later visits. If the browser does not allow storing it, the switch shall still work for the current visit.
- The correct theme shall be shown from the first paint, without a flash of the other theme.
- All screens and components (tables, forms, cards, dialogs, menu, sheet, notifications) shall follow the selected theme.
- In the dark theme, normal text shall be a softened light gray, not near-white, and shall keep a contrast ratio of at least 4.5:1 against the dark backgrounds. Secondary text shall stay dimmer than normal text.
- The theme shall not depend on a user account or a backend call.

### FR-009 [v1.0] — Project Location

- The shell and Dashboard shall be added to the existing Angular project in the `frontend` folder.
- No new project, library, or state-management package shall be added.
- The backend shall not be changed.

## Non-Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| NFR-001 | Simplicity | Avoid new libraries and abstractions; use Spartan UI components directly |
| NFR-002 | Extensibility | Adding a module's menu entry shall touch only the menu list and the routes |
| NFR-003 | Consistency | Follow the frontend foundation's structure, naming, and testing conventions |
| NFR-004 | Accessibility | Menu and header button shall be keyboard operable and have accessible labels |
| NFR-005 | Build Quality | The application shall build and all tests shall pass |
| NFR-006 | Performance | The shell shall be part of the initial download; feature code shall remain lazy-loaded |

## Out of Scope — Future PRDs

1. Authentication, authorization, and a user menu. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
2. Route guards and menu entries driven by permissions. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
3. Multi-company and multi-branch selection in the header.
4. Breadcrumbs and per-page titles.
5. Collapse-to-icons sidebar on desktop.
6. Nested menu groups for ERP areas (added when the modules exist).
7. Dashboard data of any kind (counts, charts, recent activity).
8. A backend summary endpoint for Dashboard data.
9. Localization.
10. A third "follow the system" option and per-user theme preferences stored on the server.
11. The Todo feature (its own PRD).

## Acceptance Criteria

The Application Shell PRD shall be considered complete when:

- [ ] Every page is shown inside the header, sidebar, and content layout.
- [ ] The menu lists the Dashboard from one static list.
- [ ] The current page's menu entry is highlighted.
- [ ] At 768 pixels and wider the sidebar is visible; below it, the header button opens and closes it as an overlay.
- [ ] The Dashboard is the landing page and shows a heading and welcome text.
- [ ] The Dashboard sends no backend requests, and shows quick links only for menu entries beyond itself.
- [ ] The Home page is removed and unknown paths redirect to the Dashboard.
- [ ] The header switch changes between light and dark, and the choice is remembered.
- [ ] On a first visit the operating system's preference is used, with no flash of the other theme.
- [ ] Every screen and component is readable in both themes.
- [ ] Dark-mode text is softened (not near-white) and keeps at least 4.5:1 contrast.
- [ ] No user menu, guards, breadcrumbs, or new libraries were added. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
- [ ] Shell, menu, and Dashboard tests pass, and existing tests still pass.
- [ ] The application builds without errors.
- [ ] `kb/architecture/frontend.md` is updated and reflects the implemented shell.

## Expected Deliverables

1. Shell layout with header and sidebar.
2. Static navigation menu list with the Dashboard entry
3. Responsive sidebar behavior.
4. Dashboard with welcome text and quick links.
5. Updated routes with the Home page removed.
6. Tests for the shell, menu, and Dashboard.
7. Updated `kb/architecture/frontend.md`.
8. Working build and local application.

## Implementation Strategy

Add the shell to the existing frontend without disturbing existing features.

Keep the menu a plain list so that future modules extend it with one entry each.

Do not add authentication, guards, breadcrumbs, or other future capabilities until their requirements are defined. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
