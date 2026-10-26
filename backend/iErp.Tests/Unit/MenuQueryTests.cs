using Microsoft.EntityFrameworkCore;
using iErp.Admin.UserRights;
using iErp.Data;

namespace iErp.Tests.Unit;

/// <summary>
/// The menu and rights queries as SQL for Oracle, generated without a database. Oracle 10g has no TRUE/FALSE literals,
/// so a query that filters on a bool fails there although every other test passes.
/// </summary>
public class MenuQueryTests
{
    private static MenuRepository Repository() =>
        new(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model")
            .AddInterceptors(new Oracle10gCompatibilityInterceptor()).Options));

    [Fact]
    public void Visible_menus_are_the_company_s_new_software_menus_with_the_view_right_in_the_branch()
    {
        var sql = Repository().VisibleMenus("CPL", "u-1", "b-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"MENUM\"", sql);
        Assert.Contains("\"USERRIGHTS\"", sql);
        Assert.Contains("\"REC_COMPANY_CODE\"", sql);
        // The SQL comes wrapped in a PL/SQL string, so its quotes may be doubled (N''Y'').
        Assert.Matches("\"MENU_NEWSOFTWARE\" = N?'+Y'+", sql);
        Assert.Matches("\"RIGHTS_VIEW\" = N?'+Y'+", sql);
        Assert.Contains("\"RIGHTS_USER_ID\"", sql);
        Assert.Contains("\"RIGHTS_BRANCH_ID\"", sql);
        Assert.Contains("\"RIGHTS_MENU_ID\"", sql);
    }

    [Fact]
    public void The_view_right_check_reads_one_menu_id_with_no_bool_literal()
    {
        // The exact query the check runs (FirstOrDefault of it); AnyAsync would add THEN TRUE ELSE FALSE.
        var sql = Repository().ViewRightIds("NS-COMPLIST", "CPL", "u-1", "b-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"MENU_CODE\"", sql);
        Assert.Matches("\"RIGHTS_VIEW\" = N?'+Y'+", sql);
        // A nested FETCH FIRST is 12c syntax that the 10g ROWNUM rewrite does not reach (ORA-00907).
        Assert.DoesNotContain("FETCH", sql);
    }

    [Fact]
    public void The_rights_by_code_are_the_user_s_rows_in_the_branch_on_the_company_s_new_software_menus()
    {
        var sql = Repository().RightsByCode(["NS-EMPLIST", "NS-EMPPROFILE"], "CPL", "u-1", "b-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.DoesNotContain("JSON", sql); // no JSON collection parameters: Oracle 10g has none
        Assert.DoesNotContain("FETCH", sql);
        Assert.Contains("\"MENU_CODE\" IN", sql);
        Assert.Matches("\"MENU_NEWSOFTWARE\" = N?'+Y'+", sql);
        Assert.Contains("\"REC_COMPANY_CODE\"", sql);
        Assert.Contains("\"RIGHTS_USER_ID\"", sql);
        Assert.Contains("\"RIGHTS_BRANCH_ID\"", sql);
        Assert.Contains("\"RIGHTS_MENU_ID\"", sql);
    }
}
