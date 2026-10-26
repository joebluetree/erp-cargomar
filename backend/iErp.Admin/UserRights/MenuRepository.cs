using iErp.Data;
using iErp.Entities;
using Microsoft.EntityFrameworkCore;

namespace iErp.Admin.UserRights;

/// <summary>The menus a user may see, their modules, and the user's rights on a menu (design D2).</summary>
public interface IMenuRepository
{
    /// <summary>The company's new-software menus on which the user has the view right in the branch.</summary>
    Task<IReadOnlyList<Menu>> ListVisibleMenusAsync(string companyCode, string userId, string branchId, CancellationToken ct = default);

    /// <summary>The company's modules with these ids.</summary>
    Task<IReadOnlyList<MenuModule>> ListModulesAsync(string companyCode, IReadOnlyCollection<string> ids, CancellationToken ct = default);

    /// <summary>
    /// The user's rights rows in the branch on the company's new-software menus with these codes, each with its menu's
    /// code. A code without such a menu or row has no entry.
    /// </summary>
    Task<IReadOnlyList<MenuCodeRight>> ListRightsAsync(IReadOnlyCollection<string> codes, string companyCode, string userId, string branchId, CancellationToken ct = default);

    /// <summary>True when the user has the view right in the branch on the company's new-software menu with this code.</summary>
    Task<bool> HasViewRightAsync(string menuCode, string companyCode, string userId, string branchId, CancellationToken ct = default);
}

/// <summary>A user's rights row with the code of its menu.</summary>
public record MenuCodeRight(string? Code, UserRight Right);

/// <summary>
/// Reads MENUM, MODULEM and USERRIGHTS, all read-only and keyed by strings. "May see a menu" is one rule: the session
/// company's menu, marked for the new software, with the view right for the user in the branch. Flags are compared with
/// "Y" as strings, so the SQL holds no bool literal (Oracle 10g).
/// </summary>
public class MenuRepository(AppDbContext db) : IMenuRepository
{
    public const string Yes = "Y";

    public async Task<IReadOnlyList<Menu>> ListVisibleMenusAsync(string companyCode, string userId, string branchId, CancellationToken ct = default) =>
        await VisibleMenus(companyCode, userId, branchId).ToListAsync(ct);

    public async Task<IReadOnlyList<MenuModule>> ListModulesAsync(string companyCode, IReadOnlyCollection<string> ids, CancellationToken ct = default) =>
        ids.Count == 0
            ? []
            : await db.Set<MenuModule>().AsNoTracking().Where(m => m.CompanyCode == companyCode && ids.Contains(m.Id)).ToListAsync(ct);

    public async Task<IReadOnlyList<MenuCodeRight>> ListRightsAsync(IReadOnlyCollection<string> codes, string companyCode, string userId, string branchId, CancellationToken ct = default) =>
        codes.Count == 0 ? [] : await RightsByCode(codes, companyCode, userId, branchId).ToListAsync(ct);

    /// <summary>The rights rows behind <see cref="ListRightsAsync"/>. Public so tests can check the SQL for Oracle 10g.</summary>
    public IQueryable<MenuCodeRight> RightsByCode(IReadOnlyCollection<string> codes, string companyCode, string userId, string branchId) =>
        from m in NewSoftwareMenus(companyCode)
        where codes.Contains(m.Code!)
        join r in db.Set<UserRight>().AsNoTracking() on m.Id equals r.MenuId
        where r.UserId == userId && r.BranchId == branchId
        select new MenuCodeRight(m.Code, r);

    // Not AnyAsync: EF turns it into CASE WHEN EXISTS (...) THEN TRUE ELSE FALSE, and Oracle 10g has no TRUE or FALSE.
    public async Task<bool> HasViewRightAsync(string menuCode, string companyCode, string userId, string branchId, CancellationToken ct = default) =>
        await ViewRightIds(menuCode, companyCode, userId, branchId).FirstOrDefaultAsync(ct) is not null;

    /// <summary>The visible menus. Public so tests can check the SQL it produces for Oracle 10g.</summary>
    public IQueryable<Menu> VisibleMenus(string companyCode, string userId, string branchId) =>
        NewSoftwareMenus(companyCode).Where(m => db.Set<UserRight>()
            .Any(r => r.MenuId == m.Id && r.UserId == userId && r.BranchId == branchId && r.View == Yes));

    /// <summary>
    /// The view-right check by menu code: the ids of the visible menus with the code. The check reads the first with
    /// FirstOrDefault, which the 10g interceptor turns into ROWNUM; no Take here, which would nest a FETCH FIRST (12c
    /// syntax) the interceptor does not rewrite. Public so tests can check the SQL on Oracle 10g.
    /// </summary>
    public IQueryable<string> ViewRightIds(string menuCode, string companyCode, string userId, string branchId) =>
        VisibleMenus(companyCode, userId, branchId).Where(m => m.Code == menuCode).Select(m => m.Id);

    private IQueryable<Menu> NewSoftwareMenus(string companyCode) =>
        db.Set<Menu>().AsNoTracking().Where(m => m.CompanyCode == companyCode && m.NewSoftware == Yes);
}
