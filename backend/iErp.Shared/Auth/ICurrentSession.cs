namespace iErp.Shared.Auth;

/// <summary>
/// The logged-in user and working context (company, branch, financial year) of the current request, taken from its
/// access token. Services use it to scope their data; the values are never taken from request parameters.
/// </summary>
public interface ICurrentSession
{
    bool IsAuthenticated { get; }
    /// <summary>The user's internal id (<c>USERM.USER_PKID</c>, the token's <c>sub</c>).</summary>
    string? UserId { get; }
    string? UserCode { get; }
    /// <summary>The user's employee (<c>USERM.USER_EMP_ID</c>); null when the user has none.</summary>
    string? EmployeeId { get; }
    string? CompanyId { get; }
    string? CompanyCode { get; }
    string? BranchId { get; }
    string? YearId { get; }
}
