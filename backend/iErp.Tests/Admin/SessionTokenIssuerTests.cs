using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using iErp.Admin.Login;
using iErp.Admin.Session;
using iErp.Shared.Auth;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Admin;

public class SessionTokenIssuerTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 13, 9, 0, 0, TimeSpan.Zero);

    private sealed class FixedTime(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private static readonly SessionDto Session = new(
        "U01", "ADMIN", "c-1", "CMP", "Cargomar Pvt Ltd", "b-2", "Mumbai", "y-1", "2024", "2024-2025", "e-1");

    [Fact]
    public void Uses_the_expiry_it_is_given_and_carries_every_session_claim()
    {
        var issuer = new SessionTokenIssuer(
            Options.Create(new JwtOptions { SigningKey = TestTokens.TestingKey, LifetimeMinutes = 480 }), new FixedTime(Now));
        var expiresAt = Now.AddMinutes(37); // not the configured lifetime: the caller decides

        var token = new JsonWebToken(issuer.Issue("u-1", Session, expiresAt));

        Assert.Equal(expiresAt.UtcDateTime, token.ValidTo);
        Assert.Equal(Now.UtcDateTime, token.IssuedAt);
        Assert.Equal(
            [("sub", "u-1"), (SessionClaims.UserCode, "U01"), (SessionClaims.UserName, "ADMIN"), (SessionClaims.CompanyId, "c-1"),
             (SessionClaims.CompanyCode, "CMP"), (SessionClaims.BranchId, "b-2"), (SessionClaims.YearId, "y-1"),
             (SessionClaims.EmployeeId, "e-1")],
            new[] { SessionClaims.UserId, SessionClaims.UserCode, SessionClaims.UserName, SessionClaims.CompanyId,
                    SessionClaims.CompanyCode, SessionClaims.BranchId, SessionClaims.YearId, SessionClaims.EmployeeId }
                .Select(type => (type, token.GetClaim(type).Value)));
    }

    [Fact]
    public void A_session_without_an_employee_has_no_employee_claim()
    {
        var issuer = new SessionTokenIssuer(
            Options.Create(new JwtOptions { SigningKey = TestTokens.TestingKey, LifetimeMinutes = 480 }), new FixedTime(Now));

        var token = new JsonWebToken(issuer.Issue("u-1", Session with { EmployeeId = null }, Now.AddMinutes(30)));

        Assert.False(token.TryGetClaim(SessionClaims.EmployeeId, out _));
        Assert.Equal("U01", token.GetClaim(SessionClaims.UserCode).Value);
    }
}
