using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using iErp.Admin.ChangeBranch;
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
/// The automatic login runs the same credential check with the details of the user's APPDETAILS row.
/// </summary>
public class LoginService(
    ILoginRepository repository,
    IChangeBranchRepository switchable,
    ISessionTokenIssuer tokens,
    IOptions<JwtOptions> jwtOptions,
    TimeProvider time,
    ILogger<LoginService> logger) : ILoginService
{
    public async Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var userCode = request.UserCode!.Trim();
        var companyCode = request.CompanyCode!.Trim();

        var credentials = await CheckCredentialsAsync(userCode, companyCode, request.Password!, ct);
        if (credentials is null)
        {
            logger.LogWarning("Login failed for user {UserCode} of company {CompanyCode}", userCode, companyCode);
            return new LoginResult(LoginOutcome.InvalidCredentials);
        }

        var (user, company) = credentials.Value;
        var branch = await DefaultBranchAsync(user, company, ct);
        if (branch is null)
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

        return new LoginResult(LoginOutcome.Success, Issue(user, company, branch, year));
    }

    /// <summary>
    /// Logs in with the user's APPDETAILS row, only while its USER_LOGGED_OUT is "N". The row's plain password is
    /// checked in upper case, as the login screen sends a typed one. The row's branch and year are used when the user
    /// may switch to them; empty ones fall back to the login's defaults. Every failure has the same outcome; the
    /// reason is logged without the app id or the password.
    /// </summary>
    public async Task<AutoLoginResult> AutoLoginAsync(AutoLoginRequest request, CancellationToken ct = default)
    {
        var rows = await repository.FindAppDetailsAsync(request.AppId!.Trim(), ct);
        if (rows.Count != 1)
        {
            logger.LogWarning("Automatic login failed: {Count} login details rows for the app id", rows.Count);
            return Failed();
        }

        var row = rows[0];
        var userCode = row.UserCode?.Trim() ?? "";
        var companyCode = row.CompanyCode?.Trim() ?? "";
        if (!string.Equals(row.LoggedOut?.Trim(), "N", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("Automatic login failed for user {UserCode} of company {CompanyCode}: logged out", userCode, companyCode);
            return Failed();
        }

        var credentials = userCode.Length == 0 || companyCode.Length == 0
            ? null
            : await CheckCredentialsAsync(userCode, companyCode, (row.Password ?? "").ToUpperInvariant(), ct);
        if (credentials is null)
        {
            logger.LogWarning("Automatic login failed for user {UserCode} of company {CompanyCode}: invalid credentials", userCode, companyCode);
            return Failed();
        }

        var (user, company) = credentials.Value;
        var branch = string.IsNullOrWhiteSpace(row.BranchId)
            ? await DefaultBranchAsync(user, company, ct)
            : await switchable.FindBranchAsync(user.Id, company.Id, row.BranchId.Trim(), ct);
        if (branch is null)
        {
            logger.LogWarning("Automatic login failed for user {UserCode} of company {CompanyCode}: branch not allowed", userCode, companyCode);
            return Failed();
        }

        var year = string.IsNullOrWhiteSpace(row.YearId)
            ? await repository.FindLatestYearAsync(company.Code!, ct)
            : await switchable.FindYearAsync(company.Code ?? "", row.YearId.Trim(), ct);
        if (year is null)
        {
            logger.LogWarning("Automatic login failed for user {UserCode} of company {CompanyCode}: year not allowed", userCode, companyCode);
            return Failed();
        }

        return new AutoLoginResult(AutoLoginOutcome.Success, Issue(user, company, branch, year));
    }

    private static AutoLoginResult Failed() => new(AutoLoginOutcome.Failed);

    /// <summary>The user and the company when the credentials are right, else null. Both logins use it.</summary>
    private async Task<(User User, Company Company)?> CheckCredentialsAsync(
        string userCode, string companyCode, string password, CancellationToken ct)
    {
        var users = await repository.FindUsersAsync(userCode, companyCode, ct);
        var company = await repository.FindCompanyAsync(companyCode, ct);

        if (users.Count > 1)
            logger.LogError("Login refused: {Count} users with code {UserCode} in company {CompanyCode}", users.Count, userCode, companyCode);

        var user = users.Count == 1 ? users[0] : null;
        // Compare even when there is no user, so the response time does not tell whether the user code exists.
        var passwordMatches = PasswordMatches(user?.Password, password);

        return user is null || company is null || !passwordMatches ? null : (user, company);
    }

    /// <summary>The user's default branch when it is a branch of the company, else null.</summary>
    private async Task<Company?> DefaultBranchAsync(User user, Company company, CancellationToken ct)
    {
        var branch = string.IsNullOrWhiteSpace(user.BranchId) ? null : await repository.FindBranchAsync(user.BranchId, ct);
        return branch is null || branch.ParentId != company.Id ? null : branch;
    }

    private LoginResponse Issue(User user, Company company, Company branch, FinancialYear year)
    {
        var session = new SessionDto(
            user.Code ?? "", user.Name ?? "",
            company.Id, company.Code ?? "", company.Name ?? "",
            branch.Id, branch.Name ?? "",
            year.Id, year.Code?.ToString(CultureInfo.InvariantCulture) ?? "", year.Name ?? "",
            SessionDto.CleanEmployeeId(user.EmployeeId));
        var expiresAt = time.GetUtcNow().AddMinutes(jwtOptions.Value.LifetimeMinutes);
        var token = tokens.Issue(user.Id, session, expiresAt);
        return new LoginResponse(token, expiresAt, session);
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
