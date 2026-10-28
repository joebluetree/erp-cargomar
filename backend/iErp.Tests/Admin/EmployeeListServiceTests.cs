using NSubstitute;
using iErp.Admin.EmployeeList;
using iErp.Admin.EmployeeProfile;
using iErp.Entities;
using iErp.Shared.Auth;

namespace iErp.Tests.Admin;

public class EmployeeListServiceTests
{
    private static readonly EmployeeScope Scope = new("CMP", "KOC");

    private static (EmployeeListService Service, IEmployeeListRepository Repository) ServiceWith(
        EmployeeScope? scope, params Employee[] employees)
    {
        var repository = Substitute.For<IEmployeeListRepository>();
        repository.ListAsync(Arg.Any<EmployeeListQuery>(), Arg.Any<EmployeeScope>(), Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Employee>)employees, 23));
        var scopes = Substitute.For<IEmployeeScopeResolver>();
        scopes.ResolveAsync(Arg.Any<CancellationToken>()).Returns(scope);
        return (new EmployeeListService(repository, scopes), repository);
    }

    [Fact]
    public async Task Maps_the_rows_and_passes_the_session_scope()
    {
        var (service, repository) = ServiceWith(Scope, new Employee
        {
            Id = "e-1", Code = " 1590 ", Name = "V S PRADEEP", FatherName = "V K SIVARAMAN", DateOfBirth = new DateTime(1973, 9, 28),
            LocalAddress1 = " House 1 ", LocalAddress2 = "  ", LocalAddress3 = "Area 3", Mobile = "9600135673", Email = "a@b.com",
        });
        var query = new EmployeeListQuery { Name = "pra", Page = 3, PageSize = 25 };

        var result = await service.ListAsync(query);

        Assert.Equal((23, 3, 25), (result.Total, result.Page, result.PageSize));
        Assert.Equal(
            new EmployeeListItemDto("e-1", "1590", "V S PRADEEP", "V K SIVARAMAN", new DateOnly(1973, 9, 28), "House 1, Area 3", "9600135673", "a@b.com"),
            Assert.Single(result.Items));
        await repository.Received(1).ListAsync(query, Scope, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Empty_values_are_null()
    {
        var (service, _) = ServiceWith(Scope, new Employee { Id = "e-2", Name = "X", LocalAddress1 = " ", FatherName = "" });

        var row = Assert.Single((await service.ListAsync(new EmployeeListQuery())).Items);

        Assert.Equal(new EmployeeListItemDto("e-2", null, "X", null, null, null, null, null), row);
    }

    [Fact]
    public async Task The_status_reaches_the_repository_with_the_same_scope()
    {
        var (service, repository) = ServiceWith(Scope, new Employee { Id = "e-4", Name = "Relieved" });
        var query = new EmployeeListQuery { Status = "relieved", Name = "rel" };

        var result = await service.ListAsync(query);

        Assert.Equal("e-4", Assert.Single(result.Items).Id);
        await repository.Received(1).ListAsync(
            Arg.Is<EmployeeListQuery>(q => q!.Status == "relieved" && q.Name == "rel"), Scope, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Without_a_scope_the_page_is_empty_and_nothing_is_read()
    {
        var (service, repository) = ServiceWith(scope: null);

        var result = await service.ListAsync(new EmployeeListQuery { Page = 2, PageSize = 5 });

        Assert.Equal((0, 2, 5), (result.Total, result.Page, result.PageSize));
        Assert.Empty(result.Items);
        Assert.Empty(repository.ReceivedCalls());
    }
}

public class EmployeeScopeResolverTests
{
    private static ICurrentSession Session(string? companyCode, string? branchId)
    {
        var session = Substitute.For<ICurrentSession>();
        session.CompanyCode.Returns(companyCode);
        session.BranchId.Returns(branchId);
        return session;
    }

    private static IEmployeeProfileRepository Branches()
    {
        var repository = Substitute.For<IEmployeeProfileRepository>();
        repository.FindBranchCodeAsync("b-1", Arg.Any<CancellationToken>()).Returns(" KOC ");
        repository.FindBranchCodeAsync("b-blank", Arg.Any<CancellationToken>()).Returns("  ");
        return repository;
    }

    [Fact]
    public async Task The_scope_is_the_session_company_code_and_the_branch_code()
    {
        var scope = await new EmployeeScopeResolver(Branches(), Session(" CMP ", "b-1")).ResolveAsync();

        Assert.Equal(new EmployeeScope("CMP", "KOC"), scope);
    }

    [Theory]
    [InlineData(null, "b-1")]
    [InlineData("CMP", null)]
    [InlineData("", "b-1")]
    [InlineData("CMP", "b-unknown")]
    [InlineData("CMP", "b-blank")]
    public async Task No_scope_without_a_company_a_branch_or_a_branch_code(string? companyCode, string? branchId)
    {
        Assert.Null(await new EmployeeScopeResolver(Branches(), Session(companyCode, branchId)).ResolveAsync());
    }
}
