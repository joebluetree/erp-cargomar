using System.Globalization;

namespace iErp.SharedBusiness.Holidays;

/// <summary>
/// The naming rule of the branches' holiday files, shared by the Holiday List (the session's branch) and the Branch
/// List (any listed branch): <c>&lt;company code&gt;-&lt;branch code&gt;-&lt;year code&gt;.txt</c>, for example
/// <c>CPL-COKSF-2026.txt</c>, where the year code is the financial year's <c>YEAR_CODE</c>.
/// </summary>
public static class HolidayFiles
{
    /// <summary>The file name for the codes, trimmed, with the year as a whole number; null when a code is missing.</summary>
    public static string? NameFor(string? companyCode, string? branchCode, decimal? yearCode)
    {
        var company = companyCode?.Trim();
        var branch = branchCode?.Trim();
        if (string.IsNullOrEmpty(company) || string.IsNullOrEmpty(branch) || yearCode is null)
            return null;

        // The year as a whole number: 2026, never "2026.0".
        var year = decimal.Truncate(yearCode.Value).ToString("0", CultureInfo.InvariantCulture);
        return $"{company}-{branch}-{year}.txt";
    }
}
