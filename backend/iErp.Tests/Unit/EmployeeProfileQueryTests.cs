using Microsoft.EntityFrameworkCore;
using iErp.Admin.EmployeeProfile;
using iErp.Data;

namespace iErp.Tests.Unit;

/// <summary>
/// The employee-profile queries as SQL for Oracle, generated without a database. Oracle 10g has no TRUE/FALSE
/// literals, no OFFSET/FETCH and no JSON_TABLE, so a query using any of them fails there although every other test passes.
/// </summary>
public class EmployeeProfileQueryTests
{
    private static EmployeeProfileRepository Repository() =>
        new(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model")
            .AddInterceptors(new Oracle10gCompatibilityInterceptor()).Options));

    [Fact]
    public void The_employee_query_reads_EMPM_by_key_with_plain_SQL()
    {
        var sql = Repository().Employee("e-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE|FETCH|OFFSET)\b", sql);
        Assert.Contains("\"EMPM\"", sql);
        Assert.Contains("\"EMP_PKID\" =", sql);
        // The photo's file name is read (design D7); unmapped columns such as the salary limits are not.
        Assert.Contains("EMP_IMAGE_NAME", sql);
        Assert.DoesNotContain("EMP_FUEL_LIMIT", sql);
    }

    [Fact]
    public void The_places_query_uses_an_IN_list_and_keeps_states_and_countries_only()
    {
        var sql = Repository().Places(["s-kl", "c-in"]).ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE|FETCH|OFFSET|JSON_TABLE)\b", sql);
        Assert.Contains("\"PARAM\"", sql);
        Assert.Matches(@"""PARAM_PKID"" IN \(", sql);
        // The SQL comes wrapped in a PL/SQL string, so its quotes may be doubled (N''STATE'').
        Assert.Matches("N?'+STATE'+", sql);
        Assert.Matches("N?'+COUNTRY'+", sql);
    }
}
