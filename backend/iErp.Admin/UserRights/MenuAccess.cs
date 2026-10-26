using iErp.Shared.Auth;

namespace iErp.Admin.UserRights;

/// <summary>
/// The view-right check behind <see cref="RequiresMenuAttribute"/>: the session company's new-software menu with the
/// code, and the session user's view right on it in the session branch. Without a user, company or branch it is false.
/// </summary>
public class MenuAccess(IMenuRepository repository, ICurrentSession current) : IMenuAccess
{
    public async Task<bool> CanViewAsync(string menuCode, CancellationToken ct = default)
    {
        var companyCode = current.CompanyCode?.Trim();
        var userId = current.UserId?.Trim();
        var branchId = current.BranchId?.Trim();
        if (string.IsNullOrEmpty(companyCode) || string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(branchId) || string.IsNullOrWhiteSpace(menuCode))
            return false;

        return await repository.HasViewRightAsync(menuCode.Trim(), companyCode, userId, branchId, ct);
    }
}
