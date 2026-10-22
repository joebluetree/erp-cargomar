using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Shared.Paging;
using iErp.SharedBusiness.Holidays;

namespace iErp.Reports.BranchList;

/// <summary>One row of the Branch List report. Optional values are empty strings, never null.</summary>
public record BranchListItemDto(
    string Id,
    string Code,
    string Name,
    string Address1,
    string Address2,
    string Address3,
    string Tel,
    string Email,
    string Web);

/// <summary>A listed branch's holidays for the session's financial year, in the order of its holiday file.</summary>
public record BranchHolidayListDto(string BranchCode, string BranchName, IReadOnlyList<HolidayDto> Items);

public interface IBranchListService
{
    /// <summary>One page of the session company's branches; an empty page when the session has no company.</summary>
    Task<PagedResult<BranchListItemDto>> ListAsync(BranchListQuery query, CancellationToken ct = default);

    /// <summary>
    /// The holidays of the branch, if it is one of the session company's listed branches and has a holiday file for the
    /// session's financial year; otherwise null.
    /// </summary>
    Task<BranchHolidayListDto?> GetHolidaysAsync(string branchId, CancellationToken ct = default);
}

/// <summary>The Branch List (design D2). The company and the financial year always come from the session.</summary>
public class BranchListService(IBranchListRepository repository, IHolidayFileStore files, ICurrentSession current)
    : IBranchListService
{
    public async Task<PagedResult<BranchListItemDto>> ListAsync(BranchListQuery query, CancellationToken ct = default)
    {
        var companyId = current.CompanyId?.Trim();
        if (string.IsNullOrEmpty(companyId))
            return new PagedResult<BranchListItemDto>([], 0, query.Page, query.PageSize);

        var (branches, total) = await repository.ListAsync(query, companyId, ct);
        return new PagedResult<BranchListItemDto>(branches.Select(ToDto).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<BranchHolidayListDto?> GetHolidaysAsync(string branchId, CancellationToken ct = default)
    {
        var companyId = current.CompanyId?.Trim();
        var yearId = current.YearId?.Trim();
        if (string.IsNullOrEmpty(companyId) || string.IsNullOrEmpty(yearId) || string.IsNullOrWhiteSpace(branchId))
            return null;

        var branch = await repository.FindListedAsync(branchId.Trim(), companyId, ct);
        if (branch is null)
            return null;

        var yearCode = await repository.FindYearCodeAsync(yearId, ct);
        var fileName = HolidayFiles.NameFor(current.CompanyCode, branch.Code, yearCode);
        var lines = fileName is null ? null : files.Read(fileName);
        return lines is null
            ? null
            : new BranchHolidayListDto(branch.Code?.Trim() ?? "", branch.Name?.Trim() ?? "",
                HolidayLines.Parse(lines));
    }

    private static BranchListItemDto ToDto(Company c) => new(
        c.Id, c.Code ?? "", c.Name ?? "", c.Address1 ?? "", c.Address2 ?? "", c.Address3 ?? "",
        c.Tel ?? "", c.Email ?? "", c.Web ?? "");
}
