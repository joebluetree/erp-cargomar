using iErp.Entities;

namespace iErp.Admin.EmployeeProfile;

/// <summary>Reads an employee and the names of their states and countries. Read-only: it has no write methods.</summary>
public interface IEmployeeProfileRepository
{
    /// <summary>The employee (EMPM) with this id, or null when there is none.</summary>
    Task<Employee?> FindEmployeeAsync(string employeeId, CancellationToken ct = default);

    /// <summary>The employee with this id if they are in <paramref name="scope"/>, or null.</summary>
    Task<Employee?> FindInScopeAsync(string employeeId, EmployeeScope scope, CancellationToken ct = default);

    /// <summary>The code (<c>COMPANYM.COMP_CODE</c>) of the branch with this id, or null when there is no such branch.</summary>
    Task<string?> FindBranchCodeAsync(string branchId, CancellationToken ct = default);


    /// <summary>The PARAM rows of type STATE or COUNTRY whose id is one of <paramref name="ids"/>.</summary>
    Task<IReadOnlyList<Parameter>> ListPlacesAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default);
}
