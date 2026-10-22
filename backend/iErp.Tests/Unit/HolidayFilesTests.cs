using iErp.SharedBusiness.Holidays;

namespace iErp.Tests.Unit;

/// <summary>The holiday file naming rule shared by the Holiday List and the Branch List.</summary>
public class HolidayFilesTests
{
    [Theory]
    [InlineData("CPL", "COKSF", "2026", "CPL-COKSF-2026.txt")]
    [InlineData(" CPL ", " COKSF ", "2026.0", "CPL-COKSF-2026.txt")]
    [InlineData("CPL", "BLRAF", "2025", "CPL-BLRAF-2025.txt")]
    public void The_name_is_company_branch_and_year(string company, string branch, string year, string expected)
    {
        Assert.Equal(expected, HolidayFiles.NameFor(company, branch, decimal.Parse(year, System.Globalization.CultureInfo.InvariantCulture)));
    }

    [Theory]
    [InlineData(null, "COKSF", true)]
    [InlineData("  ", "COKSF", true)]
    [InlineData("CPL", null, true)]
    [InlineData("CPL", "", true)]
    [InlineData("CPL", "COKSF", false)]
    public void A_missing_part_gives_no_name(string? company, string? branch, bool hasYear)
    {
        Assert.Null(HolidayFiles.NameFor(company, branch, hasYear ? 2026m : null));
    }
}
