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

    [Theory]
    [InlineData("CPL-COKSF-2026.txt", "COKSF", 2026)]
    [InlineData("cpl-coksf-2026.TXT", "coksf", 2026)]
    [InlineData(" CPL-COKSF-2025.txt ", "COKSF", 2025)]
    [InlineData("CPL-KOC-SF-2026.txt", "KOC-SF", 2026)]
    public void An_uploaded_name_of_the_company_gives_its_branch_and_year(string name, string branch, int year)
    {
        Assert.Equal((branch, (decimal)year), HolidayFiles.Parse(name, " CPL "));
    }

    [Theory]
    [InlineData("XYZ-COKSF-2026.txt")] // another company
    [InlineData("CPLX-COKSF-2026.txt")]
    [InlineData("CPL-COKSF-20A6.txt")] // a year that is not digits
    [InlineData("CPL-COKSF-.txt")]
    [InlineData("CPL--2026.txt")] // no branch
    [InlineData("CPL-2026.txt")]
    [InlineData("CPL-COKSF-2026.csv")]
    [InlineData("CPL-COKSF-2026")]
    [InlineData("holidays.txt")]
    [InlineData(@"..\CPL-COKSF-2026.txt")]
    [InlineData("sub/CPL-COKSF-2026.txt")]
    [InlineData(@"C:\CPL-COKSF-2026.txt")]
    [InlineData("")]
    [InlineData(null)]
    public void Any_other_name_is_refused(string? name)
    {
        Assert.Null(HolidayFiles.Parse(name, "CPL"));
    }
}
