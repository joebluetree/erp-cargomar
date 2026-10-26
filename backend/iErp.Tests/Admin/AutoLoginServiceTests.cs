using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using iErp.Admin.ChangeBranch;
using iErp.Admin.Login;
using iErp.Admin.Session;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Shared.Lib;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Admin;

/// <summary>The automatic login from an APPDETAILS row (admin-auto-login, specs/user-auto-login).</summary>
public class AutoLoginServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 26, 9, 0, 0, TimeSpan.Zero);
    private const string AppId = "6f1c2a7e-0b9d-4c55-9a51-2f6d8e3b7a10";
    /// <summary>The legacy system stores passwords in upper case; the row holds what the user typed.</summary>
    private const string StoredPassword = "PA55WORD";

    private static readonly Company Cmp = new() { Id = "c-1", Type = "C", Code = "CMP", Name = "Cargomar Pvt Ltd" };
    private static readonly Company Kochi = new() { Id = "b-1", Type = "B", ParentId = "c-1", Name = "Kochi" };
    private static readonly Company Chennai = new() { Id = "b-2", Type = "B", ParentId = "c-1", Name = "Chennai" };
    private static readonly FinancialYear Latest = new() { Id = "y-2", Code = 2025, Name = "2025-2026", CompanyCode = "CMP" };
    private static readonly FinancialYear Earlier = new() { Id = "y-1", Code = 2024, Name = "2024-2025", CompanyCode = "CMP" };

    private static User Admin() => new()
    {
        Id = "u-1", Code = "U01", Name = "ADMIN", Password = Lib.Encrypt(StoredPassword), CompanyCode = "CMP", BranchId = "b-1", EmployeeId = "e-1"
    };

    private static AppDetail Row(string? loggedOut = "N", string? password = StoredPassword, string? branchId = "b-2", string? yearId = "y-1") => new()
    {
        Id = AppId, UserCode = " U01 ", Password = password, CompanyCode = " CMP ", BranchId = branchId, YearId = yearId, LoggedOut = loggedOut
    };

    private sealed class FixedTime(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    public sealed class CapturingLogger : ILogger<LoginService>
    {
        public List<string> Messages { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => Messages.Add(formatter(state, exception));
    }

    public sealed record Setup(LoginService Service, ILoginRepository Repository, IChangeBranchRepository Switchable, CapturingLogger Logger);

    /// <summary>One row, an active user, branch Chennai allotted and year y-1 open, unless a test says otherwise.</summary>
    private static Setup ServiceWith(AppDetail[]? rows = null, User[]? users = null, Company? allotted = null, FinancialYear? openYear = null)
    {
        var repository = Substitute.For<ILoginRepository>();
        repository.FindAppDetailsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(rows ?? [Row()]);
        repository.FindUsersAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(users ?? [Admin()]);
        repository.FindCompanyAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(Cmp);
        repository.FindBranchAsync("b-1", Arg.Any<CancellationToken>()).Returns(Kochi);
        repository.FindLatestYearAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(Latest);

        var switchable = Substitute.For<IChangeBranchRepository>();
        switchable.FindBranchAsync("u-1", "c-1", "b-2", Arg.Any<CancellationToken>()).Returns(allotted ?? Chennai);
        switchable.FindYearAsync("CMP", "y-1", Arg.Any<CancellationToken>()).Returns(openYear ?? Earlier);

        var options = Options.Create(new JwtOptions { SigningKey = TestTokens.TestingKey, LifetimeMinutes = 480 });
        var logger = new CapturingLogger();
        var time = new FixedTime(Now);
        var service = new LoginService(repository, switchable, new SessionTokenIssuer(options, time), options, time, logger);
        return new Setup(service, repository, switchable, logger);
    }

    private static Task<AutoLoginResult> AutoLogin(Setup setup, string appId = AppId) =>
        setup.Service.AutoLoginAsync(new AutoLoginRequest { AppId = appId });

    [Fact]
    public async Task A_logged_in_row_logs_in_with_its_own_branch_and_year()
    {
        var setup = ServiceWith();

        var result = await AutoLogin(setup, "  " + AppId + "  ");

        Assert.Equal(AutoLoginOutcome.Success, result.Outcome);
        Assert.Equal(
            new SessionDto("U01", "ADMIN", "c-1", "CMP", "Cargomar Pvt Ltd", "b-2", "Chennai", "y-1", "2024", "2024-2025", "e-1"),
            result.Response!.Session);
        Assert.Equal(Now.AddMinutes(480), result.Response.ExpiresAt);
        Assert.False(string.IsNullOrEmpty(result.Response.Token));
        // The id is trimmed, and the row's code and company code are trimmed before the credential check.
        await setup.Repository.Received(1).FindAppDetailsAsync(AppId, Arg.Any<CancellationToken>());
        await setup.Repository.Received(1).FindUsersAsync("U01", "CMP", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task The_plain_password_matches_in_upper_case()
    {
        var setup = ServiceWith(rows: [Row(password: "pa55word")]);

        Assert.Equal(AutoLoginOutcome.Success, (await AutoLogin(setup)).Outcome);
    }

    [Fact]
    public async Task Logged_out_is_accepted_in_any_case_with_spaces()
    {
        Assert.Equal(AutoLoginOutcome.Success, (await AutoLogin(ServiceWith(rows: [Row(loggedOut: "n")]))).Outcome);
    }

    [Fact]
    public async Task Empty_branch_and_year_fall_back_to_the_default_branch_and_the_latest_year()
    {
        var setup = ServiceWith(rows: [Row(branchId: " ", yearId: null)]);

        var result = await AutoLogin(setup);

        Assert.Equal(AutoLoginOutcome.Success, result.Outcome);
        Assert.Equal(("b-1", "Kochi", "y-2"), (result.Response!.Session.BranchId, result.Response.Session.BranchName, result.Response.Session.YearId));
        await setup.Switchable.DidNotReceiveWithAnyArgs().FindBranchAsync(default!, default!, default!, default);
        await setup.Switchable.DidNotReceiveWithAnyArgs().FindYearAsync(default!, default!, default);
    }

    public static TheoryData<string, Func<Setup>> Failures => new()
    {
        { "unknown id", () => ServiceWith(rows: []) },
        { "two rows", () => ServiceWith(rows: [Row(), Row()]) },
        { "logged out", () => ServiceWith(rows: [Row(loggedOut: "Y")]) },
        { "logged out empty", () => ServiceWith(rows: [Row(loggedOut: null)]) },
        { "wrong password", () => ServiceWith(rows: [Row(password: "WRONG")]) },
        { "no password", () => ServiceWith(rows: [Row(password: null)]) },
        { "locked or deleted user", () => ServiceWith(users: []) },
        { "branch not allotted", () => ServiceWith(rows: [Row(branchId: "b-9")]) },
        { "year closed or of another company", () => ServiceWith(rows: [Row(yearId: "y-other")]) },
    };

    [Theory]
    [MemberData(nameof(Failures))]
    public async Task Every_failure_has_the_one_outcome_and_no_token(string reason, Func<Setup> setup)
    {
        var result = await AutoLogin(setup());

        Assert.True(result == new AutoLoginResult(AutoLoginOutcome.Failed), reason);
    }

    [Fact]
    public async Task A_row_without_a_user_code_or_company_code_checks_nothing()
    {
        var setup = ServiceWith(rows: [new AppDetail { Id = AppId, UserCode = " ", Password = StoredPassword, CompanyCode = null, LoggedOut = "N" }]);

        Assert.Equal(AutoLoginOutcome.Failed, (await AutoLogin(setup)).Outcome);
        await setup.Repository.DidNotReceiveWithAnyArgs().FindUsersAsync(default!, default!, default);
    }

    [Fact]
    public async Task A_logged_out_row_is_not_checked_further()
    {
        var setup = ServiceWith(rows: [Row(loggedOut: "Y")]);

        await AutoLogin(setup);

        await setup.Repository.DidNotReceiveWithAnyArgs().FindUsersAsync(default!, default!, default);
    }

    [Fact]
    public async Task Neither_the_app_id_nor_the_password_is_ever_logged()
    {
        var logged = new List<string>();
        foreach (var setup in new[]
                 {
                     ServiceWith(), ServiceWith(rows: []), ServiceWith(rows: [Row(loggedOut: "Y")]),
                     ServiceWith(rows: [Row(password: "wrong-pass")]), ServiceWith(rows: [Row(branchId: "b-9")]),
                     ServiceWith(rows: [Row(yearId: "y-9")]),
                 })
        {
            await AutoLogin(setup);
            logged.AddRange(setup.Logger.Messages);
        }

        Assert.NotEmpty(logged);
        Assert.DoesNotContain(logged, m => m.Contains(AppId) || m.Contains(StoredPassword) || m.Contains("wrong-pass", StringComparison.OrdinalIgnoreCase));
    }
}
