using iErp.Data;
using iErp.Entities;
using Microsoft.EntityFrameworkCore;

namespace iErp.Reports.CompanyList;

/// <summary>
/// Reads the existing COMPANYM table. It is read-only and keyed by a string, so it does not use the Guid-keyed
/// <c>Repository&lt;T&gt;</c>. Filtering and paging happen in the database; the paging clause is rewritten for
/// Oracle 10g by <see cref="Oracle10gCompatibilityInterceptor"/>.
/// </summary>
public class CompanyListRepository(AppDbContext db) : ICompanyListRepository
{
    public async Task<(IReadOnlyList<Company> Items, int Total)> ListCompaniesAsync(
        CompanyListQuery query, CancellationToken ct = default)
    {
        var companies = db.Set<Company>().AsNoTracking()
            .Where(c => c.Type == "C" && c.DeletedDate == null);

        // Case-insensitive "contains". string.Contains on Oracle becomes INSTR, so % and _ are ordinary characters.
        var code = query.Code?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(code))
            companies = companies.Where(c => c.Code != null && c.Code.ToUpper().Contains(code));

        var name = query.Name?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(name))
            companies = companies.Where(c => c.Name != null && c.Name.ToUpper().Contains(name));

        // The id breaks ties between equal names, so pages never overlap or skip a company.
        return await companies.OrderBy(c => c.Name).ThenBy(c => c.Id).ToPageAsync(query.Page, query.PageSize, ct);
    }
}
