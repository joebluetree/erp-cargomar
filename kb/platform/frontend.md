# Business Requirement Specification
## ERP Frontend Foundation

  Field                 Value
  --------------------- -----------------------
  **Capability**        `frontend-foundation`
  **Current Version**   1.3
  **Status**            Approved
  **Owner**             joyi john
  **Last Updated**      2026-10-07

## Document Use

This document is the business source of truth for the Frontend
Foundation.

It defines the basic Angular frontend framework for the ERP application.
Future business capabilities shall be introduced incrementally through
separate PRDs.

**Tracking changes:**

- Rules use `FR-<group>.<n> [v<version>]`, e.g. `FR-004.2 [v1.2]`.
- Scenarios use `FR-<group>.S<n> [v<version>]`, e.g. `FR-004.S2 [v1.2]`.
- A modified rule or scenario keeps its ID and shows both versions, e.g. `[v1.0 → v1.3]`.
- A removed rule or scenario is deleted here and recorded in Change History. Its ID is never reused.
- Every change is listed in Change History as ADDED, MODIFIED, or REMOVED.

------------------------------------------------------------------------

## Change History

### v1.0 --- Initial Frontend Foundation [Status: Implemented]

-   **Date:** 2026-10-07
-   **Change Ref:** `frontend-foundation`
-   **Affects:** FR-001 -- FR-015

**Changes:**

-   ADDED Angular standalone frontend foundation.
-   ADDED PrimeNG and PrimeIcons.
-   ADDED simple Home page.
-   ADDED FeatureTemplate with Todo CRUD as the reference frontend
    feature.
-   ADDED API integration foundation.
-   ADDED standard forms and PrimeNG data-table conventions.
-   ADDED Angular Signals and feature-service state convention.
-   ADDED HTTP interceptor infrastructure.
-   ADDED shared UI component convention.
-   ADDED notifications and centralized error handling.
-   ADDED basic frontend testing.
-   ADDED frontend architecture documentation requirement.

------------------------------------------------------------------------

### v1.1 --- Replace PrimeNG with Spartan UI [Status: Implemented]

-   **Date:** 2026-10-07
-   **Change Ref:** `frontend-foundation`
-   **Affects:** FR-003, FR-006, FR-008, FR-009, FR-012, FR-013, FR-015,
    NFR-005

**Changes:**

-   MODIFIED FR-003: the UI library is Spartan UI (Tailwind CSS v4,
    Spartan brain primitives, CLI-generated helm components, Lucide
    icons) instead of PrimeNG and PrimeIcons. PrimeNG 22 requires a
    PrimeUI license key; Spartan is MIT with no key.
-   MODIFIED FR-006, FR-008, FR-009, FR-012, FR-013, FR-015, NFR-005:
    references to PrimeNG components replaced by Spartan equivalents.
-   MODIFIED FR-009: Spartan's table is styling only, so pagination,
    sorting and search are implemented in the feature with signals.

------------------------------------------------------------------------

### v1.2 --- Roboto application font [Status: Implemented]

-   **Date:** 2026-10-08
-   **Change Ref:** `frontend-foundation`
-   **Affects:** FR-003

**Changes:**

-   MODIFIED FR-003: Roboto is the application font, self-hosted.

------------------------------------------------------------------------

### v1.3 --- Remove the Todo reference feature [Status: Proposed]

-   **Date:** 2026-10-08
-   **Change Ref:** `frontend-foundation`
-   **Affects:** FR-002, FR-006, FR-007, FR-008, FR-009, FR-013, FR-014,
    FR-015

**Changes:**

-   MODIFIED FR-006: the Todo reference feature is removed; FR-006 now
    defines the FeatureTemplate conventions only. The Todo feature gets
    its own PRD.
-   MODIFIED FR-002, FR-007, FR-008, FR-009, FR-013, FR-014, FR-015 and
    the acceptance criteria: references to the Todo feature removed.

------------------------------------------------------------------------

## Purpose

Establish the basic Angular frontend framework for the ERP application.

The frontend shall use standalone Angular architecture, Spartan UI, modular
feature-based organization, and shared infrastructure for API access,
errors and notifications. The first business feature, Todo, is specified
in its own PRD.

The foundation shall provide reusable architectural conventions for
future ERP features without implementing unrelated business
functionality.

## Scope

The Frontend Foundation shall include:

1.  Angular using the latest stable version.
2.  Standalone Angular architecture.
3.  TypeScript strict mode.
4.  Angular Router.
5.  Spartan UI (Tailwind CSS) and Lucide icons.
6.  Simple Home page.
7.  Modular and feature-based organization.
8.  `FeatureTemplate` conventions (documented guidance).
9.  Backend API integration.
10. Standard form conventions.
11. Data-table conventions (Spartan table).
12. Angular Signals and feature-level service state conventions.
13. Basic HTTP interceptor infrastructure.
14. Shared UI component conventions.
15. Spartan notifications (Sonner toasts).
16. Centralized frontend error handling.
17. Basic frontend testing.
18. Frontend architecture documentation.

## Functional Requirements

### FR-001 [v1.0] --- Angular Application

-   Create a new Angular application using the latest stable Angular
    version.
-   Use standalone Angular architecture.
-   Do not use `NgModule` unless specifically required later.
-   Enable TypeScript strict mode.
-   The application shall build and run successfully.

### FR-002 [v1.0] --- Routing

-   Configure Angular Router using standalone routing.
-   The routing architecture shall support lazy-loaded features.
-   Configure a route for the Home page.
-   Do not implement navigation menus as part of this PRD.

### FR-003 [v1.0 → v1.2] --- Spartan UI

-   Install Tailwind CSS v4 and Spartan UI.
-   Use Spartan packages compatible with the selected Angular version.
-   Generate the Spartan components that are used into the project
    (`shared/ui`) with the Spartan CLI.
-   Use Lucide icons through ng-icons.
-   Configure a default Spartan theme.
-   Use Spartan UI as the primary UI component library.
-   No UI-library license key shall be required.
-   Use Roboto as the application font, served with the application
    (self-hosted), not from an external host.

### FR-004 [v1.0] --- Home Page

-   Create a simple Home page.
-   The Home page shall verify that the frontend application loads
    successfully.
-   Keep the Home page minimal.
-   Do not implement a Dashboard.
-   Do not implement an Application Shell.

### FR-005 [v1.0] --- Modular and Feature-Based Architecture

-   Organize business functionality by feature.
-   The architecture shall support future ERP areas such as Masters,
    Inventory, Accounts, Operations, HR, and Administration.
-   Business features shall be added only when required.
-   Future features should follow the conventions demonstrated by
    `FeatureTemplate`.
-   Avoid unnecessary abstractions and dependencies.

### FR-006 [v1.0 → v1.3] --- FeatureTemplate Conventions

Define the conventions that future Angular business features follow.
The Todo reference feature has been removed from this PRD and will be
specified in its own PRD. No demonstration feature is implemented here.

The conventions shall describe the standard frontend implementation
for:

-   Pages.
-   Components.
-   Models.
-   Feature services.
-   Routing.
-   API integration.
-   Reactive forms.
-   Validation.
-   Spartan tables.
-   Notifications.
-   Error handling.
-   State handling.
-   Tests.

The conventions shall be documented in `kb/architecture/frontend.md`,
clearly marked as guidance until the first business feature
demonstrates them. They shall remain simple and shall not introduce
abstractions that are not required.

### FR-007 [v1.0] --- API Integration

-   Configure Angular `HttpClient`.
-   Provide configurable backend API base URL handling.
-   Do not hardcode backend URLs in feature components.
-   Feature services shall be responsible for communicating with backend
    APIs.
-   API integration conventions shall be reusable by future features.

### FR-008 [v1.0 → v1.1] --- Forms and Business Screens

-   Use Angular Reactive Forms for business data-entry forms.
-   Use Spartan form controls (input, textarea, checkbox, label) where
    appropriate.
-   Establish consistent Add and Edit behavior.
-   Display validation messages consistently.
-   Provide standard Save and Cancel behavior.
-   The reference form implementation shall be demonstrated by the first
    business feature (a separate PRD).
-   Do not create a large generic form framework.

### FR-009 [v1.0 → v1.1] --- Data Tables

-   Use the Spartan table components as the standard reference for list
    screens.
-   The standard table pattern shall be demonstrated by the first
    business feature (a separate PRD).
-   Support appropriate list actions such as Edit and Delete.
-   Support basic pagination.
-   Support basic sorting.
-   Support basic search/filtering where appropriate.
-   Provide loading and empty-state handling.
-   Avoid unnecessary table abstractions.

### FR-010 [v1.0] --- State Management

-   Use Angular Signals and feature-level services for simple frontend
    state.
-   Keep state close to the feature that owns it.
-   Do not introduce NgRx or another external state-management library.
-   Introduce a dedicated state-management library only if future
    requirements justify it.

### FR-011 [v1.0] --- HTTP Interceptors

-   Establish basic HTTP interceptor infrastructure.
-   Interceptors may handle common HTTP request and response concerns.
-   Authentication or JWT handling shall not be implemented in this PRD. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
-   Interceptors shall remain small and focused.
-   Feature-specific business logic shall not be placed in interceptors.

### FR-012 [v1.0 → v1.1] --- Shared UI Components

-   Support a `shared` area for reusable UI components.
-   Create shared components only when there is a genuine reuse
    requirement.
-   Prefer using Spartan components directly when suitable.
-   Do not create unnecessary wrappers around Spartan components.
-   Spartan components are generated into `shared/ui` and owned by the
    project; generate only the ones that are used.
-   Shared components shall not contain feature-specific business logic.

### FR-013 [v1.0 → v1.1] --- Notifications and Error Handling

-   Provide a standard notification mechanism using Spartan (Sonner).
-   Support success, informational, warning, and error feedback where
    appropriate.
-   Features shall be able to give user feedback on create, update and
    delete through the notification mechanism.
-   Provide centralized handling for common HTTP/API errors.
-   Handle backend validation errors consistently.
-   Handle network and unexpected API failures.
-   Display user-friendly error messages.
-   External error-monitoring platforms are not required at this stage.

### FR-014 [v1.0] --- Frontend Testing

-   Establish basic frontend testing conventions.
-   Provide tests for the core infrastructure (error handling and
    interceptors).
-   Test important component behavior.
-   Test feature services where appropriate.
-   Test form validation behavior.
-   Keep the initial testing approach simple.
-   Advanced end-to-end testing may be introduced later.

### FR-015 [v1.0 → v1.1] --- Frontend Architecture Documentation

An achitecue file  `frontend.md` file shall be created at `\kb\architecture` folder

The architecture document shall be created from this PRD and shall
reflect the implemented frontend architecture.

It shall document:

-   Architecture overview.
-   Angular standalone architecture.
-   Project and folder structure.
-   Modular and feature-based organization.
-   Home page.
-   FeatureTemplate conventions (marked as guidance until
    demonstrated).
-   Routing strategy.
-   Spartan UI and Tailwind configuration and usage conventions.
-   API integration approach.
-   Forms and data-table conventions.
-   State-management convention.
-   HTTP interceptor approach.
-   Shared UI component rules.
-   Notification and error-handling approach.
-   Testing approach.
-   Dependency and boundary rules.
-   Guidelines for adding new frontend features.

The architecture document shall describe implemented architecture rather
than future functionality that has not yet been implemented.

Update `frontend.md` whenever significant frontend architecture
decisions change.


### FR-016 [v1.0] — folder Nnd
 - Keep the frontend project directly under frontend folder

## Non-Functional Requirements

  -----------------------------------------------------------------------
  ID                      Requirement             Description
  ----------------------- ----------------------- -----------------------
  NFR-001                 Maintainability         Follow consistent
                                                  Angular and TypeScript
                                                  standards

  NFR-002                 Extensibility           Support adding ERP
                                                  features incrementally

  NFR-003                 Modularity              Maintain clear feature
                                                  boundaries

  NFR-004                 Simplicity              Avoid unnecessary
                                                  libraries and
                                                  abstractions

  NFR-005                 Compatibility           Spartan UI shall be
                                                  compatible with the
                                                  selected Angular
                                                  version

  NFR-006                 Build Quality           The application shall
                                                  compile without errors

  NFR-007                 Consistency             Future features shall
                                                  follow established
                                                  frontend conventions

  NFR-008                 Testability             Features shall be
                                                  structured so important
                                                  behavior can be tested

  NFR-009                 Documentation           Frontend architecture
                                                  documentation shall
                                                  reflect the implemented
                                                  design
  -----------------------------------------------------------------------

## Out of Scope --- Future PRDs

The following capabilities are excluded from this Frontend Foundation
and shall be addressed later:

1.  Application Shell.
2.  Dashboard.
3.  Navigation Menus.
4.  Authentication and Authorization. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
5.  User Management.
6.  Multi-Company and Multi-Branch.
7.  Route Guards. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
8.  Localization and Regional Settings.
9.  Advanced end-to-end testing.
10. External error monitoring.
11. CI/CD and Deployment Automation.
12. The Todo feature (its own PRD).

## Acceptance Criteria

The Frontend Foundation PRD shall be considered complete when:

-   [ ] The Angular project is created successfully.
-   [ ] Standalone Angular architecture is used.
-   [ ] TypeScript strict mode is enabled.
-   [ ] Angular Router is configured.
-   [ ] Tailwind CSS and Spartan UI are installed and configured.
-   [ ] A Spartan theme is configured.
-   [ ] A simple Home page works.
-   [ ] `FeatureTemplate` conventions are documented.
-   [ ] API base URL configuration is implemented.
-   [ ] Angular Signals and feature-service state conventions are
    documented.
-   [ ] Basic HTTP interceptor infrastructure is implemented.
-   [ ] Shared UI components are created only where justified.
-   [ ] Spartan notifications provide operation feedback.
-   [ ] Centralized API error handling works.
-   [ ] Basic frontend tests pass.
-   [ ] The application builds without errors.
-   [ ] The application runs successfully.
-   [ ] Application Shell and Dashboard are not implemented.
-   [ ] Authentication and Authorization are not implemented. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
-   [ ] `kb/architecture/frontend.md` is created and reflects the
    implemented frontend architecture.

## Expected Deliverables

1.  Angular standalone frontend project.
2.  Tailwind CSS and Spartan UI configuration.
3.  Angular Router configuration.
4.  Simple Home page.
5.  `FeatureTemplate` conventions documented.
6.  Backend API integration.
7.  Reactive form convention (documented).
8.  Spartan data-table convention (documented).
9.  Angular Signals and feature-service state convention.
10. Basic HTTP interceptor infrastructure.
11. Shared UI components where genuinely reusable.
12. Spartan notification mechanism.
13. Centralized API error handling.
14. Basic frontend tests.
15. `kb/architecture/frontend.md`.
16. Working build and local application.

## Implementation Strategy

Implement the Frontend Foundation first.

The first business feature (specified in its own Todo PRD) becomes the
reference implementation for future business features.

Keep the architecture simple and incremental.

Do not implement Application Shell, Dashboard, Authentication,
Authorization, Multi-Company, Multi-Branch, or other future capabilities
until their requirements are defined.

Subsequent frontend capabilities shall be introduced through separate
PRDs and shall follow the conventions established by this foundation.

The `kb/architecture/frontend.md` document shall be maintained as the
frontend architecture evolves.
