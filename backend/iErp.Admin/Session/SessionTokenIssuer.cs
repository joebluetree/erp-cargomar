using System.Security.Claims;
using System.Text;
using iErp.Admin.Login;
using iErp.Shared.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace iErp.Admin.Session;

/// <summary>Signs the session claims with the configured key. The caller decides the expiry (design D3).</summary>
public class SessionTokenIssuer(IOptions<JwtOptions> jwtOptions, TimeProvider time) : ISessionTokenIssuer
{
    public string Issue(string userId, SessionDto session, DateTimeOffset expiresAt)
    {
        var options = jwtOptions.Value;
        var now = time.GetUtcNow();

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = options.Issuer,
            Audience = options.Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            Subject = new ClaimsIdentity(
            [
                new Claim(SessionClaims.UserId, userId),
                new Claim(SessionClaims.UserCode, session.UserCode),
                new Claim(SessionClaims.UserName, session.UserName),
                new Claim(SessionClaims.CompanyId, session.CompanyId),
                new Claim(SessionClaims.CompanyCode, session.CompanyCode),
                new Claim(SessionClaims.BranchId, session.BranchId),
                new Claim(SessionClaims.YearId, session.YearId),
            ]),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SigningKey)), SecurityAlgorithms.HmacSha256),
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
