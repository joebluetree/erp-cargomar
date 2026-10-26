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
  iErp.Api                   host: Program, middleware, authentication setup, config
  iErp.Data                  AppDbContext, entity configurations, repository base, unit of work
  iErp.Entities              entities only
  iErp.Shared                technical helpers (NotFoundException, problem-details factory, paging types, Auth: JwtOptions, claim names, ICurrentSession)
  iErp.SharedBusiness        reusable business functionality (empty for now)
  iErp.ModuleTemplate        module skeleton (registration entry point, no feature yet)
  iErp.Reports               Reports module (Company List report)
  iErp.Admin                 Admin module (Login)
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

A module is grouped by feature folder. `ModuleTemplate` is an empty skeleton: it has no feature, only the registration entry point, and is the shape to copy for a new module. `iErp.Reports` is the first real module; its only feature so far is `CompanyList/` (controller, service, repository, DTO). `iErp.Admin` holds `Login/` (controller, service, repository, request validator, DTOs, result type).

Each module exposes one registration method (`AddModuleTemplate`, `AddReports`, `AddAdmin`), which registers its FluentValidation validators from the module assembly and is where services and repositories are registered. `Program.cs` calls it and adds the module assembly as an MVC application part so its controllers are routed.

## Patterns

The building blocks below exist in code (`Repository<T>`, `IUnitOfWork`, the exception handler, the validation filter). The Company List is read-only, so it uses the controller, service and repository layers, the exception handler and the DTO mapping, but not `IUnitOfWork` or `Repository<T>` (see "Legacy tables"). The write path is proved by the first feature that saves data.

**Controller.** Binds the request, calls one service method, maps the result to a status code. No validation or business code. An expected outcome that is not a success (for example a refused login) is returned by the service as a result value and mapped to a problem-details status by the controller; exceptions are for the unexpected.

**Service.** Business rules. Throws `NotFoundException` for missing resources and saves through `IUnitOfWork`.

**Repository.** Derives from `Repository<T>` (`GetByIdAsync`, `ListAsync`, `Add`, `Remove`). Repositories stage changes and never call `SaveChanges`.

**Unit of work.** `IUnitOfWork.SaveChangesAsync` commits staged changes in one database transaction. `ExecuteInTransactionAsync` wraps several operations in an explicit transaction and rolls back on error.

**Mapping.** DTO to entity is manual. No mapping library.

## API

Business endpoints live under `/api/<area>/...`. Today:

- `POST /api/admin/login` checks a user code, password and company code and returns an access token and the session details (see "Authentication").
- `GET /api/admin/session/options` and `POST /api/admin/session/change` list and switch the logged-in session's branch and financial year (see "Authentication").
- `GET /api/reports/companies?code=&name=&page=&pageSize=` returns one page of companies (not branches, not deleted rows) ordered by name, filtered by the backend (see "Filtering and paging").

Every endpoint except the login requires a token. Controllers return RFC 7807 problem details for errors (see Validation and exception handling). Swagger UI is at `/swagger` in every environment except Production.

## Authentication

Every controller endpoint requires a valid access token (`Authorization: Bearer <token>`). Only the login is marked `[AllowAnonymous]`. A new controller is protected without opting in.

- **Login** (`iErp.Admin/Login`). `POST /api/admin/login` with `userCode`, `password`, `companyCode`, all required and no longer than their columns (15, 50, 10).
  - The user is matched in `USERM` by `USER_CODE` (not the name) and company code, ignoring case and surrounding spaces. Locked or deleted users are excluded.
  - The company code must belong to a not-deleted `COMPANYM` row of type `C`.
  - The password is compared in fixed time. For now it is compared as text with `USER_PASSWORD`, which holds the legacy system's encrypted values; the legacy encryption is to be added in `LoginService.PasswordMatches` once known.
  - Every credential failure gives the same 401, "Invalid user code, password or company code.", and is logged without the password.
  - With correct credentials, the user's default branch (`USER_BRANCH_ID`, a type-`B` row of the same company) and the company's latest financial year (`YEARM`, latest `YEAR_START_DATE`) must exist; otherwise the answer is a 403 naming what is missing.
  - On success the answer is 200 with `token`, `expiresAt` and `session` (user code and name; company id, code and name; branch id and name; year id, code and name).
- **Change branch** (`iErp.Admin/ChangeBranch`). Both endpoints need a token; the user and company are always the token's own (`ICurrentSession`), never request values. Nothing is written: the switch lives only in the re-issued token, and the user's default branch in `USERM` is unchanged.
  - `GET /api/admin/session/options` returns `{ branches: [{ id, name }], years: [{ id, code, name }] }`. Branches are the user's `USERD` rows that are not-deleted type-`B` rows of the session's company (`COMP_PARENT_ID`), by name; years are the company's open `YEARM` rows (`YEAR_CLOSED = 'N'`), newest `YEAR_START_DATE` first.
  - `POST /api/admin/session/change` with `branchId`, `yearId` (required, at most 40) re-checks both against the same rules (a closed year counts as not available) and answers like the login (`token`, `expiresAt`, `session`) with the new branch and year. A branch that is not allowed gives 403 "This branch is not available to you."; a year of another company 403 "This financial year is not available for your company.". A user who is now locked or deleted gets 401, which ends the session in the browser.
  - The new token keeps the current token's expiry (its `exp`), so a switch never extends the login.
- **Token.** A JWT, HMAC-SHA256. Claims: `sub` (user id), `name`, `ierp:user_code`, `ierp:company_id`, `ierp:company_code`, `ierp:branch_id`, `ierp:year_id` (`SessionClaims`). It is issued only by `SessionTokenIssuer` (`iErp.Admin/Session`), for the login and the branch change alike. A login token lasts `Jwt:LifetimeMinutes` (480); it is not refreshed. Logout is client-side only; the server keeps no session list.
- **Settings** (`JwtOptions`, section `Jwt`): `Issuer`, `Audience`, `SigningKey`, `LifetimeMinutes`.
  - The signing key is a secret of at least 32 bytes. It comes from the Git-ignored `appsettings.{Environment}.local.json` (see `appsettings.Development.local.example.json`), user secrets or the `Jwt__SigningKey` environment variable, never from a committed file.
  - The API does not start without it (`ValidateOnStart`, message naming `Jwt:SigningKey`).
  - `appsettings.Testing.json` holds a fixed, non-secret key used only by tests.
- **Validation.** `ConfigureJwtBearer` (in `iErp.Api/Auth`) checks the issuer, audience, lifetime (1 minute skew), signing key and algorithm. A missing, invalid or expired token is answered with 401 problem details, "Authentication is required.".
- **Where it is applied.** The requirement is applied with `MapControllers().RequireAuthorization()` rather than an authorization fallback policy, so a wrong HTTP method still answers 405 and an unknown path 404.
- **Session context.** `ICurrentSession` (`iErp.Shared/Auth`, implemented by `HttpCurrentSession` in `iErp.Api/Auth`) gives services the request's user id and code, company id and code, branch id and year id from the token claims, never from request parameters. Services that must scope their data to the working company, branch or year inject it. No existing endpoint is scoped yet.
- **Swagger** has a Bearer scheme: get a token from the login and paste it into "Authorize".

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
- Table first: the Oracle tables are the source of truth and the application never creates, alters or drops them. There are no EF Core migrations. Entities and their Fluent API configurations are written to match the existing tables (new ones can be scaffolded with `dotnet ef dbcontext scaffold`, see `backend/README.md`). Existing `ExcludeFromMigrations()` calls in the configurations are leftovers with no effect.
- Legacy tables: a table that already exists and is owned elsewhere is mapped with `ToTable("NAME", ...)`. `COMPANYM` is the first (entity `Company`, string key `COMP_PKID`, read-only). Its string key does not fit `Repository<T>` (Guid keys), so `CompanyListRepository` depends on `AppDbContext` directly and exposes only reads. `COMPANYM` also holds branches (`COMP_TYPE` `B`); the report filters to companies (`C`) that are not soft-deleted (`REC_DELETED_DATE` null). Queries that need no paging or row limit work on 10g unchanged. Oracle 10g has no `TRUE`/`FALSE` literals, so never sort, select or filter on a bool expression that EF turns into `CASE ... THEN TRUE ELSE FALSE` (for example `OrderBy(x => x.Date == null)`); use a number (`x.Date == null ? 1 : 0`). Such a query passes every test that uses a fake, so check its SQL with `ToQueryString()` as `Unit/ChangeBranchQueryTests` does. The login reads `USERM` (entity `User`) and `YEARM` (entity `FinancialYear`, including `YEAR_CLOSED` as `Closed`) the same way: read-only, string keys (`USER_PKID`, `YEAR_PKID`), only the columns it needs mapped, through `LoginRepository` on `AppDbContext`. `Company.ParentId` (`COMP_PARENT_ID`) links a branch to its company. The branch change reads `USERD` (entity `UserBranch`, composite key `USER_ID` + `USER_BRANCH_ID`) through `ChangeBranchRepository`; only those two columns are mapped, so its rights and ICEGATE credential columns are never selected.- Connection string: `ConnectionStrings:Default`, from (lowest to highest priority) `appsettings*.json`, the optional Git-ignored `appsettings.{Environment}.local.json` (copy `appsettings.Development.local.example.json`), user secrets, and the `ConnectionStrings__Default` environment variable, which always wins. Startup fails with a clear message when it is missing. No secrets are committed.
- There is no `Migrations` folder. `DesignTimeDbContextFactory` exists only so `dotnet ef` tooling (for example `dbcontext scaffold`) can create the context.

## Validation and exception handling

- `ValidationFilter` runs the FluentValidation validator for each action argument and returns 400 with `ValidationProblemDetails` (errors grouped by field).
- `GlobalExceptionHandler` maps `NotFoundException` to 404 and everything else to a generic 500. All errors are RFC 7807 problem details with a `traceId`. Exception details are logged, never returned.

## Logging and configuration

Serilog (console sink) configured from `appsettings`, plus request logging. `appsettings.{Development,Testing,Production}.json` override the base file. The `Jwt` section is described under "Authentication".

## Testing

xUnit, in `iErp.Tests`:

- `Unit/`: the Oracle 10g compatibility interceptor (including the paging rewrite) and the paging helper and rules. No database.
- `Integration/PipelineTests`: the real HTTP pipeline through test-only endpoints (`TestSupport/TestEndpointsController`, never part of the shipped API): 404 problem details, 500 without internal details, 400 with errors grouped by field, Swagger. No database.
- Tokens in tests: `TestSupport/TestTokens` signs tokens with the Testing key. `client.Authenticated()` sends a valid one; `TestTokens.Create(...)` makes expired, wrongly signed or other-issuer tokens. Endpoint tests use an authenticated client.
- `Integration/AuthenticationTests`: 401 problem details without a token and for expired, wrongly signed, altered or other-issuer tokens; a valid token works as before; an endpoint without attributes is protected; a wrong method still answers 405; `ICurrentSession` reads the token's claims.
- `Admin/`: login request validator (required, blank, column lengths) and login service with a fake repository (every session field, token claims and expiry, trimming, exact password, one outcome for every credential failure, duplicate users, no branch, branch of another company, no year, password never logged).
- `Integration/LoginEndpointTests`: `POST /api/admin/login` through the real pipeline with a fake repository (200 shape without a token, the issued token opens protected endpoints, identical 401 problem for every failure, 403 messages, 400 field errors, 405 for other methods). No database.
- `Reports/`: Company List service mapping (null to empty string, order kept, paged result, query passed through) and the query validator (page, page size, filter length).
- `Integration/CompaniesEndpointTests`: `GET /api/reports/companies` through the real pipeline with a fake repository (200 shape with `items`/`total`/`page`/`pageSize`, defaults, filters and paging passed on, 400 for bad paging values and overlong filters, empty and past-the-end pages, 405 for other methods, 500 without internals). No database.
- `Integration/OracleConnectivityTests`, `Integration/CompanyTableTests`, `Integration/LoginTablesTests` and `Integration/ChangeBranchTablesTests`: connect to Oracle. Skipped unless `IERP_TEST_ORACLE` holds a connection string for a test schema. `CompanyTableTests` creates a `COMPANYM`-shaped table only if the schema has none (and drops it afterwards); if the table exists it only reads it. Either way it pages through every row (several page sizes, no overlap or gaps, same order as the unpaged list, empty page after the last), which proves the paging rewrite on the target Oracle version. `LoginTablesTests` runs the login repository's queries: read-only against real `USERM`/`YEARM`/`COMPANYM`, or against shaped tables it creates (and drops) in a schema that has none of them, including locked, deleted and flag-less users. `ChangeBranchTablesTests` does the same for the branch-change queries (`USERD`, `USERM`, `YEARM`, `COMPANYM`): allotted versus other-company, deleted and unallotted branches, and year order.
- `Architecture/`: dependency rules (checked for every module), plus a check that the Api and module assemblies do not use test code.

## Adding a module

1. Create `iErp.<Name>` directly under `backend/` referencing only the projects allowed in the table above, and add it to `iErp.sln`.
2. Add entities to `iErp.Entities`, their configuration to `iErp.Data/Configurations`, matching the table that already exists in the database (table first, no migration).
3. Add `Add<Name>(IServiceCollection)` that registers its services, repositories and validators.
4. In `iErp.Api`: reference the project, call the registration method, and add its assembly as an application part.
5. Add the module to `Modules` in `Architecture/DependencyRuleTests.cs`, add unit tests, and extend the architecture tests if the module introduces new rules. Its controllers require a token automatically; mark an action `[AllowAnonymous]` only when it must be callable without login.

## Adding a feature to a module

Create a feature folder with controller, service, repository, DTOs and validator, following the conventions above. Register the service, repository and validator in the module's registration method.
