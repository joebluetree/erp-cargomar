# Spec Delta

## MODIFIED Requirements

### Requirement: Backend solution layout
The system SHALL provide a .NET 9 solution inside a top-level `backend/` folder containing the projects Api, Data, Entities, Shared, SharedBusiness, ModuleTemplate and Tests, plus one project per business module added to the system (currently Reports), and the solution SHALL build without errors.

#### Scenario: Clean build
- **WHEN** the solution is built from a clean checkout
- **THEN** the build succeeds and all eight projects (the seven foundation projects and Reports) are part of the solution

### Requirement: Flat project layout
All projects, including each business module, SHALL be direct child folders of `backend/`, with no intermediate `src/` or `tests/` folder.

#### Scenario: Project folders
- **WHEN** the contents of `backend/` are listed
- **THEN** each project folder (Api, Data, Entities, Shared, SharedBusiness, ModuleTemplate, Reports, Tests) is a direct child and no `src/` or `tests/` folder exists
