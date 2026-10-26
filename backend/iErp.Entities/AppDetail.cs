namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>APPDETAILS</c> table: the login details the old system saved for a user,
/// read by the automatic login. It is read-only here; this system never writes or migrates it (not even on logout).
/// </summary>
public class AppDetail
{
    /// <summary>Opaque string key (<c>USER_APPID</c>), passed in the automatic-login link.</summary>
    public string Id { get; set; } = "";
    public string? UserCode { get; set; }
    /// <summary>The password as the user typed it, in plain text (<c>USER_PASSWORD</c>). Never logged or returned.</summary>
    public string? Password { get; set; }
    public string? CompanyCode { get; set; }
    /// <summary>The <see cref="Company.Id"/> of the branch to open (<c>USER_BRANCH_ID</c>).</summary>
    public string? BranchId { get; set; }
    /// <summary>The <see cref="FinancialYear.Id"/> of the year to open (<c>USER_YEAR_ID</c>).</summary>
    public string? YearId { get; set; }
    /// <summary>"N" while the user is logged in to the old system (<c>USER_LOGGED_OUT</c>); only then may they log in automatically.</summary>
    public string? LoggedOut { get; set; }
}
