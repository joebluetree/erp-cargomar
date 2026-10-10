using iErp.Entities;

namespace iErp.Reports.CompanyList;

public interface ICompanyListRepository
{
    /// <summary>
    /// One page of the companies that match the filters (companies only: no branches, no deleted rows), ordered by
    /// name and then id, with the number of companies that match in all.
    /// </summary>
    Task<(IReadOnlyList<Company> Items, int Total)> ListCompaniesAsync(CompanyListQuery query, CancellationToken ct = default);
}
