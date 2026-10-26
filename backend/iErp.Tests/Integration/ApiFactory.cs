using FluentValidation;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using iErp.Shared.Auth;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

public static class OracleTest
{
    public const string EnvVar = "IERP_TEST_ORACLE";
    public static string? ConnectionString => Environment.GetEnvironmentVariable(EnvVar);
}

public sealed class OracleFactAttribute : FactAttribute
{
    public OracleFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(OracleTest.ConnectionString))
            Skip = $"Set {OracleTest.EnvVar} to a connection string for an Oracle test schema.";
    }
}

/// <summary>
/// The real pipeline, plus the test-only endpoints. The connection string comes from IERP_TEST_ORACLE,
/// or a placeholder when no database is needed (nothing connects until a request uses the context).
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    // Program reads the connection string while building, before ConfigureAppConfiguration applies,
    // so it is supplied through the environment (the same way a deployment would).
    static ApiFactory() => Environment.SetEnvironmentVariable("ConnectionStrings__Default",
        OracleTest.ConnectionString ?? "User Id=x;Password=x;Data Source=localhost:1521/none");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.AddControllers().AddApplicationPart(typeof(TestEndpointsController).Assembly);
            services.AddScoped<IValidator<EchoRequest>, EchoRequestValidator>();
            // Every menu is allowed unless a test replaces this (admin-user-rights design D3).
            services.AddScoped<IMenuAccess>(_ => new FakeMenuAccess());
        });
    }
}
