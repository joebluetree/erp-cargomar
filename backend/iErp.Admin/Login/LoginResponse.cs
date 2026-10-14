namespace iErp.Admin.Login;

/// <summary>A successful login: the access token, when it expires, and the session details to display.</summary>
public record LoginResponse(string Token, DateTimeOffset ExpiresAt, SessionDto Session);

/// <summary>The logged-in user and working context: company, default branch and latest financial year.</summary>
public record SessionDto(
    string UserCode, string UserName,
    string CompanyId, string CompanyCode, string CompanyName,
    string BranchId, string BranchName,
    string YearId, string YearCode, string YearName);
