namespace iErp.Admin.Login;

public interface ILoginService
{
    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default);
}
