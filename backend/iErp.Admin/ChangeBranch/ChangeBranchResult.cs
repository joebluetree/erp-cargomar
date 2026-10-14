using iErp.Admin.Login;

namespace iErp.Admin.ChangeBranch;

public enum ChangeBranchOutcome
{
    Success,
    /// <summary>The session's user or company no longer exists or may no longer work: the session is over.</summary>
    SessionGone,
    BranchNotAllowed,
    YearNotAllowed
}

/// <summary>What a switch came to. <see cref="Response"/> (the new token and session) is set only on success.</summary>
public record ChangeBranchResult(ChangeBranchOutcome Outcome, LoginResponse? Response = null)
{
    public const string SessionGoneMessage = "Your session is no longer valid. Please log in again.";
    public const string BranchNotAllowedMessage = "This branch is not available to you.";
    public const string YearNotAllowedMessage = "This financial year is not available for your company.";
}
