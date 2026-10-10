using iErp.Entities;
using iErp.Shared.Paging;

namespace iErp.Reports.CompanyList;

public class CompanyListService(ICompanyListRepository repository) : ICompanyListService
{
    public async Task<PagedResult<CompanyListItemDto>> ListAsync(CompanyListQuery query, CancellationToken ct = default)
    {
        var (companies, total) = await repository.ListCompaniesAsync(query, ct);
        return new PagedResult<CompanyListItemDto>(
            companies.Select(ToDto).ToList(), total, query.Page, query.PageSize);
    }

    private static CompanyListItemDto ToDto(Company c) => new(
        c.Id, c.Code ?? "", c.Name ?? "", c.Address1 ?? "", c.Address2 ?? "", c.Address3 ?? "",
        c.Tel ?? "", c.Email ?? "", c.Web ?? "");
}
