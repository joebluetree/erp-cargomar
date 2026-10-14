# business Requirement Specification
## ERP Backend Foundation


| Field | Value |
|---|---|
| **Capability** | `customer-master` |
| **Current Version** | 1.1 |
| **Status** | Approved |
| **Owner** | joyi john |
| **Last Updated** | 2026-10-06 |

## Document Use

This document is the business source of truth for the Backend Project. It
describes current behaviour plus any entry marked `[Status: Proposed]`.
A propose command should name the version or FR IDs to implement;
everything else here already exists.

**Tracking changes:**

- Rules use `FR-<group>.<n> [v<version>]`, e.g. `FR-004.2 [v1.2]`.
- Scenarios use `FR-<group>.S<n> [v<version>]`, e.g. `FR-004.S2 [v1.2]`.
- A modified rule or scenario keeps its ID and shows both versions, e.g. `[v1.0 → v1.3]`.
- A removed rule or scenario is deleted here and recorded in Change History. Its ID is never reused.
- Every change is listed in Change History as ADDED, MODIFIED, or REMOVED.

---
## Change History

### v1.0 — Initial Backend Foundation   [Status: Implemented]

- **Date:** 2026-10-06
- **Change Ref:** `backend-foundation`
- **Affects:** FR-001 – FR-012 

**Changes:**

- ADDED Functions Requirements  FR-001 – FR-012

---

### v1.1 — Remove the Todo reference feature   [Status: Proposed]

- **Date:** 2026-10-08
- **Change Ref:** `remove-todo-backend`
- **Affects:** FR-006, FR-011

**Changes:**

- MODIFIED FR-006: the Todo CRUD is removed; `ModuleTemplate` is an empty module skeleton. The Todo feature gets its own PRD.
- MODIFIED FR-011: tests no longer target the sample feature.

---


## Purpose

Establish the initial backend foundation for a modular ERP application using ASP.NET Core Web API, Oracle, and Entity Framework Core.

The backend must provide a clean, maintainable, extensible architecture that supports the incremental development of business modules through separate PRDs.

The initial implementation will focus on the technical foundation and one working reference CRUD feature, without implementing advanced ERP functionality.

## Scope

The initial backend foundation shall include:

1. ASP.NET Core Web API (.NET 9).
2. Oracle database with Entity Framework Core.
3. Modular Monolith architecture.
4. One shared `AppDbContext`.
5. Repository Pattern, Service Layer, and minimal Unit of Work.
6. Separate `Entities` project.
7. Feature-based module organization.
8. An empty `ModuleTemplate` module skeleton demonstrating module registration.
9. Dependency injection and module registration.
10. FluentValidation, basic exception handling, and Swagger.
11. Basic unit, integration, and architecture tests.
12. API standards and conventions.
13. Database migrations and configuration.
14. Basic structured logging and environment configuration.
15. `backend.md` documenting architectural decisions.

## Functional Requirements

### FR-001 [v1.0] — Backend Application

- The system shall provide an ASP.NET Core Web API using .NET 9.
- The application shall support RESTful HTTP endpoints.
- The application shall support asynchronous operations.
- The application shall provide OpenAPI/Swagger documentation.

### BR-002 [v1.0] — Modular Architecture

- The system shall follow a Modular Monolith architecture.
- Each business module shall be implemented as a separate class library.
- Business functionality shall be organized by module and feature.
- Modules shall register their dependencies explicitly.
- The architecture shall support adding modules without restructuring the existing solution.

### FR-003 [v1.0] — Solution Structure

The solution shall contain the following projects:

| Project | Responsibility |
|---|---|
| Api | Application entry point, middleware, configuration |
| Data | AppDbContext, EF Core configuration, migrations |
| Entities | Application entities |
| Shared | Common technical functionality |
| SharedBusiness | Reusable business functionality |
| ModuleTemplate | Reference business module |
| Tests | Unit, integration, and architecture tests |

### FR-004 [v1.0] — Database Integration

- The application shall use Oracle as its database.
- Entity Framework Core shall be used for database access.
- A single shared `AppDbContext` shall be used across all modules.
- Entity configurations shall use EF Core Fluent API.
- The system shall support database migrations.
- Primary keys shall use GUIDs with Oracle-compatible mappings.
- Database connection settings shall be configurable.

### FR-005 [v1.0] — Application Layers

The application shall follow this flow:

`Controller → Service → Repository → AppDbContext`

- Controllers shall handle HTTP requests and responses.
- Services shall implement business logic.
- Repositories shall handle database operations.
- A minimal Unit of Work shall coordinate saving changes and database transactions.
- DTO-to-Entity mapping shall be performed manually.
- Feature-specific components shall be grouped together.

### FR-006 [v1.0 → v1.1] — Reference Module

The `ModuleTemplate` project shall be an empty module skeleton that
demonstrates module registration and the feature-folder convention.
The Todo reference feature has been removed from this PRD and will be
specified in its own PRD.

The Repository, Service, and Unit of Work patterns, and the controller,
DTO, validator, entity, and database configuration conventions, shall
remain documented in `kb/architecture/backend.md` as guidance for the
first business feature.

### FR-007 [v1.0] — Validation and Error Handling

- The application shall use FluentValidation for request validation.
- Validation failures shall return appropriate HTTP responses.
- The application shall provide centralized exception handling.
- Errors shall follow a consistent response format.
- Internal exception details shall not be exposed to API consumers.

### FR-008 [v1.0] — API Standards

- APIs shall follow REST conventions.
- Appropriate HTTP status codes shall be used.
- Request and response DTOs shall be used.
- API routes and naming conventions shall be consistent.
- Swagger shall expose the available endpoints.

### FR-009 [v1.0] — Dependency Injection

- Services and repositories shall be registered through dependency injection.
- Each module shall provide its own dependency registration.
- The API project shall act as the application host.
- The architecture shall maintain clear dependency boundaries.

### FR-010 [v1.0] — Logging and Configuration

- The application shall support basic structured logging.
- Development, Testing, and Production configurations shall be supported.
- Sensitive configuration values shall not be hardcoded.
- Shared build settings and centralized package management shall be configured.

### FR-011 [v1.0] — Testing

The application shall use xUnit for automated testing.

Testing shall include:

- Unit tests for the shared infrastructure (for example validation and exception handling).
- Integration tests for the API pipeline and database connectivity.
- Architecture tests for project dependency rules.

### FR-012 [v1.0] — Architecture Documentation

An achitecue file  `backend.md` file shall be created at `\kb\architecture` folder

It shall document:

- Architecture overview.
- Solution structure.
- Project responsibilities.
- Module and feature organization.
- Dependency rules.
- Controller, Service, Repository, and Unit of Work patterns.
- Database integration.
- Validation and exception handling.
- Testing approach.
- Guidelines for adding new modules and features.

### FR-013 [v1.0] — Src folder and solution name
 - Keep all projects directly under backend folder, src subfoler not required
 - Change the project prefix Cargomar to iErp


## Non-Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| NFR-001 | Maintainability | Follow consistent architecture and coding standards |
| NFR-002 | Extensibility | Support adding modules and features incrementally |
| NFR-003 | Modularity | Maintain clear module and project boundaries |
| NFR-004 | Performance | Use asynchronous database operations and efficient queries |
| NFR-005 | Security | Protect configuration secrets and internal error details |
| NFR-006 | Testability | Support automated unit, integration, and architecture tests |
| NFR-007 | Consistency | Apply standard naming, validation, and API conventions |
| NFR-008 | Reliability | Ensure consistent database operations and transaction handling |

## Out of Scope — Future PRDs

The following capabilities are excluded from the initial implementation and will be addressed through separate PRDs.

1. Authentication and Authorization. (Superseded: login, session and guards were added by the `user-loginpage` change; see `kb/modules/admin/login-screen.md`.)
2. Multi-Company and Multi-Branch.
3. Auditing and Change Tracking.
4. Soft Delete and Concurrency Management.
5. Document Numbering.
6. Financial Year and Accounting Period Management.
7. Application Settings.
8. Background Jobs and Scheduling.
9. Advanced Logging and Monitoring.
10. File Management.
11. Bulk Operations.
12. Caching.
13. Approval Workflows.
14. API Versioning.
15. Advanced Searching, Filtering, Sorting, and Pagination.
16. CI/CD and Deployment Automation.
17. Advanced Security.
18. Localization and Regional Settings.
19. Module and Feature Scaffolding.
20. Performance Optimization.

## Acceptance Criteria

The Backend Foundation PRD shall be considered complete when:

- [ ] The .NET 9 solution builds successfully.
- [ ] All required projects are created.
- [ ] The Modular Monolith structure is established.
- [ ] Oracle database connectivity works.
- [ ] The shared `AppDbContext` is operational.
- [ ] Repository, Service, and Unit of Work patterns are implemented.
- [ ] The Repository, Service, and Unit of Work patterns are documented for the first business feature.
- [ ] Request validation works using FluentValidation.
- [ ] Centralized exception handling returns consistent errors.
- [ ] Swagger UI is available and lists endpoints as features add them.
- [ ] Dependency injection and module registration work.
- [ ] Basic logging and environment configuration work.
- [ ] Unit and integration tests pass.
- [ ] Architecture tests verify dependency rules.
- [ ] `backend.md` is created and reflects the implemented design.

## Expected Deliverables

1. Complete ASP.NET Core Web API solution.
2. Oracle EF Core integration and database configuration.
3. `ModuleTemplate` skeleton demonstrating module registration.
4. Basic automated tests.
5. Swagger/OpenAPI documentation.
6. `backend.md`.
7. Project configuration and development setup instructions.

## Implementation Strategy

The Backend Foundation shall be implemented first.

Subsequent capabilities shall be introduced through separate PRDs.

Each future implementation shall follow the established architecture and extend existing functionality without introducing unnecessary dependencies or restructuring the solution.
