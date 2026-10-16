namespace iErp.Admin.Login;

/// <summary>A successful login: the access token, when it expires, and the session details to display.</summary>
public record LoginResponse(string Token, DateTimeOffset ExpiresAt, SessionDto Session);

/// <summary>
/// The logged-in user and working context: company, default branch and latest financial year, and the user's employee
/// (<c>USERM.USER_EMP_ID</c>), which is null for users without one.
/// </summary>
public record SessionDto(
    string UserCode, string UserName,
    string CompanyId, string CompanyCode, string CompanyName,
    string BranchId, string BranchName,
    string YearId, string YearCode, string YearName,
    string? EmployeeId)
{
    /// <summary>The stored employee id without surrounding spaces, or null when there is none.</summary>
    public static string? CleanEmployeeId(string? stored) => string.IsNullOrWhiteSpace(stored) ? null : stored.Trim();
}
