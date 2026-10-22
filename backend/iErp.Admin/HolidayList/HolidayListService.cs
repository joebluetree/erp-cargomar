using iErp.Shared.Auth;
using iErp.SharedBusiness.Holidays;

namespace iErp.Admin.HolidayList;

/// <summary>The session's branch and the holidays of its financial year, in the order of the file.</summary>
public record HolidayListDto(string BranchCode, string BranchName, IReadOnlyList<HolidayDto> Items);

public interface IHolidayListService
{
    /// <summary>The holidays of the session's company, branch and financial year, or null when there is no holiday file.</summary>
    Task<HolidayListDto?> GetAsync(CancellationToken ct = default);
}

/// <summary>
/// Finds the session's holiday file, <c>&lt;company code&gt;-&lt;branch code&gt;-&lt;year code&gt;.txt</c> (design D1).
/// The company code is in the token; the branch's and the year's codes are looked up by their ids. Any missing value
/// means there is no file, and then nothing is read.
/// </summary>
public class HolidayListService(IHolidayListRepository repository, IHolidayFileStore files, ICurrentSession current)
    : IHolidayListService
{
    public async Task<HolidayListDto?> GetAsync(CancellationToken ct = default)
    {
        var companyCode = current.CompanyCode?.Trim();
        var branchId = current.BranchId?.Trim();
        var yearId = current.YearId?.Trim();
        if (string.IsNullOrEmpty(companyCode) || string.IsNullOrEmpty(branchId) || string.IsNullOrEmpty(yearId))
            return null;

        var branch = await repository.FindBranchAsync(branchId, ct);
        var yearCode = await repository.FindYearCodeAsync(yearId, ct);
        var fileName = HolidayFiles.NameFor(companyCode, branch?.Code, yearCode);
        var lines = fileName is null ? null : files.Read(fileName);
        return lines is null
            ? null
            : new HolidayListDto(branch!.Code?.Trim() ?? "", branch.Name?.Trim() ?? "", HolidayLines.Parse(lines));
    }
}
