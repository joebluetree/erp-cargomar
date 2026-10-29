namespace iErp.Admin.EmployeeProfile;

public interface IEmployeeProfileService
{
    /// <summary>
    /// The session's own employee profile, or null when the session has no employee id or the id names no employee.
    /// </summary>
    Task<EmployeeProfileDto?> GetOwnAsync(CancellationToken ct = default);

    /// <summary>
    /// The session's own photo file, or null when there is no employee, no image name, or no such photo in the folder.
    /// </summary>
    Task<EmployeePhoto?> GetOwnPhotoAsync(CancellationToken ct = default);

    /// <summary>
    /// The profile of the employee with this id when they are in the session's scope (company and branch, or the allowed
    /// branches for an admin of the Employee List, relieved or not); null otherwise, as if there were no such employee.
    /// </summary>
    Task<EmployeeProfileDto?> GetAsync(string employeeId, CancellationToken ct = default);

    /// <summary>The photo of the employee with this id when they are in the session's scope and have one; null otherwise.</summary>
    Task<EmployeePhoto?> GetPhotoAsync(string employeeId, CancellationToken ct = default);
}
