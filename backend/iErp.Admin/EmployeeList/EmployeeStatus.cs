namespace iErp.Admin.EmployeeList;

/// <summary>
/// The Employee List's status filter (admin-emp-status design D2): current employees, relieved ones, or both. Sent as
/// plain text so an unknown value fails in the validator with a message naming <c>Status</c>.
/// </summary>
public static class EmployeeStatus
{
    /// <summary>Employees who have not left (<c>EMP_IS_RELIEVED</c> 'N'); the default.</summary>
    public const string Active = "active";

    /// <summary>Employees who have left (<c>EMP_IS_RELIEVED</c> 'Y').</summary>
    public const string Relieved = "relieved";

    /// <summary>Every employee in scope, without checking <c>EMP_IS_RELIEVED</c>.</summary>
    public const string All = "all";

    /// <summary>The value of <c>EMP_IS_RELIEVED</c> for an employee who has not left.</summary>
    public const string NotRelievedFlag = "N";

    /// <summary>The value of <c>EMP_IS_RELIEVED</c> for an employee who has left.</summary>
    public const string RelievedFlag = "Y";

    /// <summary>The status trimmed and in lower case; blank means <see cref="Active"/>.</summary>
    public static string Normalize(string? status) =>
        string.IsNullOrWhiteSpace(status) ? Active : status.Trim().ToLowerInvariant();

    /// <summary>Whether the status, once normalised, is one of the three known values.</summary>
    public static bool IsKnown(string? status) => Normalize(status) is Active or Relieved or All;
}
