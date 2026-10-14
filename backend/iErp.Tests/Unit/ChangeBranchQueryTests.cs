using Microsoft.EntityFrameworkCore;
using iErp.Admin.ChangeBranch;
using iErp.Data;

namespace iErp.Tests.Unit;

/// <summary>
/// The branch-change queries as SQL for Oracle, generated without a database. Oracle 10g has no TRUE/FALSE literals,
/// so a query that sorts or filters on a bool fails there (ORA-00904 "FALSE") although every other test passes.
/// </summary>
public class ChangeBranchQueryTests
{
    private static ChangeBranchRepository Repository() =>
        new(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model")
            .AddInterceptors(new Oracle10gCompatibilityInterceptor()).Options));

    [Fact]
    public void The_years_query_has_no_boolean_literals_keeps_open_years_only_and_puts_years_without_a_start_last()
    {
        var sql = Repository().Years("CMP").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        // Open years only. The SQL comes wrapped in a PL/SQL string, so its quotes may be doubled (N''N'').
        Assert.Matches("\"YEAR_CLOSED\" = N?'+N'+", sql);
        Assert.Contains("ORDER BY CASE", sql);
        Assert.Contains("\"YEAR_START_DATE\" DESC", sql);
    }

    [Fact]
    public void The_allowed_branches_query_has_no_boolean_literals_and_reads_only_the_USERD_keys()
    {
        var sql = Repository().AllowedBranches("u-1", "c-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"USERD\"", sql);
        Assert.DoesNotContain("ICEGATE", sql);
    }
}
