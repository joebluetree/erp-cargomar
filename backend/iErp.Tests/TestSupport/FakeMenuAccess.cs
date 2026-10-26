using iErp.Shared.Auth;

namespace iErp.Tests.TestSupport;

/// <summary>
/// A rights check for tests: allows every menu by default (so endpoint tests test their own behavior), denies all, or
/// allows only some menus, and records the menu codes it was asked for.
/// </summary>
public sealed class FakeMenuAccess(bool allow = true, IReadOnlyCollection<string>? only = null) : IMenuAccess
{
    public List<string> Asked { get; } = [];

    /// <summary>Allows only these menus.</summary>
    public static FakeMenuAccess Only(params string[] menuCodes) => new(true, menuCodes);

    public Task<bool> CanViewAsync(string menuCode, CancellationToken ct = default)
    {
        Asked.Add(menuCode);
        return Task.FromResult(only is null ? allow : only.Contains(menuCode));
    }
}
