using NSubstitute;
using iErp.Admin.UserRights;
using iErp.Shared.Auth;

namespace iErp.Tests.Admin;

public class MenuAccessTests
{
    private static ICurrentSession Session(string? companyCode = " CPL ", string? userId = " u-1 ", string? branchId = " b-1 ")
    {
        var session = Substitute.For<ICurrentSession>();
        session.CompanyCode.Returns(companyCode);
        session.UserId.Returns(userId);
        session.BranchId.Returns(branchId);
        return session;
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Asks_for_the_view_right_of_the_session_user_company_and_branch(bool hasRight)
    {
        var repository = Substitute.For<IMenuRepository>();
        repository.HasViewRightAsync("NS-COMPLIST", "CPL", "u-1", "b-1", Arg.Any<CancellationToken>()).Returns(hasRight);

        Assert.Equal(hasRight, await new MenuAccess(repository, Session()).CanViewAsync(MenuCodes.CompanyList));
    }

    [Theory]
    [InlineData(null, "u-1", "b-1")]
    [InlineData("CPL", null, "b-1")]
    [InlineData("CPL", "u-1", "")]
    public async Task Without_a_company_user_or_branch_there_is_no_access_and_nothing_is_read(string? company, string? user, string? branch)
    {
        var repository = Substitute.For<IMenuRepository>();

        Assert.False(await new MenuAccess(repository, Session(company, user, branch)).CanViewAsync(MenuCodes.CompanyList));
        Assert.Empty(repository.ReceivedCalls());
    }
}
