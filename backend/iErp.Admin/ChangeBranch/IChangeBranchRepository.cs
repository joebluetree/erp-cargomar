using iErp.Entities;

namespace iErp.Admin.ChangeBranch;

/// <summary>Reads what a logged-in user may switch to. Read-only: it has no write methods.</summary>
public interface IChangeBranchRepository
{
    /// <summary>The user if they may still work (not locked, not deleted).</summary>
    Task<User?> FindActiveUserAsync(string userId, CancellationToken ct = default);

    /// <summary>The not-deleted company (type "C") with this id.</summary>
    Task<Company?> FindCompanyAsync(string companyId, CancellationToken ct = default);

    /// <summary>The branches allotted to the user (USERD) that are not-deleted branches of the company, by name.</summary>
    Task<IReadOnlyList<Company>> ListBranchesAsync(string userId, string companyId, CancellationToken ct = default);

    /// <summary>One of <see cref="ListBranchesAsync"/>'s branches by id, or null when it is not among them.</summary>
    Task<Company?> FindBranchAsync(string userId, string companyId, string branchId, CancellationToken ct = default);

    /// <summary>The company's open financial years (YEAR_CLOSED = 'N'), newest first.</summary>
    Task<IReadOnlyList<FinancialYear>> ListYearsAsync(string companyCode, CancellationToken ct = default);

    /// <summary>The company's open financial year with this id, or null when it is closed or of another company.</summary>
    Task<FinancialYear?> FindYearAsync(string companyCode, string yearId, CancellationToken ct = default);
}
