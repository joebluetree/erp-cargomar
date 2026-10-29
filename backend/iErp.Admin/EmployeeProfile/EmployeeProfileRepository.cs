using iErp.Data;
using iErp.Entities;
using Microsoft.EntityFrameworkCore;

namespace iErp.Admin.EmployeeProfile;

/// <summary>
/// Reads EMPM and PARAM, both read-only and keyed by strings, so this does not use the Guid-keyed
/// <c>Repository&lt;T&gt;</c>. The state and country names are a second, simple query (design D3).
/// </summary>
public class EmployeeProfileRepository(AppDbContext db) : IEmployeeProfileRepository
{
    /// <summary>The parameter types an address's state and country name.</summary>
    public const string StateType = "STATE";
    public const string CountryType = "COUNTRY";

    /// <summary>The <c>COMP_TYPE</c> of a branch.</summary>
    public const string BranchType = "B";

    public Task<Employee?> FindEmployeeAsync(string employeeId, CancellationToken ct = default) =>
        Employee(employeeId).FirstOrDefaultAsync(ct);

    public Task<Employee?> FindInScopeAsync(string employeeId, EmployeeScope scope, CancellationToken ct = default) =>
        scope.Apply(Employee(employeeId)).FirstOrDefaultAsync(ct);

    public Task<string?> FindBranchCodeAsync(string branchId, CancellationToken ct = default) =>
        Branch(branchId).Select(c => c.Code).FirstOrDefaultAsync(ct);

    /// <summary>The branch (COMP_TYPE 'B') by id. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<Company> Branch(string branchId) =>
        db.Set<Company>().AsNoTracking().Where(c => c.Id == branchId && c.Type == BranchType);

    public async Task<IReadOnlyList<Parameter>> ListPlacesAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default) =>
        ids.Count == 0 ? [] : await Places(ids).ToListAsync(ct);

    /// <summary>The employee by id. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<Employee> Employee(string employeeId) =>
        db.Set<Employee>().AsNoTracking().Where(e => e.Id == employeeId);

    /// <summary>The state and country parameters with these ids. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<Parameter> Places(IReadOnlyCollection<string> ids) =>
        db.Set<Parameter>().AsNoTracking()
            .Where(p => ids.Contains(p.Id) && (p.Type == StateType || p.Type == CountryType));
}
