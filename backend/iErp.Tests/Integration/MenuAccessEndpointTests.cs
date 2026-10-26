using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.EmployeeList;
using iErp.Admin.EmployeeProfile;
using iErp.Admin.HolidayList;
using iErp.Entities;
using iErp.Reports.BranchList;
using iErp.Reports.CompanyList;
using iErp.Shared.Auth;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// The view-right check on the screens' endpoints (admin-user-rights design D3), through the real pipeline with a
/// rights check that denies every menu and records which menu it was asked for.
/// </summary>
public class MenuAccessEndpointTests
{
    private static (HttpClient Client, FakeMenuAccess Access, ICompanyListRepository Companies) DenyingClient()
    {
        var access = new FakeMenuAccess(allow: false);
        var companies = Substitute.For<ICompanyListRepository>();
        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped<IMenuAccess>(_ => access);
            s.AddScoped(_ => companies);
            s.AddScoped(_ => Substitute.For<IHolidayListRepository>());
        })).CreateClient().Authenticated();
        return (client, access, companies);
    }

    [Theory]
    [InlineData("/api/reports/companies", MenuCodes.CompanyList)]
    [InlineData("/api/reports/branches", MenuCodes.BranchList)]
    [InlineData("/api/reports/branches/b-2/holidays", MenuCodes.HolidayList)]
    [InlineData("/api/admin/profile", MenuCodes.EmployeeProfile)]
    [InlineData("/api/admin/profile/photo", MenuCodes.EmployeeProfile)]
    [InlineData("/api/admin/employees", MenuCodes.EmployeeList)]
    [InlineData("/api/admin/employees/e-1", MenuCodes.EmployeeProfile)]
    [InlineData("/api/admin/employees/e-1/photo", MenuCodes.EmployeeProfile)]
    [InlineData("/api/admin/holidays", MenuCodes.HolidayList)]
    public async Task A_screen_endpoint_without_the_view_right_answers_403(string url, string menuCode)
    {
        var (client, access, _) = DenyingClient();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(MenuAccessFilter.NoAccessMessage, body.GetProperty("title").GetString());
        Assert.Equal([menuCode], access.Asked);
    }

    [Fact]
    public async Task An_employee_s_profile_needs_the_Profile_right_and_the_list_the_Employee_List_right()
    {
        var access = FakeMenuAccess.Only(MenuCodes.EmployeeList);
        var list = Substitute.For<IEmployeeListRepository>();
        list.ListAsync(Arg.Any<EmployeeListQuery>(), Arg.Any<EmployeeScope>(), Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Employee>)[], 0));
        var profiles = Substitute.For<IEmployeeProfileRepository>();
        profiles.FindBranchCodeAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns("KOC");
        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped<IMenuAccess>(_ => access);
            s.AddScoped(_ => list);
            s.AddScoped(_ => profiles);
        })).CreateClient().Authenticated();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/employees")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/employees/e-1")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/employees/e-1/photo")).StatusCode);

        Assert.Equal([MenuCodes.EmployeeList, MenuCodes.EmployeeProfile, MenuCodes.EmployeeProfile], access.Asked);
        await profiles.DidNotReceive().FindInScopeAsync(Arg.Any<string>(), Arg.Any<EmployeeScope>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task A_branch_s_holidays_need_the_Holiday_List_right_and_the_list_the_Branch_List_right()
    {
        var access = FakeMenuAccess.Only(MenuCodes.BranchList);
        var branches = Substitute.For<IBranchListRepository>();
        branches.ListAsync(Arg.Any<BranchListQuery>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Company>)[], 0));
        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped<IMenuAccess>(_ => access);
            s.AddScoped(_ => branches);
        })).CreateClient().Authenticated();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/reports/branches")).StatusCode);
        var holidays = await client.GetAsync("/api/reports/branches/b-2/holidays");

        Assert.Equal(HttpStatusCode.Forbidden, holidays.StatusCode);
        Assert.Equal([MenuCodes.BranchList, MenuCodes.HolidayList], access.Asked);
        await branches.DidNotReceive().FindListedAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Nothing_is_read_before_the_check_refuses()
    {
        var (client, _, companies) = DenyingClient();

        await client.GetAsync("/api/reports/companies");

        Assert.Empty(companies.ReceivedCalls());
    }

    [Theory]
    [InlineData("/api/admin/menu")]
    [InlineData("/api/admin/session/options")]
    public async Task The_menu_and_session_endpoints_need_no_menu_right(string url)
    {
        var (client, access, _) = DenyingClient();

        var response = await client.GetAsync(url);

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(access.Asked);
    }

    [Fact]
    public async Task The_login_needs_no_menu_right()
    {
        var (client, access, _) = DenyingClient();

        var response = await client.PostAsJsonAsync("/api/admin/login", new { userCode = "", password = "", companyCode = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(access.Asked);
    }

    [Fact]
    public async Task Without_a_token_the_answer_is_401_and_the_rights_are_not_asked()
    {
        var access = new FakeMenuAccess(allow: false);
        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s => s.AddScoped<IMenuAccess>(_ => access))).CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/reports/companies")).StatusCode);
        Assert.Empty(access.Asked);
    }
}
