namespace iErp.Admin.Login;

public enum AutoLoginOutcome
{
    Success,
    Failed
}

/// <summary>
/// What an automatic login came to. Every failure has the one outcome and message, so the answer never tells why;
/// the reason is only logged. <see cref="Response"/> is set only on success.
/// </summary>
public record AutoLoginResult(AutoLoginOutcome Outcome, LoginResponse? Response = null)
{
    public const string FailedMessage = "Automatic login failed. Please log in.";

    /// <summary>The one answer of a failed common view login (admin-common-endpoint).</summary>
    public const string CommonViewFailedMessage = "This link is not valid.";
}
