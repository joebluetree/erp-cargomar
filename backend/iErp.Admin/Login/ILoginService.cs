namespace iErp.Admin.Login;

public interface ILoginService
{
    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default);

    /// <summary>Logs in with the login details of the user's APPDETAILS row (admin-auto-login).</summary>
    Task<AutoLoginResult> AutoLoginAsync(AutoLoginRequest request, CancellationToken ct = default);

    /// <summary>
    /// Who a common view request is for: the user and working context of the user's APPDETAILS row, without checking
    /// login credentials; null when the link is not valid (admin-common-endpoint).
    /// </summary>
    Task<CommonViewIdentity?> ResolveCommonViewAsync(string appId, CancellationToken ct = default);
}

/// <summary>The user (<c>USERM</c> id) and the session details a valid common view link stands for.</summary>
public record CommonViewIdentity(string UserId, SessionDto Session);
