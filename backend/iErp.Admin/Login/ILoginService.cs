namespace iErp.Admin.Login;

public interface ILoginService
{
    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default);

    /// <summary>Logs in with the login details of the user's APPDETAILS row (admin-auto-login).</summary>
    Task<AutoLoginResult> AutoLoginAsync(AutoLoginRequest request, CancellationToken ct = default);
}
