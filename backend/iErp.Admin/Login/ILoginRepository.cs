using iErp.Entities;

namespace iErp.Admin.Login;

public interface ILoginRepository
{
    /// <summary>Users that may log in (not locked, not deleted) with this user code in this company, ignoring case and spaces.</summary>
    Task<IReadOnlyList<User>> FindUsersAsync(string userCode, string companyCode, CancellationToken ct = default);

    /// <summary>The not-deleted company (type "C") with this code, ignoring case and spaces.</summary>
    Task<Company?> FindCompanyAsync(string companyCode, CancellationToken ct = default);

    /// <summary>The not-deleted branch (type "B") with this id.</summary>
    Task<Company?> FindBranchAsync(string branchId, CancellationToken ct = default);

    /// <summary>The company's financial year with the latest start date.</summary>
    Task<FinancialYear?> FindLatestYearAsync(string companyCode, CancellationToken ct = default);
}
