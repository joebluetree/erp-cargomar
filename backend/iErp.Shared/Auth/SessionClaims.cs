namespace iErp.Shared.Auth;

/// <summary>The claim names the access token carries for the logged-in user and working context.</summary>
public static class SessionClaims
{
    public const string UserId = "sub";
    public const string UserCode = "ierp:user_code";
    public const string UserName = "name";
    public const string CompanyId = "ierp:company_id";
    public const string CompanyCode = "ierp:company_code";
    public const string BranchId = "ierp:branch_id";
    public const string YearId = "ierp:year_id";
    /// <summary>Only present when the user has an employee (<c>USERM.USER_EMP_ID</c>).</summary>
    public const string EmployeeId = "ierp:employee_id";
}
