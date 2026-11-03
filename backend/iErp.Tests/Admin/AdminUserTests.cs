using NSubstitute;
using iErp.Admin.UserRights;
using iErp.Shared.Auth;

namespace iErp.Tests.Admin;

public class AdminUserTests
{
    private static ICurrentSession Session(string? userCode)
    {
        var session = Substitute.For<ICurrentSession>();
        session.UserCode.Returns(userCode);
        return session;
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("admin")]
    [InlineData(" Admin ")]
    public void The_user_code_ADMIN_in_any_case_is_the_admin_user(string code)
    {
        Assert.True(AdminUser.Is(Session(code)));
        Assert.True(AdminUser.IsCode(code));
    }

    [Theory]
    [InlineData("SUBADMIN")]
    [InlineData("ADMIN1")]
    [InlineData("")]
    [InlineData(null)]
    public void Any_other_user_code_is_not_the_admin_user(string? code)
    {
        Assert.False(AdminUser.Is(Session(code)));
        Assert.False(AdminUser.IsCode(code));
    }
}
