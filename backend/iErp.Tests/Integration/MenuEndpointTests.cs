using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.UserRights;
using iErp.Entities;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// GET /api/admin/menu and /rights through the real pipeline with a fake repository. The test token's user is
/// u-1, its company CMP and its branch b-1.
/// </summary>
public class MenuEndpointTests
{
    private static (HttpClient Client, IMenuRepository Repository) ClientWith(bool authenticated = true)
    {
        var repository = Substitute.For<IMenuRepository>();
        repository.ListVisibleMenusAsync("CMP", "u-1", "b-1", Arg.Any<CancellationToken>()).Returns(
        [
            new Menu { Id = "m-1", CompanyCode = "CMP", ModuleId = "hr", Code = "NS-COMPLIST", Name = "Company List", Route = "reports/companies", Order = 200, NewSoftware = "Y" },
        ]);
        repository.ListModulesAsync("CMP", Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>())
            .Returns([new MenuModule { Id = "hr", CompanyCode = "CMP", Name = "Hr", Order = 50 }]);
        repository.ListRightsAsync(Arg.Any<IReadOnlyCollection<string>>(), "CMP", "u-1", "b-1", Arg.Any<CancellationToken>())
            .Returns([new MenuCodeRight("NS-EMPLIST", new UserRight { Id = "r-1", View = "Y", Add = "N", Edit = "Y" })]);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s => s.AddScoped(_ => repository))).CreateClient();
        return (authenticated ? client.Authenticated() : client, repository);
    }

    [Fact]
    public async Task The_menu_is_the_session_user_s_modules_and_menus_in_camel_case()
    {
        var (client, _) = ClientWith();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/menu");

        var module = body.GetProperty("modules").EnumerateArray().Single();
        Assert.Equal(("hr", "Hr"), (module.GetProperty("id").GetString(), module.GetProperty("name").GetString()));
        var menu = module.GetProperty("menus").EnumerateArray().Single();
        Assert.Equal(("m-1", "NS-COMPLIST", "Company List", "reports/companies"),
            (menu.GetProperty("id").GetString(), menu.GetProperty("code").GetString(), menu.GetProperty("name").GetString(), menu.GetProperty("route").GetString()));
    }

    [Fact]
    public async Task The_rights_of_the_screen_and_its_related_menus_come_per_code_as_true_or_false()
    {
        var (client, _) = ClientWith();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/menu/rights?codes=NS-EMPLIST,NS-EMPPROFILE");

        var entries = body.EnumerateArray().ToList();
        Assert.Equal(["NS-EMPLIST", "NS-EMPPROFILE"], entries.Select(e => e.GetProperty("code").GetString()));
        var list = entries[0];
        Assert.Equal((true, false, true, false),
            (list.GetProperty("view").GetBoolean(), list.GetProperty("add").GetBoolean(), list.GetProperty("edit").GetBoolean(), list.GetProperty("delete").GetBoolean()));
        Assert.False(list.GetProperty("docsUpload").GetBoolean());
        Assert.False(entries[1].GetProperty("view").GetBoolean());
    }

    [Theory]
    [InlineData("/api/admin/menu/rights")]
    [InlineData("/api/admin/menu/rights?codes=")]
    [InlineData("/api/admin/menu/rights?codes=A,,B")]
    [InlineData("/api/admin/menu/rights?codes=A,B,C,D,E,F,G,H,I,J,K")]
    public async Task No_codes_an_empty_code_or_more_than_10_answer_400(string url)
    {
        var (client, repository) = ClientWith();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(MenuController.CodesMessage, body.GetProperty("title").GetString());
        await repository.DidNotReceive().ListRightsAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("/api/admin/menu")]
    [InlineData("/api/admin/menu/rights?codes=NS-EMPLIST")]
    public async Task Every_endpoint_needs_a_token(string url)
    {
        var (client, repository) = ClientWith(authenticated: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(url)).StatusCode);
        Assert.Empty(repository.ReceivedCalls());
    }
}
