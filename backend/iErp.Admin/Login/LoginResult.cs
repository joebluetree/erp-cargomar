namespace iErp.Admin.Login;

public enum LoginOutcome
{
    Success,
    InvalidCredentials,
    NoBranch,
    NoYear
}

/// <summary>What a login attempt came to. <see cref="Response"/> is set only on success.</summary>
public record LoginResult(LoginOutcome Outcome, LoginResponse? Response = null)
{
    public const string InvalidCredentialsMessage = "Invalid user code, password or company code.";
    public const string NoBranchMessage = "No default branch is set for this user.";
    public const string NoYearMessage = "No financial year is set up for this company.";
}
