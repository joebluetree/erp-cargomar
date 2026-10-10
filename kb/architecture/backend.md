# Backend Architecture

Implements the PRD in `kb/platform/backend.md`. Code lives in `backend/`. Setup commands are in `backend/README.md`.

## Overview

A modular monolith on ASP.NET Core (.NET 9) with Oracle and EF Core. One deployable (`iErp.Api`) hosts business modules that are separate class libraries. All modules share one `AppDbContext`.

Request flow:

```
Controller -> Service -> Repository -> AppDbContext
                  \-> IUnitOfWork (save / transaction)
```

## Solution structure

```
backend/
  iErp.sln
  Directory.Build.props      net9.0, nullable, warnings as errors
  Directory.Packages.props   central package versions
  iErp.Api                   host: Program, middleware, config
  iErp.Data                  AppDbContext, entity configurations, migrations, repository base, unit of work
  iErp.Entities              entities only
  iErp.Shared                technical helpers (NotFoundException, problem-details factory, paging types)
  iErp.SharedBusiness        reusable business functionality (empty for now)
  iErp.ModuleTemplate        module skeleton (registration entry point, no feature yet)
  iErp.Reports               Reports module (Company List report)
  iErp.Tests                 unit, integration, architecture tests
```

All projects sit directly under `backend/` (no `src/` or `tests/` folders) and use the `iErp` prefix.

## Dependency rules

| Project | May reference |
|---|---|
| Entities | nothing |
| Shared | nothing |
| Data | Entities |
| SharedBusiness | Entities, Shared |
| Modules | Entities, Data, Shared, SharedBusiness |
| Api | Data, Shared, every module |

Modules never reference Api or each other. These rules are enforced by `Architecture/DependencyRuleTests.cs`. Controllers must not depend on `iErp.Data`.

## Modules and features

A module is grouped by feature folder. `ModuleTemplate` is an empty skeleton: it has no feature, only the registration entry point, and is the shape to copy for a new module. `iErp.Reports` is the first real module; its only feature so far is `CompanyList/` (controller, service, repository, DTO).

Each module exposes one registration method (`AddModuleTemplate`, `AddReports`), which registers its FluentValidation validators from the module assembly and is where services and repositories are registered. `Program.cs` calls it and adds the module assembly as an MVC application part so its controllers are routed.

## Patterns

The building blocks below exist in code (`Repository<T>`, `IUnitOfWork`, the exception handler, the validation filter). The Company List is read-only, so it uses the controller, service and repository layers, the exception handler and the DTO mapping, but not `IUnitOfWork` or `Repository<T>` (see "Legacy tables"). The write path is proved by the first feature that saves data.

**Controller.** Binds the request, calls one service method, maps the result to a status code. No validation or business code.

**Service.** Business rules. Throws `NotFoundException` for missing resources and saves through `IUnitOfWork`.

**Repository.** Derives from `Repository<T>` (`GetByIdAsync`, `ListAsync`, `Add`, `Remove`). Repositories stage changes and never call `SaveChanges`.

**Unit of work.** `IUnitOfWork.SaveChangesAsync` commits staged changes in one database transaction. `ExecuteInTransactionAsync` wraps several operations in an explicit transaction and rolls back on error.

**Mapping.** DTO to entity is manual. No mapping library.

## API

Business endpoints live under `/api/<area>/...`. Today: `GET /api/reports/companies?code=&name=&page=&pageSize=` returns one page of companies (not branches, not deleted rows) ordered by name, filtered by the backend (see "Filtering and paging"). Controllers return RFC 7807 problem details for errors (see Validation and exception handling). Swagger UI is at `/swagger` in every environment except Production.

## Filtering and paging (every table)

Tables are filtered and paged by the backend, never by the browser, whatever their size. The requirements behind this (LS-002 and LS-003) are in `kb/platform/list-screen.md`.

- **Request.** Query parameters: the table's filters, a one-based `page` (default 1) and a `pageSize` (default 10; 2, 5, 10, 25, 50 or 100, `PagingRules.AllowedPageSizes`). The query is a class with those properties bound with `[FromQuery]`, and a FluentValidation validator rejects `page` < 1, a size outside the list and overlong filter text with the usual grouped 400. A page after the last is not an error: it returns no items and the correct total.
- **Response.** `PagedResult<T>` (`iErp.Shared/Paging`): `items`, `total` (rows matching the filters), `page`, `pageSize`.
- **Query.** Filters are applied in the database (text filters are case-insensitive "contains": `ToUpper().Contains(...)`, which Oracle translates to `INSTR`, so `%` and `_` are ordinary characters). The ordering must end in a unique key (for the Company List: name, then id) so pages never overlap or skip rows. `ToPageAsync(page, pageSize)` (`iErp.Data`, on `IQueryable<T>`) runs the count and, when the page can have rows, the page, and returns the rows and the total; the module maps them to a `PagedResult`. `iErp.Data` cannot reference Shared, so the helper takes plain ints and the module builds the result.
- **Oracle 10.2.** EF's `Skip`/`Take` becomes `OFFSET :p ROWS FETCH NEXT :p ROWS ONLY` (the values are bind parameters, and equal values share one bind), which 10.2 does not have. The interceptor rewrites a trailing clause of that form (bind names or numbers) to `SELECT * FROM (SELECT "t".*, ROWNUM "RN__" FROM (<query>) "t" WHERE ROWNUM <= a + b) WHERE "RN__" > a`. The extra last column is ignored by EF, which reads by ordinal. This was checked against the dev 10.2 database.
- **Sorting** is not part of the contract yet: the backend order is fixed (the Company List page can reorder the rows of the shown page in the browser). Server-side sorting would add `sort` and `direction` to the contract.

## Database integration

- Oracle through `Oracle.EntityFrameworkCore` 9.x (matches EF Core 9).
- Entity mappings are Fluent API classes in `iErp.Data/Configurations`, discovered by `AppDbContext`.
- The target database is Oracle 10.2, which the provider does not officially support. `Oracle10gCompatibilityInterceptor` (registered in `AddData` and the design-time factory) normalizes line endings in provider-generated PL/SQL to LF rewrites `FETCH FIRST n ROWS ONLY` to a `ROWNUM` wrapper, and rewrites `OFFSET a ROWS FETCH NEXT b ROWS ONLY` (paging) to a nested `ROWNUM` query (see "Filtering and paging"). New features must be verified against 10g.
- Table and column names are explicit and upper-case (for example `ORDERS`, `IS_ACTIVE`).
- Guid keys map to `RAW(16)` and are generated in code. Booleans map to `NUMBER(1)` so the schema also works on Oracle versions before 23ai.
- Legacy tables: a table that already exists and is owned elsewhere is mapped with `ToTable("NAME", t => t.ExcludeFromMigrations())`, so migrations never create, alter or drop it. `COMPANYM` is the first (entity `Company`, string key `COMP_PKID`, read-only). Its string key does not fit `Repository<T>` (Guid keys), so `CompanyListRepository` depends on `AppDbContext` directly and exposes only reads. `COMPANYM` also holds branches (`COMP_TYPE` `B`); the report filters to companies (`C`) that are not soft-deleted (`REC_DELETED_DATE` null). Queries that need no paging or row limit work on 10g unchanged.
- Connection string: `ConnectionStrings:Default`, from (lowest to highest priority) `appsettings*.json`, the optional Git-ignored `appsettings.{Environment}.local.json` (copy `appsettings.Development.local.example.json`), user secrets, and the `ConnectionStrings__Default` environment variable, which always wins. Startup fails with a clear message when it is missing. No secrets are committed.
- Migrations live in `iErp.Data/Migrations`. A design-time factory lets `dotnet ef` generate migrations without a database.

## Validation and exception handling

- `ValidationFilter` runs the FluentValidation validator for each action argument and returns 400 with `ValidationProblemDetails` (errors grouped by field).
- `GlobalExceptionHandler` maps `NotFoundException` to 404 and everything else to a generic 500. All errors are RFC 7807 problem details with a `traceId`. Exception details are logged, never returned.

## Logging and configuration

Serilog (console sink) configured from `appsettings`, plus request logging. `appsettings.{Development,Testing,Production}.json` override the base file.

## Testing

xUnit, in `iErp.Tests`:

- `Unit/`: the Oracle 10g compatibility interceptor (including the paging rewrite) and the paging helper and rules. No database.
- `Integration/PipelineTests`: the real HTTP pipeline through test-only endpoints (`TestSupport/TestEndpointsController`, never part of the shipped API): 404 problem details, 500 without internal details, 400 with errors grouped by field, Swagger. No database.
- `Reports/`: Company List service mapping (null to empty string, order kept, paged result, query passed through) and the query validator (page, page size, filter length).
- `Integration/CompaniesEndpointTests`: `GET /api/reports/companies` through the real pipeline with a fake repository (200 shape with `items`/`total`/`page`/`pageSize`, defaults, filters and paging passed on, 400 for bad paging values and overlong filters, empty and past-the-end pages, 405 for other methods, 500 without internals). No database.
- `Integration/OracleConnectivityTests` and `Integration/CompanyTableTests`: connect to Oracle. Skipped unless `IERP_TEST_ORACLE` holds a connection string for a test schema. `CompanyTableTests` creates a `COMPANYM`-shaped table only if the schema has none (and drops it afterwards); if the table exists it only reads it. Either way it pages through every row (several page sizes, no overlap or gaps, same order as the unpaged list, empty page after the last), which proves the paging rewrite on the target Oracle version.
- `Architecture/`: dependency rules (checked for every module), plus a check that the Api and module assemblies do not use test code.

## Adding a module

1. Create `iErp.<Name>` directly under `backend/` referencing only the projects allowed in the table above, and add it to `iErp.sln`.
2. Add entities to `iErp.Entities`, their configuration to `iErp.Data/Configurations`, then a migration.
3. Add `Add<Name>(IServiceCollection)` that registers its services, repositories and validators.
4. In `iErp.Api`: reference the project, call the registration method, and add its assembly as an application part.
5. Add unit tests and extend the architecture tests if the module introduces new rules.

## Adding a feature to a module

Create a feature folder with controller, service, repository, DTOs and validator, following the conventions above. Register the service, repository and validator in the module's registration method.
