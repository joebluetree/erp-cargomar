using iErp.Shared.Paging;

namespace iErp.Reports.CompanyList;

public interface ICompanyListService
{
    Task<PagedResult<CompanyListItemDto>> ListAsync(CompanyListQuery query, CancellationToken ct = default);
}
