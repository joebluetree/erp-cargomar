using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using NSubstitute;
using iErp.Admin.ChangeBranch;
using iErp.Admin.Session;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Admin;

public class ChangeBranchServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 13, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Expiry = Now.AddMinutes(95); // the current token's expiry

    private static readonly User Admin = new() { Id = "u-1", Code = "U01", Name = "ADMIN", CompanyCode = "CMP", BranchId = "b-1", EmployeeId = "e-1" };
    private static readonly Company Cmp = new() { Id = "c-1", Type = "C", Code = "CMP", Name = "Cargomar Pvt Ltd" };
    private static readonly Company Kochi = new() { Id = "b-1", Type = "B", ParentId = "c-1", Name = "Kochi" };
    private static readonly Company Mumbai = new() { Id = "b-2", Type = "B", ParentId = "c-1", Name = "Mumbai" };
    private static readonly FinancialYear Y2025 = new() { Id = "y-2", Code = 2025, Name = "2025-2026", CompanyCode = "CMP" };
    private static readonly FinancialYear Y2024 = new() { Id = "y-1", Code = 2024, Name = "2024-2025", CompanyCode = "CMP" };

    private sealed class FixedTime(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private static ICurrentSession Session(string? userId = "u-1", string? companyId = "c-1")
    {
        var session = Substitute.For<ICurrentSession>();
        session.UserId.Returns(userId);
        session.CompanyId.Returns(companyId);
        return session;
    }

    private static (ChangeBranchService Service, IChangeBranchRepository Repository) ServiceWith(
        User? user = null, ICurrentSession? session = null, bool userGone = false)
    {
        var repository = Substitute.For<IChangeBranchRepository>();
        repository.FindActiveUserAsync("u-1", Arg.Any<CancellationToken>()).Returns(userGone ? null : user ?? Admin);
        repository.FindCompanyAsync("c-1", Arg.Any<CancellationToken>()).Returns(Cmp);
        repository.ListBranchesAsync("u-1", "c-1", Arg.Any<CancellationToken>()).Returns([Kochi, Mumbai]);
        repository.FindBranchAsync("u-1", "c-1", "b-2", Arg.Any<CancellationToken>()).Returns(Mumbai);
        repository.ListYearsAsync("CMP", Arg.Any<CancellationToken>()).Returns([Y2025, Y2024]);
        repository.FindYearAsync("CMP", "y-1", Arg.Any<CancellationToken>()).Returns(Y2024);

        var options = Options.Create(new JwtOptions { SigningKey = TestTokens.TestingKey, LifetimeMinutes = 480 });
        var tokens = new SessionTokenIssuer(options, new FixedTime(Now));
        return (new ChangeBranchService(repository, session ?? Session(), tokens, NullLogger<ChangeBranchService>.Instance), repository);
    }

    private static ChangeBranchRequest Request(string branchId = "b-2", string yearId = "y-1") =>
        new() { BranchId = branchId, YearId = yearId };

    [Fact]
    public async Task Options_are_the_allowed_branches_and_the_company_years_in_the_repository_order()
    {
        var (service, _) = ServiceWith();

        var options = await service.GetOptionsAsync();

        Assert.Equal([new BranchOption("b-1", "Kochi"), new BranchOption("b-2", "Mumbai")], options!.Branches);
        Assert.Equal([new YearOption("y-2", "2025", "2025-2026"), new YearOption("y-1", "2024", "2024-2025")], options.Years);
    }

    /// <summary>The admin user (code ADMIN), allotted Kochi only; the company also has Chennai (b-3).</summary>
    private static readonly User AdminUser = new() { Id = "u-1", Code = " admin ", Name = "Administrator", CompanyCode = "CMP", BranchId = "b-1" };
    private static readonly Company Chennai = new() { Id = "b-3", Type = "B", ParentId = "c-1", Name = "Chennai" };
    /// <summary>A closed year of the company: offered and allowed to the admin user only.</summary>
    private static readonly FinancialYear Y2023 = new() { Id = "y-0", Code = 2023, Name = "2023-2024", CompanyCode = "CMP", Closed = "Y" };

    private static (ChangeBranchService Service, IChangeBranchRepository Repository) AdminServiceWith()
    {
        var (service, repository) = ServiceWith(AdminUser);
        repository.ListBranchesAsync("u-1", "c-1", Arg.Any<CancellationToken>()).Returns([Kochi]);
        repository.ListCompanyBranchesAsync("c-1", Arg.Any<CancellationToken>()).Returns([Chennai, Kochi, Mumbai]);
        repository.FindCompanyBranchAsync("c-1", "b-2", Arg.Any<CancellationToken>()).Returns(Mumbai);
        repository.FindCompanyBranchAsync("c-1", "b-3", Arg.Any<CancellationToken>()).Returns(Chennai);
        repository.ListCompanyYearsAsync("CMP", Arg.Any<CancellationToken>()).Returns([Y2025, Y2024, Y2023]);
        repository.FindCompanyYearAsync("CMP", "y-1", Arg.Any<CancellationToken>()).Returns(Y2024);
        repository.FindCompanyYearAsync("CMP", "y-0", Arg.Any<CancellationToken>()).Returns(Y2023);
        return (service, repository);
    }

    [Fact]
    public async Task The_admin_user_is_offered_every_year_of_the_company_closed_included_in_the_repository_order()
    {
        var (service, repository) = AdminServiceWith();

        var options = await service.GetOptionsAsync();

        Assert.Equal(["2025-2026", "2024-2025", "2023-2024"], options!.Years.Select(y => y.Name));
        await repository.DidNotReceiveWithAnyArgs().ListYearsAsync(default!, default);
    }

    [Fact]
    public async Task The_admin_user_may_switch_to_a_closed_year()
    {
        var (service, repository) = AdminServiceWith();

        var result = await service.ChangeAsync(Request(branchId: "b-2", yearId: " y-0 "), Expiry);

        Assert.Equal(ChangeBranchOutcome.Success, result.Outcome);
        Assert.Equal(("y-0", "2023-2024"), (result.Response!.Session.YearId, result.Response.Session.YearName));
        await repository.DidNotReceiveWithAnyArgs().FindYearAsync(default!, default!, default);
    }

    [Fact]
    public async Task The_admin_user_is_refused_a_year_that_is_not_the_company_s()
    {
        var (service, _) = AdminServiceWith();

        var result = await service.ChangeAsync(Request(branchId: "b-2", yearId: "y-other"), Expiry);

        Assert.Equal(ChangeBranchOutcome.YearNotAllowed, result.Outcome);
        Assert.Null(result.Response);
    }

    [Fact]
    public async Task A_user_whose_code_only_contains_admin_is_still_refused_a_closed_year()
    {
        var (service, repository) = ServiceWith(new User { Id = "u-1", Code = "SUBADMIN", Name = "Sub", CompanyCode = "CMP" });
        repository.FindCompanyYearAsync("CMP", "y-0", Arg.Any<CancellationToken>()).Returns(Y2023);

        var result = await service.ChangeAsync(Request(branchId: "b-2", yearId: "y-0"), Expiry);

        Assert.Equal(ChangeBranchOutcome.YearNotAllowed, result.Outcome);
        Assert.Equal(["2025-2026", "2024-2025"], (await service.GetOptionsAsync())!.Years.Select(y => y.Name));
    }

    [Fact]
    public async Task The_admin_user_is_offered_every_branch_of_the_company()
    {
        var (service, repository) = AdminServiceWith();

        var options = await service.GetOptionsAsync();

        Assert.Equal(["Chennai", "Kochi", "Mumbai"], options!.Branches.Select(b => b.Name));
        await repository.DidNotReceiveWithAnyArgs().ListBranchesAsync(default!, default!, default);
    }

    [Fact]
    public async Task The_admin_user_may_switch_to_a_branch_of_the_company_that_is_not_allotted()
    {
        var (service, repository) = AdminServiceWith();

        var result = await service.ChangeAsync(Request(branchId: " b-3 "), Expiry);

        Assert.Equal(ChangeBranchOutcome.Success, result.Outcome);
        Assert.Equal(("b-3", "Chennai"), (result.Response!.Session.BranchId, result.Response.Session.BranchName));
        await repository.DidNotReceiveWithAnyArgs().FindBranchAsync(default!, default!, default!, default);
    }

    [Fact]
    public async Task The_admin_user_is_refused_a_branch_that_is_not_the_company_s()
    {
        var (service, _) = AdminServiceWith();

        var result = await service.ChangeAsync(Request(branchId: "b-other"), Expiry);

        Assert.Equal(ChangeBranchOutcome.BranchNotAllowed, result.Outcome);
        Assert.Null(result.Response);
    }

    [Fact]
    public async Task A_user_whose_code_only_contains_admin_keeps_the_allotted_branches()
    {
        var (service, repository) = ServiceWith(new User { Id = "u-1", Code = "SUBADMIN", Name = "Sub", CompanyCode = "CMP" });

        var options = await service.GetOptionsAsync();

        Assert.Equal(["Kochi", "Mumbai"], options!.Branches.Select(b => b.Name));
        Assert.Equal(ChangeBranchOutcome.BranchNotAllowed, (await service.ChangeAsync(Request(branchId: "b-3"), Expiry)).Outcome);
        await repository.DidNotReceiveWithAnyArgs().ListCompanyBranchesAsync(default!, default);
    }

    [Fact]
    public async Task Switch_keeps_user_employee_company_and_expiry_and_takes_the_new_branch_and_year()
    {
        var (service, _) = ServiceWith();

        var result = await service.ChangeAsync(Request(), Expiry);

        Assert.Equal(ChangeBranchOutcome.Success, result.Outcome);
        var response = result.Response!;
        Assert.Equal(Expiry, response.ExpiresAt);
        Assert.Equal(("U01", "ADMIN", "c-1", "CMP", "Cargomar Pvt Ltd"),
            (response.Session.UserCode, response.Session.UserName, response.Session.CompanyId, response.Session.CompanyCode, response.Session.CompanyName));
        Assert.Equal(("b-2", "Mumbai", "y-1", "2024", "2024-2025"),
            (response.Session.BranchId, response.Session.BranchName, response.Session.YearId, response.Session.YearCode, response.Session.YearName));

        var token = new JsonWebToken(response.Token);
        Assert.Equal(Expiry.UtcDateTime, token.ValidTo);
        Assert.Equal(("u-1", "b-2", "y-1"),
            (token.GetClaim(SessionClaims.UserId).Value, token.GetClaim(SessionClaims.BranchId).Value, token.GetClaim(SessionClaims.YearId).Value));
        Assert.Equal("e-1", response.Session.EmployeeId);
        Assert.Equal("e-1", token.GetClaim(SessionClaims.EmployeeId).Value);
    }

    [Fact]
    public async Task A_branch_that_is_not_allotted_is_refused_and_no_token_is_issued()
    {
        var (service, _) = ServiceWith();

        var result = await service.ChangeAsync(Request(branchId: "b-9"), Expiry);

        Assert.Equal(ChangeBranchOutcome.BranchNotAllowed, result.Outcome);
        Assert.Null(result.Response);
    }

    [Fact]
    public async Task A_year_of_another_company_is_refused()
    {
        var (service, _) = ServiceWith();

        var result = await service.ChangeAsync(Request(yearId: "y-9"), Expiry);

        Assert.Equal(ChangeBranchOutcome.YearNotAllowed, result.Outcome);
        Assert.Null(result.Response);
    }

    [Fact]
    public async Task A_user_who_may_no_longer_work_ends_the_session_and_gets_no_options()
    {
        var (service, repository) = ServiceWith(userGone: true);

        Assert.Equal(ChangeBranchOutcome.SessionGone, (await service.ChangeAsync(Request(), Expiry)).Outcome);
        Assert.Null(await service.GetOptionsAsync());
        await repository.DidNotReceiveWithAnyArgs().FindBranchAsync(default!, default!, default!, default);
    }

    [Fact]
    public async Task The_user_and_company_come_from_the_session_only()
    {
        var (service, repository) = ServiceWith(session: Session(userId: null));

        Assert.Equal(ChangeBranchOutcome.SessionGone, (await service.ChangeAsync(Request(), Expiry)).Outcome);
        await repository.DidNotReceiveWithAnyArgs().FindActiveUserAsync(default!, default);
    }
}
