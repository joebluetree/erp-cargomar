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
}

/// <summary>
/// Reads EMPM (read-only, string keys) on <see cref="AppDbContext"/> directly, like the other legacy-table reads.
/// </summary>
public class EmployeeListRepository(AppDbContext db) : IEmployeeListRepository
{
    public Task<(IReadOnlyList<Employee> Items, int Total)> ListAsync(
        EmployeeListQuery query, EmployeeScope scope, CancellationToken ct = default) =>
        Employees(query, scope).ToPageAsync(query.Page, query.PageSize, ct);

    /// <summary>
    /// The scope, the filters and the order. Public so tests can check the SQL it produces for Oracle 10g.
    /// </summary>
    public IQueryable<Employee> Employees(EmployeeListQuery query, EmployeeScope scope)
    {
        var employees = scope.Apply(db.Set<Employee>().AsNoTracking());

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
