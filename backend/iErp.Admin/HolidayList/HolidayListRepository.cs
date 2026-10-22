using iErp.Data;
using iErp.Entities;
using Microsoft.EntityFrameworkCore;

namespace iErp.Admin.HolidayList;

/// <summary>What names a holiday file and heads its list: the session's branch, and its financial year's code.</summary>
public interface IHolidayListRepository
{
    /// <summary>The branch (<c>COMPANYM</c>, its code and name), or null when there is no such branch.</summary>
    Task<Company?> FindBranchAsync(string branchId, CancellationToken ct = default);

    /// <summary>The code (<c>YEARM.YEAR_CODE</c>) of the financial year, or null when there is no such year or code.</summary>
    Task<decimal?> FindYearCodeAsync(string yearId, CancellationToken ct = default);
}

/// <summary>Reads COMPANYM and YEARM, both read-only and keyed by strings.</summary>
public class HolidayListRepository(AppDbContext db) : IHolidayListRepository
{
    public Task<Company?> FindBranchAsync(string branchId, CancellationToken ct = default) =>
        Branch(branchId).FirstOrDefaultAsync(ct);

    public Task<decimal?> FindYearCodeAsync(string yearId, CancellationToken ct = default) =>
        Year(yearId).Select(y => y.Code).FirstOrDefaultAsync(ct);

    /// <summary>The branch (COMP_TYPE 'B') by id. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<Company> Branch(string branchId) =>
        db.Set<Company>().AsNoTracking().Where(c => c.Id == branchId && c.Type == "B");

    /// <summary>The financial year by id. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<FinancialYear> Year(string yearId) =>
        db.Set<FinancialYear>().AsNoTracking().Where(y => y.Id == yearId);
}
