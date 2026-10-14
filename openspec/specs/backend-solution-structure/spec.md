# backend-solution-structure Specification

## Purpose

Defines the backend solution layout, project responsibilities and dependency boundaries so business modules can be added incrementally without restructuring.

## Requirements

### Requirement: Backend solution layout
The system SHALL provide a .NET 9 solution inside a top-level `backend/` folder containing the projects Api, Data, Entities, Shared, SharedBusiness, ModuleTemplate and Tests, plus one project per business module added to the system (currently Reports), and the solution SHALL build without errors.

#### Scenario: Clean build
- **WHEN** the solution is built from a clean checkout
- **THEN** the build succeeds and all eight projects (the seven foundation projects and Reports) are part of the solution

### Requirement: Shared build settings
The solution SHALL define shared build settings and centralized package versions so that individual projects do not declare their own package versions.

#### Scenario: Package version declared once
- **WHEN** a package is referenced by multiple projects
- **THEN** its version is defined in one central location

### Requirement: Module as class library
Each business module SHALL be a separate class library organized by feature, and SHALL expose its own dependency registration.

#### Scenario: Module registers itself
- **WHEN** the Api host starts
- **THEN** each module's services and repositories are registered through that module's registration entry point

### Requirement: Enforced dependency rules
The solution SHALL enforce its project dependency rules through automated tests: Entities depends on no other project; Shared depends on no other project; Data depends only on Entities; modules do not depend on Api or on each other; Api is the only project that references all modules.

#### Scenario: Forbidden reference introduced
- **WHEN** a module project references the Api project or another module
- **THEN** the architecture test fails

### Requirement: Adding a module
A new module SHALL be addable by creating a new class library, its registration entry point and a single registration call in Api, without changing existing modules.

#### Scenario: New module added
- **WHEN** a developer adds a module following the documented steps
- **THEN** no existing module project requires modification

### Requirement: Flat project layout
All projects, including each business module, SHALL be direct child folders of `backend/`, with no intermediate `src/` or `tests/` folder.

#### Scenario: Project folders
- **WHEN** the contents of `backend/` are listed
- **THEN** each project folder (Api, Data, Entities, Shared, SharedBusiness, ModuleTemplate, Reports, Tests) is a direct child and no `src/` or `tests/` folder exists

### Requirement: Project naming prefix
Projects, assemblies and root namespaces SHALL use the prefix `iErp` (for example `iErp.Api`), and the solution file SHALL be named `iErp.sln`.

#### Scenario: No legacy prefix
- **WHEN** project files, namespaces and the solution are searched for the previous prefix `Cargomar`
- **THEN** no occurrence is found
