using Microsoft.EntityFrameworkCore;
using iErp.Admin.HolidayList;
using iErp.Data;

namespace iErp.Tests.Unit;

/// <summary>
/// The branch and year code lookups as SQL for Oracle, generated without a database. Oracle 10g has no TRUE/FALSE
/// literals, so a query that filters on a bool fails there although every other test passes.
/// </summary>
public class HolidayListQueryTests
{
    private static HolidayListRepository Repository() =>
        new(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model")
            .AddInterceptors(new Oracle10gCompatibilityInterceptor()).Options));

    [Fact]
    public void The_branch_code_is_read_from_a_branch_row_by_key()
    {
        var sql = Repository().Branch("b-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"COMPANYM\"", sql);
        Assert.Contains("\"COMP_PKID\"", sql);
        Assert.Matches("\"COMP_TYPE\" = N?'+B'+", sql);
    }

    [Fact]
    public void The_year_code_is_read_from_the_year_row_by_key()
    {
        var sql = Repository().Year("y-1").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"YEARM\"", sql);
        Assert.Contains("\"YEAR_PKID\"", sql);
    }

    [Fact]
    public void An_uploaded_file_s_branch_is_a_not_deleted_branch_of_the_company_by_code()
    {
        var sql = Repository().CompanyBranchByCode("c-1", " coksf ").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Matches("\"COMP_TYPE\" = N?'+B'+", sql);
        Assert.Contains("\"COMP_PARENT_ID\"", sql);
        Assert.Contains("IS NULL", sql);
        Assert.Contains("UPPER(", sql);
        Assert.Contains("COKSF", sql);
    }

    [Fact]
    public void An_uploaded_file_s_year_is_a_year_of_the_company_by_code_open_or_closed()
    {
        var sql = Repository().CompanyYearByCode("CPL", 2026m).ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"REC_COMPANY_CODE\"", sql);
        Assert.Contains("\"YEAR_CODE\"", sql);
        Assert.DoesNotMatch("\"YEAR_CLOSED\" =", sql);
    }
}
