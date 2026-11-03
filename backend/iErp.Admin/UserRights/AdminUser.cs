using iErp.Shared.Auth;

namespace iErp.Admin.UserRights;

/// <summary>
/// The admin user (admin-admin-user-rights design D1): the session user whose user code is "ADMIN", trimmed and in any
/// case. The admin user has every right on every menu, without USERRIGHTS being read. The code comes from the session
/// token (the stored USERM.USER_CODE), never from a request.
/// </summary>
public static class AdminUser
{
    public const string Code = "ADMIN";

    public static bool Is(ICurrentSession current) => IsCode(current.UserCode);

    /// <summary>Whether a user code is the admin user's; for a user read from USERM before there is a session.</summary>
    public static bool IsCode(string? userCode) =>
        string.Equals(userCode?.Trim(), Code, StringComparison.OrdinalIgnoreCase);
}
