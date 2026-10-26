using iErp.Entities;
using iErp.Shared.Auth;

namespace iErp.Admin.UserRights;

/// <summary>One menu entry: its id, code (passed in the URL as <c>menuId</c>), name and application route.</summary>
public record MenuDto(string Id, string Code, string Name, string Route);

/// <summary>One module with the user's menus under it, in menu order.</summary>
public record ModuleDto(string Id, string Name, IReadOnlyList<MenuDto> Menus);

/// <summary>The logged-in user's menu: modules in module order, only those with at least one menu.</summary>
public record UserMenuDto(IReadOnlyList<ModuleDto> Modules);

/// <summary>The user's rights in the session branch on the menu with this code.</summary>
public record MenuCodeRightsDto(string Code, bool View, bool Add, bool Edit, bool Delete, bool Print, bool Email, bool Docs, bool DocsUpload, bool Admin)
{
    /// <summary>No right at all: no such menu, or no rights row.</summary>
    public static MenuCodeRightsDto None(string code) => new(code, false, false, false, false, false, false, false, false, false);
}

public interface IUserMenuService
{
    /// <summary>The session user's menu; empty without a user, company or branch in the session.</summary>
    Task<UserMenuDto> GetMenuAsync(CancellationToken ct = default);

    /// <summary>
    /// The session user's rights on the company's new-software menus with these codes, one entry per code in the order
    /// given; all false for a code without such a menu or rights row, and for every code without a session.
    /// </summary>
    Task<IReadOnlyList<MenuCodeRightsDto>> GetRightsAsync(IReadOnlyList<string> codes, CancellationToken ct = default);
}

/// <summary>The rights-based menu (design D2). The company, user and branch always come from the session.</summary>
public class UserMenuService(IMenuRepository repository, ICurrentSession current) : IUserMenuService
{
    public async Task<UserMenuDto> GetMenuAsync(CancellationToken ct = default)
    {
        if (Session() is not var (companyCode, userId, branchId))
            return new UserMenuDto([]);

        var menus = await repository.ListVisibleMenusAsync(companyCode, userId, branchId, ct);
        var moduleIds = menus.Select(m => m.ModuleId?.Trim()).OfType<string>().Where(id => id.Length > 0).Distinct().ToList();
        var modules = await repository.ListModulesAsync(companyCode, moduleIds, ct);

        var byModule = menus.Where(m => !string.IsNullOrWhiteSpace(m.ModuleId)).ToLookup(m => m.ModuleId!.Trim());
        var list = modules
            .OrderBy(m => m.Order ?? decimal.MaxValue).ThenBy(m => m.Name, StringComparer.OrdinalIgnoreCase).ThenBy(m => m.Id, StringComparer.Ordinal)
            .Select(m => new ModuleDto(m.Id, Text(m.Name), byModule[m.Id.Trim()]
                .OrderBy(x => x.Order ?? decimal.MaxValue).ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase).ThenBy(x => x.Id, StringComparer.Ordinal)
                .Select(x => new MenuDto(x.Id, Text(x.Code), Text(x.Name), Text(x.Route)))
                .ToList()))
            .Where(m => m.Menus.Count > 0)
            .ToList();
        return new UserMenuDto(list);
    }

    public async Task<IReadOnlyList<MenuCodeRightsDto>> GetRightsAsync(IReadOnlyList<string> codes, CancellationToken ct = default)
    {
        var wanted = codes.Select(c => c.Trim()).ToList();
        if (Session() is not var (companyCode, userId, branchId))
            return wanted.Select(MenuCodeRightsDto.None).ToList();

        var rows = await repository.ListRightsAsync(wanted.Distinct().ToList(), companyCode, userId, branchId, ct);
        // At most one row per user, menu and branch; the first wins should the data hold more.
        var byCode = rows.GroupBy(r => Text(r.Code)).ToDictionary(g => g.Key, g => g.First().Right);
        return wanted.Select(code => byCode.TryGetValue(code, out var r)
                ? new MenuCodeRightsDto(code, Yes(r.View), Yes(r.Add), Yes(r.Edit), Yes(r.Delete), Yes(r.Print),
                    Yes(r.Email), Yes(r.Docs), Yes(r.DocsUpload), Yes(r.Admin))
                : MenuCodeRightsDto.None(code))
            .ToList();
    }

    private (string CompanyCode, string UserId, string BranchId)? Session()
    {
        var companyCode = current.CompanyCode?.Trim();
        var userId = current.UserId?.Trim();
        var branchId = current.BranchId?.Trim();
        return string.IsNullOrEmpty(companyCode) || string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(branchId)
            ? null
            : (companyCode, userId, branchId);
    }

    private static bool Yes(string? flag) => string.Equals(flag?.Trim(), MenuRepository.Yes, StringComparison.OrdinalIgnoreCase);

    private static string Text(string? value) => value?.Trim() ?? "";
}
