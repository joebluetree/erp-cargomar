using iErp.Data;
using iErp.Entities;
using Microsoft.EntityFrameworkCore;

namespace iErp.Admin.ChangeBranch;

/// <summary>
/// Reads USERD, COMPANYM, YEARM and USERM, all read-only and keyed by strings, so this does not use the Guid-keyed
/// <c>Repository&lt;T&gt;</c>. The allowed branches are the user's USERD rows that are branches of the session's company.
/// </summary>
public class ChangeBranchRepository(AppDbContext db) : IChangeBranchRepository
{
    public Task<User?> FindActiveUserAsync(string userId, CancellationToken ct = default) =>
        db.Set<User>().AsNoTracking()
            .Where(u => u.Id == userId && u.Locked != "Y" && u.Deleted != "Y" && u.DeletedDate == null)
            .FirstOrDefaultAsync(ct);

    public Task<Company?> FindCompanyAsync(string companyId, CancellationToken ct = default) =>
        db.Set<Company>().AsNoTracking()
            .Where(c => c.Id == companyId && c.Type == "C" && c.DeletedDate == null)
            .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<Company>> ListBranchesAsync(string userId, string companyId, CancellationToken ct = default) =>
        await AllowedBranches(userId, companyId).OrderBy(c => c.Name).ThenBy(c => c.Id).ToListAsync(ct);

    public Task<Company?> FindBranchAsync(string userId, string companyId, string branchId, CancellationToken ct = default) =>
        AllowedBranches(userId, companyId).Where(c => c.Id == branchId).FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<FinancialYear>> ListYearsAsync(string companyCode, CancellationToken ct = default) =>
        await Years(companyCode).ToListAsync(ct);

    public Task<FinancialYear?> FindYearAsync(string companyCode, string yearId, CancellationToken ct = default) =>
        db.Set<FinancialYear>().AsNoTracking()
            .Where(y => y.Id == yearId && y.CompanyCode == companyCode && y.Closed == "N")
            .FirstOrDefaultAsync(ct);

    /// <summary>The company's open years (YEAR_CLOSED = 'N'), newest first. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<FinancialYear> Years(string companyCode) =>
        db.Set<FinancialYear>().AsNoTracking()
            .Where(y => y.CompanyCode == companyCode && y.Closed == "N")
            // Newest first; a year without a start date goes last (Oracle would put NULLs first in a descending sort).
            // Sorted on a number, not a bool: Oracle 10g has no TRUE/FALSE literals for EF's CASE.
            .OrderBy(y => y.StartDate == null ? 1 : 0).ThenByDescending(y => y.StartDate).ThenBy(y => y.Id);

    /// <summary>The user's allotted branches of the company. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<Company> AllowedBranches(string userId, string companyId) =>
        from allotted in db.Set<UserBranch>().AsNoTracking()
        join branch in db.Set<Company>().AsNoTracking() on allotted.BranchId equals branch.Id
        where allotted.UserId == userId && branch.Type == "B" && branch.DeletedDate == null && branch.ParentId == companyId
        select branch;
}
