using iErp.Data;
using iErp.Entities;
using Microsoft.EntityFrameworkCore;

namespace iErp.Admin.Login;

/// <summary>
/// Reads the existing USERM, COMPANYM and YEARM tables. They are read-only and keyed by strings, so this does not
/// use the Guid-keyed <c>Repository&lt;T&gt;</c>. The row limits are rewritten for Oracle 10g by
/// <see cref="Oracle10gCompatibilityInterceptor"/>.
/// </summary>
public class LoginRepository(AppDbContext db) : ILoginRepository
{
    public async Task<IReadOnlyList<User>> FindUsersAsync(string userCode, string companyCode, CancellationToken ct = default)
    {
        var user = userCode.Trim().ToUpperInvariant();
        var code = companyCode.Trim().ToUpperInvariant();
        return await db.Set<User>().AsNoTracking()
            .Where(u => u.Code!.Trim().ToUpper() == user && u.CompanyCode!.Trim().ToUpper() == code)
            .Where(u => u.Locked != "Y" && u.Deleted != "Y" && u.DeletedDate == null)
            .ToListAsync(ct);
    }

    public Task<Company?> FindCompanyAsync(string companyCode, CancellationToken ct = default)
    {
        var code = companyCode.Trim().ToUpperInvariant();
        return db.Set<Company>().AsNoTracking()
            .Where(c => c.Type == "C" && c.DeletedDate == null && c.Code!.Trim().ToUpper() == code)
            .FirstOrDefaultAsync(ct);
    }

    public Task<Company?> FindBranchAsync(string branchId, CancellationToken ct = default) =>
        db.Set<Company>().AsNoTracking()
            .Where(c => c.Id == branchId && c.Type == "B" && c.DeletedDate == null)
            .FirstOrDefaultAsync(ct);

    public Task<FinancialYear?> FindLatestYearAsync(string companyCode, CancellationToken ct = default) =>
        db.Set<FinancialYear>().AsNoTracking()
            .Where(y => y.CompanyCode == companyCode && y.StartDate != null)
            .OrderByDescending(y => y.StartDate)
            .FirstOrDefaultAsync(ct);
}
