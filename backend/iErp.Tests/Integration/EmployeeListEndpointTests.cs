using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.ChangeBranch;
using iErp.Admin.EmployeeList;
using iErp.Admin.EmployeeProfile;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// GET /api/admin/employees, /{id} and /{id}/photo through the real pipeline with fake repositories and a temporary
/// images folder. The test token's company is CMP (id c-1) and its branch b-1, whose code is KOC; the company's other
/// branches are b-2 (CHN) and b-3 (DEL). The test user u-1 is assigned b-1 and b-2 only. An admin test user has the
/// admin right on the Employee List in the session branch b-1; a non-admin does not.
/// </summary>
public sealed class EmployeeListEndpointTests : IDisposable
{
    private static readonly EmployeeScope Scope = new("CMP", "KOC");
    /// <summary>The admin's allowed branches: the session's (Kochi) and Chennai.</summary>
    private static readonly EmployeeScope AllowedScope = new("CMP", ["KOC", "CHN"]);
    private static readonly byte[] JpegBytes = [0xFF, 0xD8, 0xFF, 0xE0];
    private readonly string folder = Directory.CreateTempSubdirectory("ierp-emp-list-").FullName;

    public EmployeeListEndpointTests() => File.WriteAllBytes(Path.Combine(folder, "e9.jpg"), JpegBytes);

    public void Dispose() => Directory.Delete(folder, recursive: true);

    private (HttpClient Client, IEmployeeListRepository List, IEmployeeProfileRepository Profiles) ClientWith(
        bool authenticated = true, bool admin = false)
    {
        var list = Substitute.For<IEmployeeListRepository>();
        list.ListAsync(Arg.Any<EmployeeListQuery>(), Arg.Any<EmployeeScope>(), Arg.Any<CancellationToken>()).Returns(
            ((IReadOnlyList<Employee>)[new Employee { Id = "e-9", Code = "1590", Name = "V S PRADEEP", DateOfBirth = new DateTime(1973, 9, 28), LocalAddress1 = "House 1", LocalAddress3 = "Area 3", BranchCode = "KOC" }], 23));
        list.ListBranchesByCodeAsync("c-1", Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>())
            .Returns([new Company { Id = "b-1", Code = "KOC", Name = "Kochi" }]);

        var profiles = Substitute.For<IEmployeeProfileRepository>();
        profiles.FindBranchCodeAsync("b-1", Arg.Any<CancellationToken>()).Returns("KOC");
        profiles.FindInScopeAsync("e-9", Scope, Arg.Any<CancellationToken>())
            .Returns(new Employee { Id = "e-9", Code = "1590", Name = "V S PRADEEP", Pan = "ABCDE1234F", ImageName = "e9.jpg" });
        profiles.ListPlacesAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>()).Returns([]);
        var assigned = Substitute.For<IChangeBranchRepository>();
        assigned.ListBranchesAsync("u-1", "c-1", Arg.Any<CancellationToken>()).Returns(
            [new Company { Id = "b-2", Code = "CHN", Name = "Chennai" }, new Company { Id = "b-1", Code = "KOC", Name = "Kochi" }]);
        // The employee of Chennai is in the admin's allowed branches only.
        profiles.FindInScopeAsync("e-chn", AllowedScope, Arg.Any<CancellationToken>())
            .Returns(new Employee { Id = "e-chn", Code = "2001", Name = "CHENNAI ONE", ImageName = "e9.jpg" });

        var access = new FakeMenuAccess();
        if (admin)
            access.AdminOf.Add(MenuCodes.EmployeeList);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped(_ => list);
            s.AddScoped(_ => profiles);
            s.AddScoped(_ => assigned);
            s.AddScoped<IMenuAccess>(_ => access);
            s.Configure<EmployeeImagesOptions>(o => o.Folder = folder);
        })).CreateClient();
        return (authenticated ? client.Authenticated() : client, list, profiles);
    }

    [Fact]
    public async Task The_list_returns_a_camel_case_page_for_the_session_scope()
    {
        var (client, list, _) = ClientWith();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/employees?name=pra&page=2&pageSize=5");

        Assert.Equal((23, 2, 5), (body.GetProperty("total").GetInt32(), body.GetProperty("page").GetInt32(), body.GetProperty("pageSize").GetInt32()));
        var row = body.GetProperty("items").EnumerateArray().Single();
        Assert.Equal(("e-9", "1590", "V S PRADEEP", "1973-09-28", "House 1, Area 3"),
            (row.GetProperty("id").GetString(), row.GetProperty("code").GetString(), row.GetProperty("name").GetString(),
             row.GetProperty("dateOfBirth").GetString(), row.GetProperty("address").GetString()));
        Assert.Equal(JsonValueKind.Null, row.GetProperty("email").ValueKind);
        Assert.Equal("Kochi", row.GetProperty("branch").GetString());
        await list.Received(1).ListAsync(Arg.Is<EmployeeListQuery>(q => q!.Name == "pra" && q.Page == 2 && q.PageSize == 5), Scope, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("", null)]
    [InlineData("?status=relieved", "relieved")]
    [InlineData("?status=all", "all")]
    [InlineData("?status=RELIEVED&name=pra", "RELIEVED")]
    public async Task The_status_is_passed_to_the_list(string queryString, string? status)
    {
        var (client, list, _) = ClientWith();

        var response = await client.GetAsync($"/api/admin/employees{queryString}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await list.Received(1).ListAsync(Arg.Is<EmployeeListQuery>(q => q!.Status == status), Scope, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("page=0", "Page")]
    [InlineData("pageSize=7", "PageSize")]
    [InlineData("status=left", "Status")]
    [InlineData("branch=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "Branch")]
    public async Task Invalid_paging_values_answer_400_naming_the_field(string queryString, string field)
    {
        var (client, list, _) = ClientWith();

        var response = await client.GetAsync($"/api/admin/employees?{queryString}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty(field, out _));
        Assert.Empty(list.ReceivedCalls());
    }

    [Theory]
    [InlineData(false, "")]
    [InlineData(false, "?branch=b-1")]
    [InlineData(true, "")]
    [InlineData(true, "?branch=")]
    public async Task Without_another_branch_the_list_is_the_session_branch(bool admin, string queryString)
    {
        var (client, list, _) = ClientWith(admin: admin);

        var response = await client.GetAsync($"/api/admin/employees{queryString}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await list.Received(1).ListAsync(Arg.Any<EmployeeListQuery>(), Scope, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("?branch=all&status=all", new[] { "KOC", "CHN" })]
    [InlineData("?branch=ALL", new[] { "KOC", "CHN" })]
    [InlineData("?branch=b-2&name=pra", new[] { "CHN" })]
    public async Task An_admin_lists_an_admin_branch_or_all_allowed_branches(string queryString, string[] branchCodes)
    {
        var (client, list, _) = ClientWith(admin: true);

        var body = await client.GetFromJsonAsync<JsonElement>($"/api/admin/employees{queryString}");

        Assert.Equal(23, body.GetProperty("total").GetInt32());
        await list.Received(1).ListAsync(Arg.Any<EmployeeListQuery>(), new EmployeeScope("CMP", branchCodes), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(true, "b-3")] // a branch of the company not assigned to the user
    [InlineData(true, "b-9")] // an unknown id, or another company's branch
    [InlineData(false, "all")]
    [InlineData(false, "b-2")]
    public async Task A_branch_that_is_not_allowed_gets_403(bool admin, string branch)
    {
        var (client, list, _) = ClientWith(admin: admin);

        var response = await client.GetAsync($"/api/admin/employees?branch={branch}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(EmployeesController.BranchNotAllowedMessage, body.GetProperty("title").GetString());
        Assert.Empty(list.ReceivedCalls());
    }

    [Fact]
    public async Task An_admin_gets_the_allowed_branches_by_name()
    {
        var (client, _, _) = ClientWith(admin: true);

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/employees/branches");

        Assert.Equal(["b-2|CHN|Chennai", "b-1|KOC|Kochi"], body.EnumerateArray()
            .Select(b => $"{b.GetProperty("id").GetString()}|{b.GetProperty("code").GetString()}|{b.GetProperty("name").GetString()}"));
    }

    [Fact]
    public async Task A_non_admin_gets_no_branches()
    {
        var (client, _, _) = ClientWith();

        var response = await client.GetAsync("/api/admin/employees/branches");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray());
    }

    [Theory]
    [InlineData(true, HttpStatusCode.OK)]
    [InlineData(false, HttpStatusCode.NotFound)]
    public async Task An_admin_branch_employee_opens_for_its_admin_only(bool admin, HttpStatusCode expected)
    {
        var (client, _, _) = ClientWith(admin: admin);

        var profile = await client.GetAsync("/api/admin/employees/e-chn");
        var photo = await client.GetAsync("/api/admin/employees/e-chn/photo");

        Assert.Equal((expected, expected), (profile.StatusCode, photo.StatusCode));
    }

    [Fact]
    public async Task An_employee_of_a_branch_not_assigned_does_not_open_for_an_admin()
    {
        var (client, _, profiles) = ClientWith(admin: true);

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/admin/employees/e-del")).StatusCode);
        await profiles.Received().FindInScopeAsync("e-del", AllowedScope, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task A_listed_employee_has_a_full_profile_and_a_photo()
    {
        var (client, _, _) = ClientWith();

        var profile = await client.GetFromJsonAsync<JsonElement>("/api/admin/employees/e-9");
        var photo = await client.GetAsync("/api/admin/employees/e-9/photo");

        Assert.Equal("V S PRADEEP", profile.GetProperty("name").GetString());
        Assert.Equal("ABCDE1234F", profile.GetProperty("ids").GetProperty("pan").GetString());
        Assert.True(profile.GetProperty("hasPhoto").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, photo.StatusCode);
        Assert.Equal("image/jpeg", photo.Content.Headers.ContentType?.MediaType);
        Assert.Equal(JpegBytes, await photo.Content.ReadAsByteArrayAsync());
        Assert.True(photo.Headers.CacheControl?.NoStore);
    }

    [Theory]
    [InlineData("/api/admin/employees/e-other")]
    [InlineData("/api/admin/employees/e-other/photo")]
    public async Task An_employee_outside_the_scope_answers_404(string url)
    {
        var (client, _, _) = ClientWith();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(EmployeesController.NotFoundMessage, body.GetProperty("title").GetString());
    }

    [Theory]
    [InlineData("/api/admin/employees")]
    [InlineData("/api/admin/employees/branches")]
    [InlineData("/api/admin/employees/e-9")]
    [InlineData("/api/admin/employees/e-9/photo")]
    public async Task Every_endpoint_needs_a_token(string url)
    {
        var (client, list, profiles) = ClientWith(authenticated: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(url)).StatusCode);
        Assert.Empty(list.ReceivedCalls());
        Assert.Empty(profiles.ReceivedCalls());
    }
}
