using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using NSubstitute;
using iErp.Admin.Login;
using iErp.Admin.Session;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Shared.Lib;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Admin;

public class LoginServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 12, 9, 0, 0, TimeSpan.Zero);
    private const string Password = "Pa55word";

    private static readonly Company Cmp = new() { Id = "c-1", Type = "C", Code = "CMP", Name = "Cargomar Pvt Ltd" };
    private static readonly Company Kochi = new() { Id = "b-1", Type = "B", ParentId = "c-1", Name = "Kochi" };
    private static readonly FinancialYear Year = new() { Id = "y-2", Code = 2025, Name = "2025-2026", CompanyCode = "CMP" };

    private static User Admin() => new()
    {
        Id = "u-1", Code = "U01", Name = "ADMIN", Password = Lib.Encrypt(Password), CompanyCode = "CMP", BranchId = "b-1", EmployeeId = "e-1"
    };

    private sealed class FixedTime(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class CapturingLogger : ILogger<LoginService>
    {
        public List<string> Messages { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => Messages.Add(formatter(state, exception));
    }

    private static (LoginService Service, ILoginRepository Repository, CapturingLogger Logger) ServiceWith(
        User[]? users = null, Company? company = null, Company? branch = null, FinancialYear? year = null)
    {
        var repository = Substitute.For<ILoginRepository>();
        repository.FindUsersAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(users ?? [Admin()]);
        repository.FindCompanyAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(company ?? Cmp);
        repository.FindBranchAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(branch ?? Kochi);
        repository.FindLatestYearAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(year ?? Year);

        var options = Options.Create(new JwtOptions { SigningKey = TestTokens.TestingKey, LifetimeMinutes = 480 });
        var logger = new CapturingLogger();
        var time = new FixedTime(Now);
        var tokens = new SessionTokenIssuer(options, time);
        return (new LoginService(repository, tokens, options, time, logger), repository, logger);
    }

    private static LoginRequest Request(string userCode = "U01", string password = Password, string companyCode = "CMP") =>
        new() { UserCode = userCode, Password = password, CompanyCode = companyCode };

    [Fact]
    public async Task Correct_credentials_return_every_session_field_and_a_token()
    {
        var (service, _, _) = ServiceWith();

        var result = await service.LoginAsync(Request());

        Assert.Equal(LoginOutcome.Success, result.Outcome);
        Assert.Equal(
            new SessionDto("U01", "ADMIN", "c-1", "CMP", "Cargomar Pvt Ltd", "b-1", "Kochi", "y-2", "2025", "2025-2026", "e-1"),
            result.Response!.Session);
        Assert.Equal(Now.AddMinutes(480), result.Response.ExpiresAt);
        Assert.False(string.IsNullOrEmpty(result.Response.Token));
    }

    [Fact]
    public async Task The_token_carries_the_session_claims_and_the_expiry()
    {
        var (service, _, _) = ServiceWith();

        var token = new JsonWebToken((await service.LoginAsync(Request())).Response!.Token);

        Assert.Equal("iErp", token.Issuer);
        Assert.Equal(["iErp"], token.Audiences);
        Assert.Equal(Now.AddMinutes(480).UtcDateTime, token.ValidTo);
        Assert.Equal("u-1", token.GetClaim(SessionClaims.UserId).Value);
        Assert.Equal("U01", token.GetClaim(SessionClaims.UserCode).Value);
        Assert.Equal("ADMIN", token.GetClaim(SessionClaims.UserName).Value);
        Assert.Equal("c-1", token.GetClaim(SessionClaims.CompanyId).Value);
        Assert.Equal("CMP", token.GetClaim(SessionClaims.CompanyCode).Value);
        Assert.Equal("b-1", token.GetClaim(SessionClaims.BranchId).Value);
        Assert.Equal("y-2", token.GetClaim(SessionClaims.YearId).Value);
        Assert.Equal("e-1", token.GetClaim(SessionClaims.EmployeeId).Value);
        Assert.Equal("HS256", token.Alg);
    }

    [Theory]
    [InlineData(" E-1 ", "E-1")]
    [InlineData(null, null)]
    [InlineData("   ", null)]
    public async Task The_employee_id_is_trimmed_and_a_missing_one_does_not_block_the_login(string? stored, string? expected)
    {
        var user = Admin();
        user.EmployeeId = stored;
        var (service, _, _) = ServiceWith(users: [user]);

        var result = await service.LoginAsync(Request());

        Assert.Equal(LoginOutcome.Success, result.Outcome);
        Assert.Equal(expected, result.Response!.Session.EmployeeId);
        var token = new JsonWebToken(result.Response.Token);
        Assert.Equal(expected, token.TryGetClaim(SessionClaims.EmployeeId, out var claim) ? claim.Value : null);
    }

    [Fact]
    public async Task Name_and_company_code_are_trimmed_before_the_lookup()
    {
        var (service, repository, _) = ServiceWith();

        var result = await service.LoginAsync(Request(userCode: " u01 ", companyCode: " cmp "));

        Assert.Equal(LoginOutcome.Success, result.Outcome);
        await repository.Received(1).FindUsersAsync("u01", "cmp", Arg.Any<CancellationToken>());
        await repository.Received(1).FindCompanyAsync("cmp", Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("pa55word")]
    [InlineData("Pa55word ")]
    [InlineData(" Pa55word")]
    [InlineData("Pa55wor")]
    public async Task The_password_must_match_exactly(string typed)
    {
        var (service, _, _) = ServiceWith();

        Assert.Equal(LoginOutcome.InvalidCredentials, (await service.LoginAsync(Request(password: typed))).Outcome);
    }

    [Fact]
    public async Task Unknown_user_wrong_password_and_unknown_company_have_the_same_outcome()
    {
        var unknownUser = await ServiceWith(users: []).Service.LoginAsync(Request());
        var wrongPassword = await ServiceWith().Service.LoginAsync(Request(password: "wrong"));
        var (noCompanyService, repository, _) = ServiceWith();
        repository.FindCompanyAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns((Company?)null);
        var unknownCompany = await noCompanyService.LoginAsync(Request());

        Assert.All(new[] { unknownUser, wrongPassword, unknownCompany },
            r => Assert.Equal(new LoginResult(LoginOutcome.InvalidCredentials), r));
    }

    [Fact]
    public async Task The_typed_password_is_compared_in_the_legacy_encrypted_form()
    {
        // USERM holds Lib.Encrypt(password); the user types the password itself.
        var (service, _, _) = ServiceWith();

        Assert.Equal(LoginOutcome.Success, (await service.LoginAsync(Request(password: Password))).Outcome);
    }

    [Fact]
    public async Task Typing_the_stored_encrypted_text_does_not_log_in()
    {
        var (service, _, _) = ServiceWith();

        var result = await service.LoginAsync(Request(password: Lib.Encrypt(Password)));

        Assert.Equal(LoginOutcome.InvalidCredentials, result.Outcome);
    }

    [Fact]
    public async Task A_user_without_a_stored_password_cannot_log_in_with_an_empty_password()
    {
        var user = Admin();
        user.Password = null;
        var (service, _, _) = ServiceWith(users: [user]);

        Assert.Equal(LoginOutcome.InvalidCredentials, (await service.LoginAsync(Request(password: ""))).Outcome);
    }

    [Fact]
    public async Task Two_users_with_the_same_code_in_the_company_fail_and_are_logged()
    {
        var (service, _, logger) = ServiceWith(users: [Admin(), Admin()]);

        Assert.Equal(LoginOutcome.InvalidCredentials, (await service.LoginAsync(Request())).Outcome);
        Assert.Contains(logger.Messages, m => m.Contains("2 users with code U01"));
    }

    [Fact]
    public async Task A_user_without_a_default_branch_is_refused_as_no_branch()
    {
        var user = Admin();
        user.BranchId = null;
        var (service, repository, _) = ServiceWith(users: [user]);

        Assert.Equal(new LoginResult(LoginOutcome.NoBranch), await service.LoginAsync(Request()));
        await repository.DidNotReceiveWithAnyArgs().FindBranchAsync(default!, default);
    }

    [Fact]
    public async Task An_unknown_default_branch_is_refused_as_no_branch()
    {
        var (service, repository, _) = ServiceWith();
        repository.FindBranchAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns((Company?)null);

        Assert.Equal(LoginOutcome.NoBranch, (await service.LoginAsync(Request())).Outcome);
    }

    [Fact]
    public async Task A_branch_of_another_company_is_refused_as_no_branch()
    {
        var (service, _, _) = ServiceWith(branch: new Company { Id = "b-9", Type = "B", ParentId = "c-9", Name = "Other" });

        Assert.Equal(LoginOutcome.NoBranch, (await service.LoginAsync(Request())).Outcome);
    }

    [Fact]
    public async Task A_company_without_a_financial_year_is_refused_as_no_year()
    {
        var (service, repository, _) = ServiceWith();
        repository.FindLatestYearAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns((FinancialYear?)null);

        Assert.Equal(new LoginResult(LoginOutcome.NoYear), await service.LoginAsync(Request()));
        await repository.Received(1).FindLatestYearAsync("CMP", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task The_password_never_appears_in_the_log()
    {
        var logged = new List<string>();
        foreach (var (users, password) in new[] { ((User[]?)null, Password), (null, "wrong-pass"), ([], Password) })
        {
            var (service, _, logger) = ServiceWith(users: users);
            await service.LoginAsync(Request(password: password));
            logged.AddRange(logger.Messages);
        }

        Assert.NotEmpty(logged);
        Assert.DoesNotContain(logged, m => m.Contains(Password) || m.Contains("wrong-pass"));
    }
}
