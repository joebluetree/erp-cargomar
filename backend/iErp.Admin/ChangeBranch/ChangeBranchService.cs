using System.Globalization;
using iErp.Admin.Login;
using iErp.Admin.Session;
using iErp.Entities;
using iErp.Shared.Auth;
using Microsoft.Extensions.Logging;

namespace iErp.Admin.ChangeBranch;

/// <summary>
/// Lists and checks what the logged-in user may switch to. The user and company come from the token
/// (<see cref="ICurrentSession"/>), never from the request; the requested branch and year are re-checked against the
/// same rules as the lists. Nothing is written: the switch lives only in the re-issued token (design D2, D3).
/// </summary>
public class ChangeBranchService(
    IChangeBranchRepository repository,
    ICurrentSession current,
    ISessionTokenIssuer tokens,
    ILogger<ChangeBranchService> logger) : IChangeBranchService
{
    public async Task<SessionOptions?> GetOptionsAsync(CancellationToken ct = default)
    {
        var context = await ContextAsync(ct);
        if (context is null)
            return null;

        var (user, company) = context.Value;
        var branches = await repository.ListBranchesAsync(user.Id, company.Id, ct);
        var years = await repository.ListYearsAsync(company.Code ?? "", ct);
        return new SessionOptions(
            branches.Select(b => new BranchOption(b.Id, b.Name ?? "")).ToList(),
            years.Select(y => new YearOption(y.Id, YearCode(y), y.Name ?? "")).ToList());
    }

    public async Task<ChangeBranchResult> ChangeAsync(ChangeBranchRequest request, DateTimeOffset expiresAt, CancellationToken ct = default)
    {
        var context = await ContextAsync(ct);
        if (context is null)
            return new ChangeBranchResult(ChangeBranchOutcome.SessionGone);

        var (user, company) = context.Value;
        var branch = await repository.FindBranchAsync(user.Id, company.Id, request.BranchId!.Trim(), ct);
        if (branch is null)
        {
            logger.LogWarning("Branch change refused for user {UserCode}: branch {BranchId} is not allotted", user.Code, request.BranchId);
            return new ChangeBranchResult(ChangeBranchOutcome.BranchNotAllowed);
        }

        var year = await repository.FindYearAsync(company.Code ?? "", request.YearId!.Trim(), ct);
        if (year is null)
        {
            logger.LogWarning("Branch change refused for user {UserCode}: year {YearId} is not of company {CompanyCode}",
                user.Code, request.YearId, company.Code);
            return new ChangeBranchResult(ChangeBranchOutcome.YearNotAllowed);
        }

        var session = new SessionDto(
            user.Code ?? "", user.Name ?? "",
            company.Id, company.Code ?? "", company.Name ?? "",
            branch.Id, branch.Name ?? "",
            year.Id, YearCode(year), year.Name ?? "",
            SessionDto.CleanEmployeeId(user.EmployeeId));
        var token = tokens.Issue(user.Id, session, expiresAt);
        logger.LogInformation("User {UserCode} switched to branch {BranchId}, year {YearId}", user.Code, branch.Id, year.Id);
        return new ChangeBranchResult(ChangeBranchOutcome.Success, new LoginResponse(token, expiresAt, session));
    }

    /// <summary>The session's user and company, read again so a locked or removed user cannot keep switching.</summary>
    private async Task<(User User, Company Company)?> ContextAsync(CancellationToken ct)
    {
        if (string.IsNullOrEmpty(current.UserId) || string.IsNullOrEmpty(current.CompanyId))
            return null;

        var user = await repository.FindActiveUserAsync(current.UserId, ct);
        var company = user is null ? null : await repository.FindCompanyAsync(current.CompanyId, ct);
        return user is null || company is null ? null : (user, company);
    }

    private static string YearCode(FinancialYear year) => year.Code?.ToString(CultureInfo.InvariantCulture) ?? "";
}
