using iErp.Admin.Login;

namespace iErp.Admin.Session;

/// <summary>Issues the signed access token for a session. The login and the branch change both use it.</summary>
public interface ISessionTokenIssuer
{
    /// <summary>A token for <paramref name="userId"/> carrying <paramref name="session"/>, valid until <paramref name="expiresAt"/>.</summary>
    string Issue(string userId, SessionDto session, DateTimeOffset expiresAt);
}
