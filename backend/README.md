# Backend

ASP.NET Core (.NET 9) modular monolith with Oracle and EF Core. Architecture: `kb/architecture/backend.md`.

## Setup

Requires the .NET 9 SDK, an Oracle database (10.2 or later; 10g is handled by a built-in compatibility interceptor), and `dotnet-ef` (`dotnet tool install -g dotnet-ef`) for scaffolding.

```powershell
# Connection string: never commit it. Easiest locally: copy
# iErp.Api/appsettings.Development.local.example.json to appsettings.Development.local.json
# and fill it in (that file is ignored by Git and loaded automatically in Development).
# Or use user secrets...
dotnet user-secrets set "ConnectionStrings:Default" "User Id=app;Password=...;Data Source=localhost:1521/FREEPDB1" --project iErp.Api
# ...or an environment variable
$env:ConnectionStrings__Default = "User Id=app;Password=...;Data Source=localhost:1521/FREEPDB1"

# Token signing key: a random secret of at least 32 characters, set the same three ways
# ("Jwt": { "SigningKey": "..." } in the local file, "Jwt:SigningKey" in user secrets, or $env:Jwt__SigningKey).
# The API does not start without it.
dotnet user-secrets set "Jwt:SigningKey" "<random secret>" --project iErp.Api

# Run (Swagger at /swagger in Development)
dotnet run --project iErp.Api

# Test. Integration tests run only when IERP_TEST_ORACLE is set to a connection string for a test schema.
dotnet test iErp.sln
```

## Table first

The Oracle tables are the source of truth. The application never creates or alters tables, and there are no EF Core migrations. When a table is added or changed in the database, update the entity and its configuration in `iErp.Entities` / `iErp.Data/Configurations` to match. To generate the classes from a table:

```powershell
dotnet ef dbcontext scaffold "<connection string>" Oracle.EntityFrameworkCore -p iErp.Data -s iErp.Api --table <TABLE> --output-dir <temp folder>
```

Copy what you need from the generated output into the project's own conventions.
