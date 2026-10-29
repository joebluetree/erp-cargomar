using NSubstitute;
using iErp.Admin.ChangeBranch;
using iErp.Admin.EmployeeList;
using iErp.Admin.EmployeeProfile;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Admin;

public class EmployeeListServiceTests
{
    private static readonly EmployeeScope Scope = new("CMP", "KOC");

    private static (EmployeeListService Service, IEmployeeListRepository Repository) ServiceWith(
        EmployeeListScope scope, Employee[]? employees = null, Company[]? allowed = null, string? companyId = " c-1 ")
    {
        var repository = Substitute.For<IEmployeeListRepository>();
        repository.ListAsync(Arg.Any<EmployeeListQuery>(), Arg.Any<EmployeeScope>(), Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Employee>)(employees ?? []), 23));
        // The company's branches by code: Kochi and Chennai (HO's code is not a branch of the company).
        repository.ListBranchesByCodeAsync("c-1", Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>()).Returns(call =>
            new[] { new Company { Id = "b-1", Code = " KOC ", Name = " Kochi " }, new Company { Id = "b-2", Code = "CHN", Name = "Chennai" } }
                .Where(b => call.ArgAt<IReadOnlyCollection<string>>(1).Contains(b.Code!.Trim())).ToList());
        var session = Substitute.For<ICurrentSession>();
        session.CompanyId.Returns(companyId);
        var scopes = Substitute.For<IEmployeeScopeResolver>();
        scopes.ResolveListAsync(Arg.Any<string?>(), Arg.Any<CancellationToken>()).Returns(scope);
        scopes.ListAllowedBranchesAsync(Arg.Any<CancellationToken>()).Returns(allowed ?? []);
        return (new EmployeeListService(repository, scopes, session), repository);
    }

    [Fact]
    public async Task Maps_the_rows_and_passes_the_scope()
    {
        var (service, repository) = ServiceWith(new EmployeeListScope(Scope), [new Employee
        {
            Id = "e-1", Code = " 1590 ", Name = "V S PRADEEP", FatherName = "V K SIVARAMAN", DateOfBirth = new DateTime(1973, 9, 28),
            LocalAddress1 = " House 1 ", LocalAddress2 = "  ", LocalAddress3 = "Area 3", Mobile = "9600135673", Email = "a@b.com",
            BranchCode = " KOC ",
        }]);
        var query = new EmployeeListQuery { Name = "pra", Page = 3, PageSize = 25 };

        var page = (await service.ListAsync(query)).Page!;

        Assert.Equal((23, 3, 25), (page.Total, page.Page, page.PageSize));
        Assert.Equal(
            new EmployeeListItemDto("e-1", "1590", "V S PRADEEP", "V K SIVARAMAN", new DateOnly(1973, 9, 28), "House 1, Area 3", "9600135673", "a@b.com", "Kochi"),
            Assert.Single(page.Items));
        await repository.Received(1).ListAsync(query, Scope, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Empty_values_are_null()
    {
        var (service, _) = ServiceWith(new EmployeeListScope(Scope), [new Employee { Id = "e-2", Name = "X", LocalAddress1 = " ", FatherName = "" }]);

        var row = Assert.Single((await service.ListAsync(new EmployeeListQuery())).Page!.Items);

        Assert.Equal(new EmployeeListItemDto("e-2", null, "X", null, null, null, null, null, null), row);
    }

    [Fact]
    public async Task The_branch_is_its_name_or_else_its_code_read_once_for_the_page_s_codes()
    {
        var (service, repository) = ServiceWith(new EmployeeListScope(new EmployeeScope("CMP", ["KOC", "CHN", "HOX"])),
        [
            new Employee { Id = "e-1", BranchCode = "KOC" },
            new Employee { Id = "e-2", BranchCode = " CHN " },
            new Employee { Id = "e-3", BranchCode = "KOC" },
            new Employee { Id = "e-4", BranchCode = "HOX" },
            new Employee { Id = "e-5", BranchCode = " " },
        ]);

        var rows = (await service.ListAsync(new EmployeeListQuery { Branch = "all" })).Page!.Items;

        Assert.Equal(["Kochi", "Chennai", "Kochi", "HOX", null], rows.Select(r => r.Branch));
        await repository.Received(1).ListBranchesByCodeAsync(
            "c-1", Arg.Is<IReadOnlyCollection<string>>(c => c!.SequenceEqual(new[] { "KOC", "CHN", "HOX" })), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Without_branch_codes_or_a_company_the_branches_are_not_read()
    {
        var (service, repository) = ServiceWith(new EmployeeListScope(Scope), [new Employee { Id = "e-1" }]);
        Assert.Null(Assert.Single((await service.ListAsync(new EmployeeListQuery())).Page!.Items).Branch);

        var (noCompany, other) = ServiceWith(new EmployeeListScope(Scope), [new Employee { Id = "e-1", BranchCode = "KOC" }], companyId: null);
        Assert.Equal("KOC", Assert.Single((await noCompany.ListAsync(new EmployeeListQuery())).Page!.Items).Branch);

        await repository.DidNotReceiveWithAnyArgs().ListBranchesByCodeAsync(default!, default!, default);
        await other.DidNotReceiveWithAnyArgs().ListBranchesByCodeAsync(default!, default!, default);
    }

    [Fact]
    public async Task The_status_reaches_the_repository_with_the_same_scope()
    {
        var (service, repository) = ServiceWith(new EmployeeListScope(Scope), [new Employee { Id = "e-4", Name = "Relieved" }]);
        var query = new EmployeeListQuery { Status = "relieved", Name = "rel" };

        var result = await service.ListAsync(query);

        Assert.Equal("e-4", Assert.Single(result.Page!.Items).Id);
        await repository.Received(1).ListAsync(
            Arg.Is<EmployeeListQuery>(q => q!.Status == "relieved" && q.Name == "rel"), Scope, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task The_branch_asked_for_builds_the_scope()
    {
        var allowed = new EmployeeScope("CMP", ["KOC", "CHN"]);
        var (service, repository) = ServiceWith(new EmployeeListScope(allowed));

        await service.ListAsync(new EmployeeListQuery { Branch = "all" });

        await repository.Received(1).ListAsync(Arg.Is<EmployeeListQuery>(q => q!.Branch == "all"), allowed, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task A_refused_branch_gives_its_error_and_reads_nothing()
    {
        var (service, repository) = ServiceWith(new EmployeeListScope(null, BranchChoiceError.NotAllowed));

        var result = await service.ListAsync(new EmployeeListQuery { Branch = "b-9" });

        Assert.Equal((null, BranchChoiceError.NotAllowed), (result.Page, result.Error));
        Assert.Empty(repository.ReceivedCalls());
    }

    [Fact]
    public async Task Without_a_scope_the_page_is_empty_and_nothing_is_read()
    {
        var (service, repository) = ServiceWith(new EmployeeListScope(null));

        var result = await service.ListAsync(new EmployeeListQuery { Page = 2, PageSize = 5 });

        Assert.Equal(BranchChoiceError.None, result.Error);
        Assert.Equal((0, 2, 5), (result.Page!.Total, result.Page.Page, result.Page.PageSize));
        Assert.Empty(result.Page.Items);
        Assert.Empty(repository.ReceivedCalls());
    }

    [Fact]
    public async Task The_branch_options_are_the_allowed_branches_trimmed_in_their_order()
    {
        var (service, _) = ServiceWith(new EmployeeListScope(Scope), allowed:
        [
            new Company { Id = " b-2 ", Code = " CHN ", Name = " Chennai " },
            new Company { Id = "b-1", Code = "KOC", Name = "  " },
        ]);

        Assert.Equal([new EmployeeBranchDto("b-2", "CHN", "Chennai"), new EmployeeBranchDto("b-1", "KOC", null)], await service.ListBranchesAsync());
    }

    [Fact]
    public async Task Without_allowed_branches_there_are_no_options()
    {
        var (service, _) = ServiceWith(new EmployeeListScope(Scope));

        Assert.Empty(await service.ListBranchesAsync());
    }
}

public class EmployeeScopeResolverTests
{
    private static readonly Company Kochi = new() { Id = "b-1", Code = " KOC ", Name = "Kochi" };
    private static readonly Company Chennai = new() { Id = "b-2", Code = " CHN ", Name = "Chennai" };
    private static readonly Company Delhi = new() { Id = "b-3", Code = "DEL", Name = "Delhi" };

    private static ICurrentSession Session(string? companyCode, string? branchId, string? companyId, string? userId)
    {
        var session = Substitute.For<ICurrentSession>();
        session.CompanyCode.Returns(companyCode);
        session.BranchId.Returns(branchId);
        session.CompanyId.Returns(companyId);
        session.UserId.Returns(userId);
        return session;
    }

    /// <summary>The session branch codes: Kochi (b-1) and Chennai (b-2); b-blank has a blank code.</summary>
    private static IEmployeeProfileRepository Branches()
    {
        var repository = Substitute.For<IEmployeeProfileRepository>();
        repository.FindBranchCodeAsync("b-1", Arg.Any<CancellationToken>()).Returns(" KOC ");
        repository.FindBranchCodeAsync("b-2", Arg.Any<CancellationToken>()).Returns(" CHN ");
        repository.FindBranchCodeAsync("b-blank", Arg.Any<CancellationToken>()).Returns("  ");
        return repository;
    }

    /// <summary>
    /// u-1 is assigned Chennai, Delhi and Kochi of company c-1, by name, as Change Branch reads them (never a deleted
    /// branch or another company's; Mumbai, b-4, is not assigned).
    /// </summary>
    private static IChangeBranchRepository Assigned()
    {
        var repository = Substitute.For<IChangeBranchRepository>();
        repository.ListBranchesAsync("u-1", "c-1", Arg.Any<CancellationToken>()).Returns([Chennai, Delhi, Kochi]);
        return repository;
    }

    private static EmployeeScopeResolver Resolver(
        bool admin = false, string? companyCode = " CMP ", string? branchId = "b-1", string? companyId = "c-1", string? userId = " u-1 ")
    {
        var access = new FakeMenuAccess();
        if (admin)
            access.AdminOf.Add(MenuCodes.EmployeeList);
        return new EmployeeScopeResolver(Branches(), Assigned(), Session(companyCode, branchId, companyId, userId), access);
    }

    /// <summary>Logged in to Kochi with the admin right there.</summary>
    private static EmployeeScopeResolver AdminInKochi() => Resolver(admin: true);

    [Theory]
    [InlineData(null)]
    [InlineData(" ")]
    [InlineData(" b-1 ")]
    public async Task Without_another_branch_the_list_scope_is_the_session_company_and_branch(string? branch)
    {
        Assert.Equal(new EmployeeListScope(new EmployeeScope("CMP", "KOC")), await Resolver().ResolveListAsync(branch));
        Assert.Equal(new EmployeeListScope(new EmployeeScope("CMP", "KOC")), await AdminInKochi().ResolveListAsync(branch));
    }

    [Theory]
    [InlineData("all")]
    [InlineData(" ALL ")]
    public async Task All_is_the_session_branch_and_the_assigned_branches(string branch)
    {
        Assert.Equal(new EmployeeListScope(new EmployeeScope("CMP", ["KOC", "CHN", "DEL"])), await AdminInKochi().ResolveListAsync(branch));
    }

    [Fact]
    public async Task An_admin_lists_an_assigned_branch_by_its_code()
    {
        Assert.Equal(new EmployeeListScope(new EmployeeScope("CMP", "CHN")), await AdminInKochi().ResolveListAsync(" b-2 "));
    }

    [Theory]
    [InlineData("b-4")] // a branch of the company not assigned to the user
    [InlineData("b-9")] // another company's or a deleted branch
    [InlineData("b-unknown")]
    public async Task A_branch_that_is_not_assigned_is_refused(string branch)
    {
        Assert.Equal(new EmployeeListScope(null, BranchChoiceError.NotAllowed), await AdminInKochi().ResolveListAsync(branch));
    }

    [Theory]
    [InlineData("all")]
    [InlineData("b-1")]
    public async Task Without_the_admin_right_in_the_session_branch_another_branch_is_refused(string branch)
    {
        // Logged in to Chennai, where the admin right is 'N'.
        var inChennai = Resolver(branchId: "b-2");

        Assert.Equal(new EmployeeListScope(null, BranchChoiceError.NotAllowed), await inChennai.ResolveListAsync(branch));
        Assert.Empty(await inChennai.ListAllowedBranchesAsync());
        Assert.Equal(new EmployeeScope("CMP", "CHN"), await inChennai.ResolveProfileAsync());
    }

    [Fact]
    public async Task The_allowed_branches_are_the_assigned_branches_for_an_admin_only()
    {
        Assert.Equal([Chennai, Delhi, Kochi], await AdminInKochi().ListAllowedBranchesAsync());
        Assert.Empty(await Resolver().ListAllowedBranchesAsync());
        Assert.Empty(await Resolver(admin: true, companyId: null).ListAllowedBranchesAsync());
        Assert.Empty(await Resolver(admin: true, userId: null).ListAllowedBranchesAsync());
    }

    [Fact]
    public async Task The_profile_scope_is_the_allowed_branches()
    {
        Assert.Equal(new EmployeeScope("CMP", "KOC"), await Resolver().ResolveProfileAsync());
        Assert.Equal(new EmployeeScope("CMP", ["KOC", "CHN", "DEL"]), await AdminInKochi().ResolveProfileAsync());
    }

    [Theory]
    [InlineData(null, "b-1")]
    [InlineData("CMP", null)]
    [InlineData("", "b-1")]
    [InlineData("CMP", "b-unknown")]
    [InlineData("CMP", "b-blank")]
    public async Task No_scope_without_a_company_a_branch_or_a_branch_code(string? companyCode, string? branchId)
    {
        Assert.Equal(new EmployeeListScope(null), await Resolver(true, companyCode, branchId).ResolveListAsync("all"));
        Assert.Null(await Resolver(true, companyCode, branchId).ResolveProfileAsync());
    }
}
