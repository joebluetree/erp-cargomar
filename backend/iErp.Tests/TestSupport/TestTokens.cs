using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using iErp.Shared.Auth;

namespace iErp.Tests.TestSupport;

/// <summary>Access tokens for tests, signed with the Testing environment's key (appsettings.Testing.json).</summary>
public static class TestTokens
{
    public const string TestingKey = "testing-only-signing-key-not-a-secret-0123456789";

    public static string Create(
        DateTimeOffset? expires = null,
        string key = TestingKey,
        string issuer = "iErp",
        string audience = "iErp",
        string companyId = "c-1",
        string branchId = "b-1",
        string yearId = "y-1")
    {
        var expiresAt = expires ?? DateTimeOffset.UtcNow.AddHours(1);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Audience = audience,
            IssuedAt = expiresAt.UtcDateTime.AddHours(-8),
            NotBefore = expiresAt.UtcDateTime.AddHours(-8),
            Expires = expiresAt.UtcDateTime,
            Subject = new ClaimsIdentity(
            [
                new Claim(SessionClaims.UserId, "u-1"),
                new Claim(SessionClaims.UserCode, "U01"),
                new Claim(SessionClaims.UserName, "ADMIN"),
                new Claim(SessionClaims.CompanyId, companyId),
                new Claim(SessionClaims.CompanyCode, "CMP"),
                new Claim(SessionClaims.BranchId, branchId),
                new Claim(SessionClaims.YearId, yearId),
            ]),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256),
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    /// <summary>Sends a valid test token with every request of this client.</summary>
    public static HttpClient Authenticated(this HttpClient client, string? token = null)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token ?? Create());
        return client;
    }
}
