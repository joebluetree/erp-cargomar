# Backend

ASP.NET Core (.NET 9) modular monolith with Oracle and EF Core. Architecture: `kb/architecture/backend.md`.

## Setup

Requires the .NET 9 SDK, an Oracle database (10.2 or later; 10g is handled by a built-in compatibility interceptor), and `dotnet-ef` (`dotnet tool install -g dotnet-ef`).

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

# Apply migrations
dotnet ef database update -p iErp.Data -s iErp.Api

# Run (Swagger at /swagger in Development)
dotnet run --project iErp.Api

# Test. Integration tests run only when IERP_TEST_ORACLE is set to a connection string for a test schema.
dotnet test iErp.sln
```

## Adding a migration

```powershell
dotnet ef migrations add <Name> -p iErp.Data -s iErp.Api -o Migrations
```
