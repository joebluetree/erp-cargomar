using Microsoft.EntityFrameworkCore;
using iErp.Data;
using iErp.Reports.BranchList;

namespace iErp.Tests.Unit;

/// <summary>
/// The Branch List queries as SQL for Oracle, generated without a database. Oracle 10g has no TRUE/FALSE literals, so a
/// query that filters or sorts on a bool fails there although every other test passes.
/// </summary>
public class BranchListQueryTests
{
    private static BranchListRepository Repository() =>
        new(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model")
            .AddInterceptors(new Oracle10gCompatibilityInterceptor()).Options));

    [Fact]
    public void The_list_keeps_the_company_s_live_branches_filters_with_an_escaped_LIKE_and_orders_by_name_then_id()
    {
        var sql = Repository().Branches(new BranchListQuery { Code = "cok", Name = "kochi" }, "c-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        // The SQL comes wrapped in a PL/SQL string, so its quotes may be doubled (N''B'').
        Assert.Matches("\"COMP_TYPE\" = N?'+B'+", sql);
        Assert.Contains("\"COMP_PARENT_ID\"", sql);
        Assert.Matches("\"REC_DELETED_DATE\" IS NULL", sql);
        Assert.Matches(@"UPPER\(""c"".""COMP_CODE""\) LIKE :\w+ ESCAPE", sql);
        Assert.Matches(@"UPPER\(""c"".""COMP_NAME""\) LIKE :\w+ ESCAPE", sql);
        Assert.Matches("ORDER BY \"c\".\"COMP_NAME\", \"c\".\"COMP_PKID\"", sql);
    }

    [Fact]
    public void Without_filters_only_the_company_scope_restricts()
    {
        var sql = Repository().Branches(new BranchListQuery(), "c-1").ToQueryString();

        Assert.DoesNotContain(" LIKE ", sql);
        Assert.Contains("\"COMP_PARENT_ID\"", sql);
    }

    [Fact]
    public void The_year_code_is_read_from_the_year_row_by_key()
    {
        var sql = Repository().Year("y-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"YEARM\"", sql);
        Assert.Contains("\"YEAR_PKID\"", sql);
    }
}
