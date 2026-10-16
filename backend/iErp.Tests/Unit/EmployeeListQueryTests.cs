using Microsoft.EntityFrameworkCore;
using iErp.Admin.EmployeeList;
using iErp.Admin.EmployeeProfile;
using iErp.Data;

namespace iErp.Tests.Unit;

/// <summary>
/// The Employee List and scope queries as SQL for Oracle, generated without a database. Oracle 10g has no TRUE/FALSE
/// literals, so a query that filters or sorts on a bool fails there although every other test passes.
/// </summary>
public class EmployeeListQueryTests
{
    private static AppDbContext Db() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model")
            .AddInterceptors(new Oracle10gCompatibilityInterceptor()).Options);

    private static readonly EmployeeScope Scope = new("CMP", "KOC");

    [Fact]
    public void The_list_filters_by_company_branch_and_not_relieved_with_an_escaped_LIKE_and_orders_by_name_then_id()
    {
        var sql = new EmployeeListRepository(Db()).Employees(new EmployeeListQuery { Code = "10", Name = "kum" }, Scope).ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"REC_COMPANY_CODE\"", sql);
        Assert.Contains("\"REC_BRANCH_CODE\"", sql);
        // The SQL comes wrapped in a PL/SQL string, so its quotes may be doubled (N''N'').
        Assert.Matches("\"EMP_IS_RELIEVED\" = N?'+N'+", sql);
        // "Contains" becomes LIKE on an upper-cased column with an ESCAPE clause: EF escapes % and _ in the value, so
        // they are ordinary characters.
        Assert.Matches(@"UPPER\(""e"".""EMP_NO""\) LIKE :\w+ ESCAPE", sql);
        Assert.Matches(@"UPPER\(""e"".""EMP_NAME""\) LIKE :\w+ ESCAPE", sql);
        Assert.Matches("ORDER BY \"e\".\"EMP_NAME\", \"e\".\"EMP_PKID\"", sql);
    }

    [Fact]
    public void Without_filters_only_the_scope_restricts()
    {
        var sql = new EmployeeListRepository(Db()).Employees(new EmployeeListQuery(), Scope).ToQueryString();

        Assert.DoesNotContain(" LIKE ", sql);
        Assert.Contains("\"REC_BRANCH_CODE\"", sql);
    }

    [Fact]
    public void The_branch_code_lookup_reads_a_branch_by_key()
    {
        var sql = new EmployeeProfileRepository(Db()).Branch("b-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"COMPANYM\"", sql);
        Assert.Matches("\"COMP_TYPE\" = N?'+B'+", sql);
    }
}
