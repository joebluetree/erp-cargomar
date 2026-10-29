using iErp.Shared.Auth;

namespace iErp.Admin.UserRights;

/// <summary>
/// The view-right check behind <see cref="RequiresMenuAttribute"/>: the session company's new-software menu with the
/// code, and the session user's view right on it in the session branch; and their admin right there. Without a user,
/// company or branch both are false.
/// </summary>
public class MenuAccess(IMenuRepository repository, ICurrentSession current) : IMenuAccess
{
    public async Task<bool> CanViewAsync(string menuCode, CancellationToken ct = default) =>
        Session(menuCode) is var (code, companyCode, userId, branchId)
        && await repository.HasViewRightAsync(code, companyCode, userId, branchId, ct);

    public async Task<bool> IsAdminAsync(string menuCode, CancellationToken ct = default)
    {
        if (Session(menuCode) is not var (code, companyCode, userId, branchId))
            return false;

        var rows = await repository.ListRightsAsync([code], companyCode, userId, branchId, ct);
        // At most one row per user, menu and branch; the first wins should the data hold more. The flag is compared
        // trimmed and in any case, as the other rights are read.
        return rows.FirstOrDefault() is { } row
            && string.Equals(row.Right.Admin?.Trim(), MenuRepository.Yes, StringComparison.OrdinalIgnoreCase);
    }

    private (string Code, string CompanyCode, string UserId, string BranchId)? Session(string menuCode)
    {
        var companyCode = current.CompanyCode?.Trim();
        var userId = current.UserId?.Trim();
        var branchId = current.BranchId?.Trim();
        return string.IsNullOrEmpty(companyCode) || string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(branchId) || string.IsNullOrWhiteSpace(menuCode)
            ? null
            : (menuCode.Trim(), companyCode, userId, branchId);
    }
}
