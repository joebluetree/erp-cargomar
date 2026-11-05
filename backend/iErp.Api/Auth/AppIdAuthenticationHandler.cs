using System.Security.Claims;
using System.Text.Encodings.Web;
using iErp.Admin.Login;
using iErp.Admin.Session;
using iErp.Shared.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace iErp.Api.Auth;

/// <summary>
/// The common view's authentication (admin-common-endpoint design D1): a request with the header <c>X-App-Id</c> runs
/// as the user, company, branch and financial year of that APPDETAILS row, checked again for every request, with no
/// login and no token. The request gets the same claims an access token carries, so every endpoint, rights check and
/// service works unchanged. A row that is not valid (for example logged out) fails, and the request answers 401 like an
/// expired token. A request without the header is left to the token.
/// </summary>
public class AppIdAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    ILoginService login) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "AppId";
    public const string HeaderName = "X-App-Id";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var values))
            return AuthenticateResult.NoResult();

        var appId = values.ToString().Trim();
        var identity = appId.Length == 0 ? null : await login.ResolveCommonViewAsync(appId, Context.RequestAborted);
        if (identity is null)
            return AuthenticateResult.Fail(AutoLoginResult.CommonViewFailedMessage);

        var claims = new ClaimsIdentity(SessionTokenIssuer.Claims(identity.UserId, identity.Session), SchemeName, SessionClaims.UserName, null);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(claims), SchemeName));
    }

    /// <summary>The token scheme writes the one 401 problem answer; this scheme adds nothing to it.</summary>
    protected override Task HandleChallengeAsync(AuthenticationProperties properties) => Task.CompletedTask;
}
