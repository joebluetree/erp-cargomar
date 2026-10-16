using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using iErp.Admin.Session;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Shared.Lib;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace iErp.Admin.Login;

/// <summary>
/// Checks the credentials, finds the user's default branch and the company's latest financial year, and issues the
/// access token. Every credential failure has the same outcome and message, and the password is never logged.
/// </summary>
public class LoginService(
    ILoginRepository repository,
    ISessionTokenIssuer tokens,
    IOptions<JwtOptions> jwtOptions,
    TimeProvider time,
    ILogger<LoginService> logger) : ILoginService
{
    public async Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var userCode = request.UserCode!.Trim();
        var companyCode = request.CompanyCode!.Trim();

        var users = await repository.FindUsersAsync(userCode, companyCode, ct);
        var company = await repository.FindCompanyAsync(companyCode, ct);

        if (users.Count > 1)
            logger.LogError("Login refused: {Count} users with code {UserCode} in company {CompanyCode}", users.Count, userCode, companyCode);

        var user = users.Count == 1 ? users[0] : null;
        // Compare even when there is no user, so the response time does not tell whether the user code exists.
        var passwordMatches = PasswordMatches(user?.Password, request.Password!);

        if (user is null || company is null || !passwordMatches)
        {
            logger.LogWarning("Login failed for user {UserCode} of company {CompanyCode}", userCode, companyCode);
            return new LoginResult(LoginOutcome.InvalidCredentials);
        }

        var branch = string.IsNullOrWhiteSpace(user.BranchId) ? null : await repository.FindBranchAsync(user.BranchId, ct);
        if (branch is null || branch.ParentId != company.Id)
        {
            logger.LogWarning("Login refused for user {UserCode} of company {CompanyCode}: no default branch", userCode, companyCode);
            return new LoginResult(LoginOutcome.NoBranch);
        }

        var year = await repository.FindLatestYearAsync(company.Code!, ct);
        if (year is null)
        {
            logger.LogWarning("Login refused for user {UserCode} of company {CompanyCode}: no financial year", userCode, companyCode);
            return new LoginResult(LoginOutcome.NoYear);
        }

        var session = new SessionDto(
            user.Code ?? "", user.Name ?? "",
            company.Id, company.Code ?? "", company.Name ?? "",
            branch.Id, branch.Name ?? "",
            year.Id, year.Code?.ToString(CultureInfo.InvariantCulture) ?? "", year.Name ?? "",
            SessionDto.CleanEmployeeId(user.EmployeeId));
        var expiresAt = time.GetUtcNow().AddMinutes(jwtOptions.Value.LifetimeMinutes);
        var token = tokens.Issue(user.Id, session, expiresAt);
        return new LoginResult(LoginOutcome.Success, new LoginResponse(token, expiresAt, session));
    }

    /// <summary>
    /// Compares the typed password with the stored one in fixed time. USERM holds the legacy system's encrypted values,
    /// so the typed password is encrypted the same way (<see cref="Lib.Encrypt"/>) and the two encrypted texts are
    /// compared; the stored password is never decrypted.
    /// </summary>
    private static bool PasswordMatches(string? stored, string typed)
    {
        var storedBytes = Encoding.UTF8.GetBytes(stored ?? "");
        var typedBytes = Encoding.UTF8.GetBytes(Lib.Encrypt(typed));
        return CryptographicOperations.FixedTimeEquals(storedBytes, typedBytes) && !string.IsNullOrEmpty(stored);
    }
}
