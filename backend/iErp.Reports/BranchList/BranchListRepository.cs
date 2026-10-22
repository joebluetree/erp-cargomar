using iErp.Data;
using iErp.Entities;
using Microsoft.EntityFrameworkCore;

namespace iErp.Reports.BranchList;

public interface IBranchListRepository
{
    /// <summary>
    /// One page of the company's branches that match the filters (branches only, not deleted), ordered by name and then
    /// id, with the number of branches that match in all.
    /// </summary>
    Task<(IReadOnlyList<Company> Items, int Total)> ListAsync(BranchListQuery query, string companyId, CancellationToken ct = default);

    /// <summary>The branch with this id if it is one of the company's listed branches; otherwise null.</summary>
    Task<Company?> FindListedAsync(string branchId, string companyId, CancellationToken ct = default);

    /// <summary>The code (<c>YEARM.YEAR_CODE</c>) of the financial year, or null when there is no such year or code.</summary>
    Task<decimal?> FindYearCodeAsync(string yearId, CancellationToken ct = default);
}

/// <summary>
/// Reads the existing COMPANYM and YEARM tables, read-only and keyed by strings. A company's branches are the rows
/// whose parent is the company (design D2). Filtering and paging happen in the database; the paging clause is rewritten
/// for Oracle 10g by <see cref="Oracle10gCompatibilityInterceptor"/>.
/// </summary>
public class BranchListRepository(AppDbContext db) : IBranchListRepository
{
    public Task<(IReadOnlyList<Company> Items, int Total)> ListAsync(BranchListQuery query, string companyId, CancellationToken ct = default) =>
        Branches(query, companyId).ToPageAsync(query.Page, query.PageSize, ct);

    public Task<Company?> FindListedAsync(string branchId, string companyId, CancellationToken ct = default) =>
        Listed(companyId).Where(c => c.Id == branchId).FirstOrDefaultAsync(ct);

    public Task<decimal?> FindYearCodeAsync(string yearId, CancellationToken ct = default) =>
        Year(yearId).Select(y => y.Code).FirstOrDefaultAsync(ct);

    /// <summary>The filtered, ordered branches. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<Company> Branches(BranchListQuery query, string companyId)
    {
        var branches = Listed(companyId);

        // Case-insensitive "contains": EF escapes % and _ in the value, so they are ordinary characters.
        var code = query.Code?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(code))
            branches = branches.Where(c => c.Code != null && c.Code.ToUpper().Contains(code));

        var name = query.Name?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(name))
            branches = branches.Where(c => c.Name != null && c.Name.ToUpper().Contains(name));

        // The id breaks ties between equal names, so pages never overlap or skip a branch.
        return branches.OrderBy(c => c.Name).ThenBy(c => c.Id);
    }

    /// <summary>The company's branches that are not deleted. Public so tests can check the SQL for Oracle 10g.</summary>
    public IQueryable<Company> Listed(string companyId) =>
        db.Set<Company>().AsNoTracking().Where(c => c.Type == "B" && c.ParentId == companyId && c.DeletedDate == null);

    /// <summary>The financial year by id. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<FinancialYear> Year(string yearId) =>
        db.Set<FinancialYear>().AsNoTracking().Where(y => y.Id == yearId);
}
