using iErp.Admin.EmployeeProfile;
using iErp.Data;
using iErp.Entities;
using Microsoft.EntityFrameworkCore;

namespace iErp.Admin.EmployeeList;

/// <summary>Reads one page of the employees in a scope. Read-only: it has no write methods.</summary>
public interface IEmployeeListRepository
{
    Task<(IReadOnlyList<Employee> Items, int Total)> ListAsync(
        EmployeeListQuery query, EmployeeScope scope, CancellationToken ct = default);

    /// <summary>The company's branches (deleted or not) with these codes, for the names in the Branch column.</summary>
    Task<IReadOnlyList<Company>> ListBranchesByCodeAsync(string companyId, IReadOnlyCollection<string> codes, CancellationToken ct = default);
}

/// <summary>
/// Reads EMPM (read-only, string keys) on <see cref="AppDbContext"/> directly, like the other legacy-table reads.
/// </summary>
public class EmployeeListRepository(AppDbContext db) : IEmployeeListRepository
{
    public Task<(IReadOnlyList<Employee> Items, int Total)> ListAsync(
        EmployeeListQuery query, EmployeeScope scope, CancellationToken ct = default) =>
        Employees(query, scope).ToPageAsync(query.Page, query.PageSize, ct);

    public async Task<IReadOnlyList<Company>> ListBranchesByCodeAsync(
        string companyId, IReadOnlyCollection<string> codes, CancellationToken ct = default) =>
        codes.Count == 0 ? [] : await BranchesByCode(companyId, codes).ToListAsync(ct);

    /// <summary>
    /// The company's branches with these codes: an <c>IN</c> of constants, no JSON collection parameter. Public so tests
    /// can check the SQL it produces for Oracle 10g.
    /// </summary>
    public IQueryable<Company> BranchesByCode(string companyId, IReadOnlyCollection<string> codes) =>
        db.Set<Company>().AsNoTracking()
            .Where(c => c.Type == EmployeeProfileRepository.BranchType && c.ParentId == companyId && codes.Contains(c.Code!));

    /// <summary>
    /// The scope, the status, the filters and the order. Public so tests can check the SQL it produces for Oracle 10g.
    /// </summary>
    public IQueryable<Employee> Employees(EmployeeListQuery query, EmployeeScope scope)
    {
        var employees = scope.Apply(db.Set<Employee>().AsNoTracking());

        // The status narrows the scope; "all" leaves EMP_IS_RELIEVED unchecked (admin-emp-status design D1).
        employees = EmployeeStatus.Normalize(query.Status) switch
        {
            EmployeeStatus.Relieved => employees.Where(e => e.Relieved == EmployeeStatus.RelievedFlag),
            EmployeeStatus.All => employees,
            _ => employees.Where(e => e.Relieved == EmployeeStatus.NotRelievedFlag),
        };

        // Case-insensitive "contains". string.Contains on Oracle becomes INSTR, so % and _ are ordinary characters.
        var code = query.Code?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(code))
            employees = employees.Where(e => e.Code != null && e.Code.ToUpper().Contains(code));

        var name = query.Name?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(name))
            employees = employees.Where(e => e.Name != null && e.Name.ToUpper().Contains(name));

        // The id breaks ties between equal names, so pages never overlap or skip an employee.
        return employees.OrderBy(e => e.Name).ThenBy(e => e.Id);
    }
}
