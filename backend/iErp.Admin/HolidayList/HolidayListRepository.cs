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

    /// <summary>
    /// The not-deleted branch of the company with this code (trimmed, any case), or null: an uploaded file's branch
    /// (admin-list-upload design D2).
    /// </summary>
    Task<Company?> FindCompanyBranchByCodeAsync(string companyId, string code, CancellationToken ct = default);

    /// <summary>The company's financial year, open or closed, with this code, or null: an uploaded file's year.</summary>
    Task<FinancialYear?> FindCompanyYearByCodeAsync(string companyCode, decimal yearCode, CancellationToken ct = default);
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

    public Task<Company?> FindCompanyBranchByCodeAsync(string companyId, string code, CancellationToken ct = default) =>
        CompanyBranchByCode(companyId, code).FirstOrDefaultAsync(ct);

    public Task<FinancialYear?> FindCompanyYearByCodeAsync(string companyCode, decimal yearCode, CancellationToken ct = default) =>
        CompanyYearByCode(companyCode, yearCode).FirstOrDefaultAsync(ct);

    /// <summary>
    /// The company's not-deleted branch (COMP_TYPE 'B') with this code, compared trimmed and in upper case. Public so
    /// tests can check the SQL it produces for Oracle 10g.
    /// </summary>
    public IQueryable<Company> CompanyBranchByCode(string companyId, string code)
    {
        var wanted = code.Trim().ToUpperInvariant();
        return db.Set<Company>().AsNoTracking().Where(c =>
            c.Type == "B" && c.DeletedDate == null && c.ParentId == companyId && c.Code!.Trim().ToUpper() == wanted);
    }

    /// <summary>The company's year with this code, open or closed. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<FinancialYear> CompanyYearByCode(string companyCode, decimal yearCode) =>
        db.Set<FinancialYear>().AsNoTracking().Where(y => y.CompanyCode == companyCode && y.Code == yearCode);
}
