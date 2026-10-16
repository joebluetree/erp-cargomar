using iErp.Entities;
using iErp.Shared.Auth;

namespace iErp.Admin.EmployeeProfile;

/// <summary>
/// The employees a session may list and open: those of its company and branch who are not relieved (admin-emp-list
/// design D1). <c>EMPM</c> holds the branch's code (<c>COMPANYM.COMP_CODE</c>), not its id.
/// </summary>
public record EmployeeScope(string CompanyCode, string BranchCode)
{
    /// <summary>The value of <c>EMP_IS_RELIEVED</c> for an employee who has not left.</summary>
    public const string NotRelieved = "N";

    /// <summary>Restricts <paramref name="employees"/> to this scope. Plain string comparisons, so it works on Oracle 10g.</summary>
    public IQueryable<Employee> Apply(IQueryable<Employee> employees) =>
        employees.Where(e => e.CompanyCode == CompanyCode && e.BranchCode == BranchCode && e.Relieved == NotRelieved);
}

/// <summary>Builds the session's <see cref="EmployeeScope"/>.</summary>
public interface IEmployeeScopeResolver
{
    /// <summary>
    /// The scope of the current session, or null when it has no company or branch, or the branch is not found (then
    /// no employee is in scope).
    /// </summary>
    Task<EmployeeScope?> ResolveAsync(CancellationToken ct = default);
}

/// <summary>Takes the company code and branch from the token and looks the branch's code up.</summary>
public class EmployeeScopeResolver(IEmployeeProfileRepository repository, ICurrentSession current) : IEmployeeScopeResolver
{
    public async Task<EmployeeScope?> ResolveAsync(CancellationToken ct = default)
    {
        var companyCode = current.CompanyCode?.Trim();
        var branchId = current.BranchId?.Trim();
        if (string.IsNullOrEmpty(companyCode) || string.IsNullOrEmpty(branchId))
            return null;

        var branchCode = (await repository.FindBranchCodeAsync(branchId, ct))?.Trim();
        return string.IsNullOrEmpty(branchCode) ? null : new EmployeeScope(companyCode, branchCode);
    }
}
