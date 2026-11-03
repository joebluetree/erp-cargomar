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

    /// <summary>
    /// The branch and year codes of an uploaded file's name when it follows the rule for this company (admin-list-upload
    /// design D2), else null. The name must be bare (no folder), end in <c>.txt</c> in any case, and start with the
    /// company code (any case) and a dash; the year is the part after the last dash and must be digits; the branch
    /// code is everything between, so it may hold a dash itself.
    /// </summary>
    public static (string BranchCode, decimal YearCode)? Parse(string? fileName, string? companyCode)
    {
        var name = fileName?.Trim();
        var company = companyCode?.Trim();
        if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(company))
            return null;
        if (name.IndexOfAny(['/', '\\', ':']) >= 0 || Path.GetFileName(name) != name)
            return null;
        if (!string.Equals(Path.GetExtension(name), ".txt", StringComparison.OrdinalIgnoreCase))
            return null;

        var stem = Path.GetFileNameWithoutExtension(name);
        var prefix = company + "-";
        if (!stem.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return null;
        var rest = stem[prefix.Length..];
        var dash = rest.LastIndexOf('-');
        if (dash <= 0 || dash == rest.Length - 1)
            return null;

        var branch = rest[..dash];
        var year = rest[(dash + 1)..];
        if (branch.Trim().Length != branch.Length || !year.All(char.IsAsciiDigit))
            return null;
        return (branch, decimal.Parse(year, CultureInfo.InvariantCulture));
    }
}
