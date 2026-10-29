using iErp.Admin.ChangeBranch;
using iErp.Entities;
using iErp.Shared.Auth;

namespace iErp.Admin.EmployeeProfile;

/// <summary>
/// The employees a session may list and open: those of its company and of the branches in <see cref="BranchCodes"/>,
/// relieved or not (admin-emp-list design D1, admin-emp-status design D1, D5). <c>EMPM</c> holds a branch's code
/// (<c>COMPANYM.COMP_CODE</c>), not its id. The Employee List narrows it further by status
/// (<see cref="EmployeeList.EmployeeStatus"/>).
/// </summary>
public record EmployeeScope(string CompanyCode, IReadOnlyList<string> BranchCodes)
{
    /// <summary>The scope of one branch.</summary>
    public EmployeeScope(string companyCode, string branchCode) : this(companyCode, [branchCode]) { }

    /// <summary>
    /// Restricts <paramref name="employees"/> to this scope. Plain string comparisons, and an <c>IN</c> of constants for
    /// the branches (no JSON collection parameter), so it works on Oracle 10g.
    /// </summary>
    public IQueryable<Employee> Apply(IQueryable<Employee> employees)
    {
        var codes = BranchCodes;
        return employees.Where(e => e.CompanyCode == CompanyCode && codes.Contains(e.BranchCode!));
    }

    /// <summary>Two scopes are equal when they have the same company and the same branch codes in the same order.</summary>
    public virtual bool Equals(EmployeeScope? other) =>
        other is not null && CompanyCode == other.CompanyCode && BranchCodes.SequenceEqual(other.BranchCodes);

    public override int GetHashCode() => BranchCodes.Aggregate(CompanyCode.GetHashCode(), HashCode.Combine);
}

/// <summary>Why the list's scope could not be built from the <c>branch</c> asked for (admin-emp-status design D5).</summary>
public enum BranchChoiceError
{
    None,
    /// <summary>The branch asked for is not one of the user's allowed branches (or the user is no admin of the list).</summary>
    NotAllowed,
}

/// <summary>The list's scope, or why the branch asked for is refused. A null scope without an error lists nothing.</summary>
public record EmployeeListScope(EmployeeScope? Scope, BranchChoiceError Error = BranchChoiceError.None);

/// <summary>Builds the session's <see cref="EmployeeScope"/>s and its allowed branches.</summary>
public interface IEmployeeScopeResolver
{
    /// <summary>The value of <c>branch</c> that lists every allowed branch, matched in any letter case.</summary>
    public const string AllBranches = "all";

    /// <summary>
    /// The Employee List's scope for the <paramref name="branch"/> asked for: the session's branch when it is blank or the
    /// session's; every allowed branch for <c>all</c>; an allowed branch by its id; refused otherwise. No scope (and no
    /// error) when the session has no company or branch, or its branch is not found.
    /// </summary>
    Task<EmployeeListScope> ResolveListAsync(string? branch, CancellationToken ct = default);

    /// <summary>
    /// The scope of a listed employee's profile and photo: every allowed branch, which is the session's branch alone for
    /// a user who is no admin of the list; null as for <see cref="ResolveListAsync"/>.
    /// </summary>
    Task<EmployeeScope?> ResolveProfileAsync(CancellationToken ct = default);

    /// <summary>
    /// The allowed branches (the branches of the company assigned to the user) by name, then id; empty for a user without
    /// the admin right in the session branch.
    /// </summary>
    Task<IReadOnlyList<Company>> ListAllowedBranchesAsync(CancellationToken ct = default);
}

/// <summary>
/// Takes the company and branch from the token, looks the branch's code up, and, with the admin right on the Employee
/// List in the session branch, widens the scope to the branches assigned to the user (admin-emp-status design D4, D5).
/// The assigned branches are those the Change Branch dialog offers, read by its repository.
/// </summary>
public class EmployeeScopeResolver(
    IEmployeeProfileRepository repository,
    IChangeBranchRepository assigned,
    ICurrentSession current,
    IMenuAccess access) : IEmployeeScopeResolver
{
    public async Task<EmployeeListScope> ResolveListAsync(string? branch, CancellationToken ct = default)
    {
        var session = await SessionScopeAsync(ct);
        var asked = branch?.Trim();
        if (session is null || string.IsNullOrEmpty(asked) || asked == current.BranchId?.Trim())
            return new EmployeeListScope(session);

        var allowed = await ListAllowedBranchesAsync(ct);
        if (string.Equals(asked, IEmployeeScopeResolver.AllBranches, StringComparison.OrdinalIgnoreCase))
            return allowed.Count == 0
                ? new EmployeeListScope(null, BranchChoiceError.NotAllowed)
                : new EmployeeListScope(session with { BranchCodes = Codes(session, allowed) });

        var code = allowed.FirstOrDefault(b => b.Id.Trim() == asked)?.Code?.Trim();
        return string.IsNullOrEmpty(code)
            ? new EmployeeListScope(null, BranchChoiceError.NotAllowed)
            : new EmployeeListScope(session with { BranchCodes = [code] });
    }

    public async Task<EmployeeScope?> ResolveProfileAsync(CancellationToken ct = default)
    {
        var session = await SessionScopeAsync(ct);
        if (session is null)
            return null;

        var allowed = await ListAllowedBranchesAsync(ct);
        return allowed.Count == 0 ? session : session with { BranchCodes = Codes(session, allowed) };
    }

    public async Task<IReadOnlyList<Company>> ListAllowedBranchesAsync(CancellationToken ct = default)
    {
        var companyId = current.CompanyId?.Trim();
        var userId = current.UserId?.Trim();
        if (string.IsNullOrEmpty(companyId) || string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(current.BranchId?.Trim()))
            return [];
        // Only with the admin right in the session branch; then the user's assigned branches of the session company, with
        // no rights checked there. The session's branch is always in the scopes (Codes), assigned or not.
        if (!await access.IsAdminAsync(MenuCodes.EmployeeList, ct))
            return [];
        return await assigned.ListBranchesAsync(userId, companyId, ct);
    }

    /// <summary>The session's branch code and the codes of the allowed branches, each once.</summary>
    private static List<string> Codes(EmployeeScope session, IReadOnlyList<Company> allowed) =>
        session.BranchCodes
            .Concat(allowed.Select(b => b.Code?.Trim()).OfType<string>().Where(c => c.Length > 0))
            .Distinct()
            .ToList();

    /// <summary>The session's company and branch, or null when it has no company or branch, or the branch is not found.</summary>
    private async Task<EmployeeScope?> SessionScopeAsync(CancellationToken ct)
    {
        var companyCode = current.CompanyCode?.Trim();
        var branchId = current.BranchId?.Trim();
        if (string.IsNullOrEmpty(companyCode) || string.IsNullOrEmpty(branchId))
            return null;

        var branchCode = (await repository.FindBranchCodeAsync(branchId, ct))?.Trim();
        return string.IsNullOrEmpty(branchCode) ? null : new EmployeeScope(companyCode, branchCode);
    }
}
