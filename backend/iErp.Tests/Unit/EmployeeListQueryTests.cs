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
    public void The_default_list_filters_by_company_branch_and_not_relieved_with_an_escaped_LIKE_and_orders_by_name_then_id()
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
    public void Without_filters_only_the_scope_and_the_active_status_restrict()
    {
        var sql = new EmployeeListRepository(Db()).Employees(new EmployeeListQuery(), Scope).ToQueryString();

        Assert.DoesNotContain(" LIKE ", sql);
        Assert.Contains("\"REC_BRANCH_CODE\"", sql);
        Assert.Matches("\"EMP_IS_RELIEVED\" = N?'+N'+", sql);
    }

    [Theory]
    [InlineData("active", "N")]
    [InlineData(" Active ", "N")]
    [InlineData("relieved", "Y")]
    [InlineData("RELIEVED", "Y")]
    public void The_status_compares_the_relieved_flag_as_text(string status, string flag)
    {
        var sql = new EmployeeListRepository(Db()).Employees(new EmployeeListQuery { Status = status }, Scope).ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Matches($"\"EMP_IS_RELIEVED\" = N?'+{flag}'+", sql);
        Assert.Matches("ORDER BY \"e\".\"EMP_NAME\", \"e\".\"EMP_PKID\"", sql);
    }

    [Fact]
    public void The_all_status_leaves_the_relieved_flag_unchecked()
    {
        var sql = new EmployeeListRepository(Db()).Employees(new EmployeeListQuery { Status = "all" }, Scope).ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"REC_BRANCH_CODE\"", sql);
        Assert.DoesNotContain("\"EMP_IS_RELIEVED\" =", sql);
    }

    [Fact]
    public void The_profile_scope_does_not_check_the_relieved_flag()
    {
        var sql = Scope.Apply(new EmployeeProfileRepository(Db()).Employee("e-1")).ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"REC_COMPANY_CODE\"", sql);
        Assert.Contains("\"REC_BRANCH_CODE\"", sql);
        Assert.DoesNotContain("\"EMP_IS_RELIEVED\" =", sql);
    }

    [Fact]
    public void The_branch_names_are_the_company_branches_with_the_codes_in_an_IN_of_constants()
    {
        var sql = new EmployeeListRepository(Db()).BranchesByCode("c-1", ["KOC", "CHN"]).ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.DoesNotContain("JSON", sql);
        Assert.Matches("\"COMP_TYPE\" = N?'+B'+", sql);
        Assert.Contains("\"COMP_PARENT_ID\" = ", sql);
        Assert.Matches("\"COMP_CODE\" IN \\(N?'+KOC'+, N?'+CHN'+\\)", sql);
    }

    [Fact]
    public void The_branch_code_lookup_reads_a_branch_by_key()
    {
        var sql = new EmployeeProfileRepository(Db()).Branch("b-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"COMPANYM\"", sql);
        Assert.Matches("\"COMP_TYPE\" = N?'+B'+", sql);
    }

    [Fact]
    public void A_scope_of_several_branches_filters_their_codes_with_an_IN_of_constants()
    {
        var sql = new EmployeeListRepository(Db()).Employees(new EmployeeListQuery { Status = "all" }, new EmployeeScope("CMP", ["KOC", "CHN"])).ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.DoesNotContain("JSON", sql); // no JSON collection parameters: Oracle 10g has none
        Assert.Matches("\"REC_COMPANY_CODE\" = ", sql);
        Assert.Matches("\"REC_BRANCH_CODE\" IN \\(N?'+KOC'+, N?'+CHN'+\\)", sql);
        Assert.Matches("ORDER BY \"e\".\"EMP_NAME\", \"e\".\"EMP_PKID\"", sql);
    }
}
