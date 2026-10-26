using NSubstitute;
using iErp.Admin.UserRights;
using iErp.Entities;
using iErp.Shared.Auth;

namespace iErp.Tests.Admin;

public class UserMenuServiceTests
{
    private static ICurrentSession Session(string? companyCode = " CPL ", string? userId = "u-1", string? branchId = "b-1")
    {
        var session = Substitute.For<ICurrentSession>();
        session.CompanyCode.Returns(companyCode);
        session.UserId.Returns(userId);
        session.BranchId.Returns(branchId);
        return session;
    }

    private static Menu Menu(string id, string module, decimal? order, string name) =>
        new() { Id = id, CompanyCode = "CPL", ModuleId = module, Code = "NS-" + id, Name = name, Route = "r/" + id, Order = order, NewSoftware = "Y" };

    private static (UserMenuService Service, IMenuRepository Repository) ServiceWith(ICurrentSession session, Menu[] menus, MenuModule[] modules)
    {
        var repository = Substitute.For<IMenuRepository>();
        repository.ListVisibleMenusAsync("CPL", "u-1", "b-1", Arg.Any<CancellationToken>()).Returns(menus);
        repository.ListModulesAsync("CPL", Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>())
            .Returns(c => modules.Where(m => c.Arg<IReadOnlyCollection<string>>()!.Contains(m.Id)).ToList());
        return (new UserMenuService(repository, session), repository);
    }

    [Fact]
    public async Task Modules_and_menus_are_in_order_with_ties_by_name_then_id()
    {
        var (service, _) = ServiceWith(Session(),
        [
            Menu("m3", "hr", 202, "Profile"),
            Menu("m1", "hr", 200, "Company List"),
            Menu("m2", "acc", 10, "Ledger"),
            Menu("m5", "hr", 201, "B list"),
            Menu("m4", "hr", 201, "A list"),
        ],
        [
            new MenuModule { Id = "hr", Name = "Hr", Order = 50 },
            new MenuModule { Id = "acc", Name = "Accounts", Order = 40 },
        ]);

        var menu = await service.GetMenuAsync();

        Assert.Equal(["Accounts", "Hr"], menu.Modules.Select(m => m.Name));
        Assert.Equal(["Company List", "A list", "B list", "Profile"], menu.Modules[1].Menus.Select(m => m.Name));
        Assert.Equal(new MenuDto("m1", "NS-m1", "Company List", "r/m1"), menu.Modules[1].Menus[0]);
    }

    [Fact]
    public async Task Menus_of_an_unknown_module_and_empty_modules_are_dropped()
    {
        var (service, _) = ServiceWith(Session(),
            [Menu("m1", "gone", 1, "Orphan"), Menu("m2", null!, 2, "No module")],
            [new MenuModule { Id = "hr", Name = "Hr", Order = 50 }]);

        Assert.Empty((await service.GetMenuAsync()).Modules);
    }

    [Theory]
    [InlineData(null, "u-1", "b-1")]
    [InlineData("CPL", null, "b-1")]
    [InlineData("CPL", "u-1", " ")]
    public async Task Without_a_company_user_or_branch_the_menu_is_empty_and_nothing_is_read(string? company, string? user, string? branch)
    {
        var (service, repository) = ServiceWith(Session(company, user, branch), [Menu("m1", "hr", 1, "X")], []);

        Assert.Empty((await service.GetMenuAsync()).Modules);
        Assert.Empty(repository.ReceivedCalls());
    }

    [Fact]
    public async Task Rights_are_true_only_for_Y()
    {
        var (service, repository) = ServiceWith(Session(), [], []);
        repository.ListRightsAsync(Arg.Any<IReadOnlyCollection<string>>(), "CPL", "u-1", "b-1", Arg.Any<CancellationToken>()).Returns(
        [
            new MenuCodeRight("NS-EMPLIST  ", new UserRight
            {
                Id = "r", View = "Y", Add = "y", Edit = "Y", Delete = "N", Print = null, Email = " ", Docs = "Y", DocsUpload = "N", Admin = "Y",
            }),
        ]);

        var rights = await service.GetRightsAsync([" NS-EMPLIST "]);

        Assert.Equal([new MenuCodeRightsDto("NS-EMPLIST", true, true, true, false, false, false, true, false, true)], rights);
    }

    [Fact]
    public async Task One_entry_per_code_in_the_order_given_with_all_false_without_a_row()
    {
        var (service, repository) = ServiceWith(Session(), [], []);
        repository.ListRightsAsync(Arg.Any<IReadOnlyCollection<string>>(), "CPL", "u-1", "b-1", Arg.Any<CancellationToken>()).Returns(
            [new MenuCodeRight("NS-EMPLIST", new UserRight { Id = "r", View = "Y" })]);

        var rights = await service.GetRightsAsync(["NS-EMPPROFILE", "NS-EMPLIST", "OTHER"]);

        Assert.Equal(["NS-EMPPROFILE", "NS-EMPLIST", "OTHER"], rights.Select(r => r.Code));
        Assert.Equal([false, true, false], rights.Select(r => r.View));
        Assert.Equal(MenuCodeRightsDto.None("OTHER"), rights[2]);
        await repository.Received(1).ListRightsAsync(
            Arg.Is<IReadOnlyCollection<string>>(c => c!.SequenceEqual(new[] { "NS-EMPPROFILE", "NS-EMPLIST", "OTHER" })),
            "CPL", "u-1", "b-1", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Without_a_session_every_right_is_false_and_nothing_is_read()
    {
        var (service, repository) = ServiceWith(Session(userId: null), [], []);

        var rights = await service.GetRightsAsync(["NS-EMPLIST"]);

        Assert.Equal([MenuCodeRightsDto.None("NS-EMPLIST")], rights);
        Assert.Empty(repository.ReceivedCalls());
    }
}
